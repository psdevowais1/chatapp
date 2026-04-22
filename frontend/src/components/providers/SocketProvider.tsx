'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Message } from '../../lib/api';
import {
  initSocket,
  onReceiveMessage,
  offReceiveMessage,
  onMessageDelivered,
  offMessageDelivered,
  onMessagesRead,
  offMessagesRead,
  onUserTyping,
  offUserTyping,
  onGroupUpdated,
  offGroupUpdated,
  onMemberAdded,
  offMemberAdded,
  onMemberRemoved,
  offMemberRemoved,
  onGroupDeleted,
  offGroupDeleted,
  markMessagesRead as socketMarkMessagesRead,
} from '../../lib/socket';

interface SocketProviderProps {
  children: React.ReactNode;
}

export default function SocketProvider({ children }: SocketProviderProps) {
  const { user } = useAuthStore();
  const {
    upsertConversation,
    addMessage,
    updateMessageStatus,
    markConversationRead,
    setTyping,
    removeConversation,
    updateCurrentConversation,
    currentConversation,
    fetchConversations,
  } = useChatStore();

  const currentConversationRef = useRef(currentConversation);
  const userRef = useRef(user);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initialize socket once
    initSocket(user.id);

    // Handle incoming messages - update both conversation list and message area
    onReceiveMessage((data: any) => {
      const message: Message = data.message || data;
      const conversation = data.conversation;

      // Always update conversation list if we have conversation data
      if (conversation) {
        upsertConversation(conversation);
      }

      // If message belongs to current conversation, add it to messages
      if (currentConversationRef.current?.id === message.conversationId) {
        // Check if this is our own message (sender) or someone else's message (receiver)
        const isOwnMessage = message.senderId === userRef.current?.id;

        if (isOwnMessage) {
          // For sender: just add the message with its original status
          addMessage(message);
        } else {
          // For receiver: mark as read since conversation is open
          const readMessage = { ...message, status: 'read' };
          addMessage(readMessage);
          // Notify server that message was read
          if (userRef.current) {
            socketMarkMessagesRead(message.conversationId, userRef.current.id);
          }
        }
      }
    });

    // Handle message delivered
    onMessageDelivered((data) => {
      updateMessageStatus(data.messageId, 'delivered');
    });

    // Handle messages read
    onMessagesRead((data) => {
      markConversationRead(data.conversationId);
    });

    // Handle typing indicators
    onUserTyping(({ userId, typing }) => {
      setTyping(userId, typing);
    });

    // Handle group updates
    onGroupUpdated((group) => {
      if (currentConversationRef.current?.id === group.id) {
        updateCurrentConversation(group);
      }
      upsertConversation(group);
    });

    // Handle member added
    onMemberAdded((data) => {
      if (data.group) {
        upsertConversation(data.group);
      }
    });

    // Handle member removed
    onMemberRemoved((data) => {
      // If current user was removed, remove conversation
      if (data.memberId === userRef.current?.id) {
        removeConversation(data.conversationId);
      } else {
        fetchConversations();
      }
    });

    // Handle group deleted
    onGroupDeleted((data) => {
      removeConversation(data.conversationId);
    });

    return () => {
      offReceiveMessage();
      offMessageDelivered();
      offMessagesRead();
      offUserTyping();
      offGroupUpdated();
      offMemberAdded();
      offMemberRemoved();
      offGroupDeleted();
    };
  }, [user, upsertConversation, addMessage, updateMessageStatus, markConversationRead, setTyping, removeConversation, updateCurrentConversation, fetchConversations]);

  return <>{children}</>;
}
