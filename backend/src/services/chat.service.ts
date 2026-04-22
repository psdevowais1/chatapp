import prisma from '../config/database.js';

export const createConversation = async (userId: string, otherUserId: string) => {
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: userId } } },
        { participants: { some: { id: otherUserId } } },
      ],
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
        },
      },
    },
  });

  if (existingConversation) {
    return existingConversation;
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        connect: [{ id: userId }, { id: otherUserId }],
      },
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
        },
      },
    },
  });

  return conversation;
};

export const getUserConversations = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { id: userId },
      },
    },
    select: {
      id: true,
      isGroup: true,
      groupName: true,
      groupPhoto: true,
      creatorId: true,
      createdAt: true,
      updatedAt: true,
      participants: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
        },
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
    orderBy: { updatedAt: 'desc' },
  });

  // Get unread count for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      let unreadCount = 0;

      if (conv.isGroup) {
        // For groups, use GroupMember unreadCount
        unreadCount = conv.groupMembers[0]?.unreadCount || 0;
      } else {
        // For direct messages, count unread messages where user is receiver
        unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: userId,
            status: { not: 'read' },
          },
        });
      }

      return {
        ...conv,
        unreadCount,
      };
    })
  );

  return conversationsWithUnread;
};

export const getConversationMessages = async (conversationId: string, userId: string) => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { id: userId } },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
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

  return messages;
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string,
  attachment?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }
) => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { id: senderId } },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const message = await prisma.message.create({
    data: {
      content,
      senderId,
      receiverId,
      conversationId,
      attachmentUrl: attachment?.url || null,
      attachmentName: attachment?.name || null,
      attachmentType: attachment?.type || null,
      attachmentSize: attachment?.size || null,
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      receiver: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
};
