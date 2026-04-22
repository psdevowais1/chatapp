import { io, Socket } from 'socket.io-client';
import { Message } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initSocket = (userId: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { userId },
      transports: ['websocket'],
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId: string): void => {
  socket?.emit('join_conversation', conversationId);
};

export const leaveConversation = (conversationId: string): void => {
  socket?.emit('leave_conversation', conversationId);
};

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export const sendMessage = (
  conversationId: string,
  senderId: string,
  receiverId: string | null,
  content: string,
  attachment?: Attachment
): void => {
  socket?.emit('send_message', {
    conversationId,
    senderId,
    receiverId,
    content,
    attachment,
  });
};

export const onReceiveMessage = (callback: (message: Message) => void): void => {
  socket?.on('receive_message', callback);
};

export const offReceiveMessage = (): void => {
  socket?.off('receive_message');
};

export const emitTypingStart = (conversationId: string, userId: string): void => {
  socket?.emit('typing_start', { conversationId, userId });
};

export const emitTypingStop = (conversationId: string, userId: string): void => {
  socket?.emit('typing_stop', { conversationId, userId });
};

export const onUserTyping = (
  callback: (data: { userId: string; typing: boolean }) => void
): void => {
  socket?.on('user_typing', callback);
};

export const offUserTyping = (): void => {
  socket?.off('user_typing');
};

export const markMessagesRead = (conversationId: string, userId: string): void => {
  socket?.emit('mark_read', { conversationId, userId });
};

export const onMessageDelivered = (callback: (data: { messageId: string; conversationId: string }) => void): void => {
  socket?.on('message_delivered', callback);
};

export const offMessageDelivered = (): void => {
  socket?.off('message_delivered');
};

export const onMessagesRead = (callback: (data: { conversationId: string; readBy: string; readAt: string }) => void): void => {
  socket?.on('messages_read', callback);
};

export const offMessagesRead = (): void => {
  socket?.off('messages_read');
};
