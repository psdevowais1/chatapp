import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import prisma from './database.js';

interface MessageData {
  conversationId: string;
  senderId: string;
  receiverId?: string; // Optional for group messages
  content: string;
  attachment?: {
    url: string;
    name: string;
    type: string;
    size: number;
  };
}

let io: SocketIOServer;

// Helper to get conversation data for a user
const getConversationForUser = async (conversationId: string, userId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          senderId: true,
          receiverId: true,
          conversationId: true,
          createdAt: true,
          attachmentUrl: true,
          attachmentName: true,
          attachmentType: true,
          attachmentSize: true,
          status: true,
          readAt: true,
          sender: {
            select: { id: true, name: true, email: true, profilePhoto: true },
          },
        },
      },
      groupMembers: {
        where: { userId },
        select: { unreadCount: true },
      },
    },
  });

  if (!conversation) return null;

  let unreadCount = 0;
  if (conversation.isGroup) {
    unreadCount = conversation.groupMembers[0]?.unreadCount || 0;
  } else {
    unreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        receiverId: userId,
        status: { not: 'read' },
      },
    });
  }

  return { ...conversation, unreadCount };
};

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:50237',
        'http://127.0.0.1:50237',
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/localhost:\d+$/,
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth.userId;

    if (userId) {
      socket.join(userId);
    }

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(conversationId);
    });

    socket.on('send_message', async (data: MessageData) => {
      try {
        // Check if it's a group conversation
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
          include: {
            participants: {
              select: { id: true },
            },
          },
        });

        const isGroup = conversation?.isGroup || false;

        const message = await prisma.message.create({
          data: {
            content: data.content,
            senderId: data.senderId,
            receiverId: data.receiverId || null,
            conversationId: data.conversationId,
            attachmentUrl: data.attachment?.url || null,
            attachmentName: data.attachment?.name || null,
            attachmentType: data.attachment?.type || null,
            attachmentSize: data.attachment?.size || null,
            status: 'sent',
          },
          select: {
            id: true,
            content: true,
            senderId: true,
            receiverId: true,
            conversationId: true,
            createdAt: true,
            attachmentUrl: true,
            attachmentName: true,
            attachmentType: true,
            attachmentSize: true,
            status: true,
            readAt: true,
            sender: {
              select: { id: true, name: true, email: true, profilePhoto: true },
            },
            receiver: {
              select: { id: true, name: true, email: true, profilePhoto: true },
            },
          },
        });

        await prisma.conversation.update({
          where: { id: data.conversationId },
          data: { updatedAt: new Date() },
        });

        // Emit to sender with sent status
        const senderConversation = await getConversationForUser(data.conversationId, data.senderId);
        io.to(data.senderId).emit('receive_message', { message, conversation: senderConversation });

        if (isGroup) {
          // For group messages, emit to all participants except sender
          // and increment their unread count
          const participants = conversation?.participants || [];

          for (const participant of participants) {
            if (participant.id !== data.senderId) {
              // Increment unread count for this participant
              await prisma.groupMember.update({
                where: {
                  conversationId_userId: {
                    conversationId: data.conversationId,
                    userId: participant.id,
                  },
                },
                data: {
                  unreadCount: { increment: 1 },
                },
              });

              // Get conversation with updated unread count
              const participantConversation = await getConversationForUser(data.conversationId, participant.id);
              // Emit to participant with conversation data
              io.to(participant.id).emit('receive_message', {
                message: { ...message, status: 'delivered' },
                conversation: participantConversation
              });
            }
          }

          // Notify sender of delivery
          io.to(data.senderId).emit('message_delivered', {
            messageId: message.id,
            conversationId: data.conversationId,
          });
        } else {
          // Direct message handling
          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'delivered' },
          });

          const deliveredMessage = { ...message, status: 'delivered' };
          if (data.receiverId) {
            const receiverConversation = await getConversationForUser(data.conversationId, data.receiverId);
            io.to(data.receiverId).emit('receive_message', {
              message: deliveredMessage,
              conversation: receiverConversation
            });
          }

          io.to(data.senderId).emit('message_delivered', {
            messageId: message.id,
            conversationId: data.conversationId,
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (data: { conversationId: string; userId: string }) => {
      try {
        // Check if it's a group
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
        });

        if (conversation?.isGroup) {
          // For groups, reset the unread count in GroupMember
          await prisma.groupMember.update({
            where: {
              conversationId_userId: {
                conversationId: data.conversationId,
                userId: data.userId,
              },
            },
            data: { unreadCount: 0 },
          });

          // Notify all senders in the group
          const messages = await prisma.message.findMany({
            where: {
              conversationId: data.conversationId,
              senderId: { not: data.userId },
            },
            select: { senderId: true },
            distinct: ['senderId'],
          });

          messages.forEach((msg) => {
            io.to(msg.senderId).emit('messages_read', {
              conversationId: data.conversationId,
              readBy: data.userId,
              readAt: new Date().toISOString(),
            });
          });
        } else {
          // Direct message handling
          const updatedMessages = await prisma.message.updateMany({
            where: {
              conversationId: data.conversationId,
              receiverId: data.userId,
              status: { not: 'read' },
            },
            data: {
              status: 'read',
              readAt: new Date(),
            },
          });

          const messages = await prisma.message.findMany({
            where: {
              conversationId: data.conversationId,
              receiverId: data.userId,
            },
            select: { senderId: true },
            distinct: ['senderId'],
          });

          messages.forEach((msg) => {
            io.to(msg.senderId).emit('messages_read', {
              conversationId: data.conversationId,
              readBy: data.userId,
              readAt: new Date().toISOString(),
            });
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    socket.on('typing_start', (data: { conversationId: string; userId: string }) => {
      socket.to(data.conversationId).emit('user_typing', { userId: data.userId, typing: true });
    });

    socket.on('typing_stop', (data: { conversationId: string; userId: string }) => {
      socket.to(data.conversationId).emit('user_typing', { userId: data.userId, typing: false });
    });

    socket.on('disconnect', () => {
      // User disconnected
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const emitGroupUpdate = (conversationId: string, group: any) => {
  io.to(conversationId).emit('group_updated', group);
};

export const emitMemberRemoved = (conversationId: string, memberId: string, groupId: string) => {
  io.to(memberId).emit('removed_from_group', { conversationId });
  io.to(conversationId).emit('member_removed', { conversationId, memberId });
};

export const emitMemberAdded = (conversationId: string, userId: string, group: any) => {
  io.to(userId).emit('added_to_group', group);
  io.to(conversationId).emit('member_added', { conversationId, userId, group });
};

export const emitGroupDeleted = (conversationId: string) => {
  io.to(conversationId).emit('group_deleted', { conversationId });
};
