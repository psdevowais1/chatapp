'use client';

import { create } from 'zustand';
import { api, Conversation, Message } from '../lib/api';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  typingUsers: Record<string, boolean>;

  fetchConversations: () => Promise<void>;
  createConversation: (otherUserId: string) => Promise<Conversation>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  updateCurrentConversation: (conversation: Conversation) => void;
  upsertConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setTyping: (userId: string, typing: boolean) => void;
  clearError: () => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  markConversationRead: (conversationId: string) => void;
  decrementUnreadCount: (conversationId: string) => void;
  incrementUnreadCount: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  error: null,
  typingUsers: {},

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await api.getConversations();
      set({ conversations, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
      set({ error: message, isLoading: false });
    }
  },

  createConversation: async (otherUserId: string) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await api.createConversation(otherUserId);
      const exists = get().conversations.find((c) => c.id === conversation.id);
      if (!exists) {
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
      return conversation;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create conversation';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  setCurrentConversation: (conversation: Conversation | null) => {
    set({ currentConversation: conversation, messages: [] });
  },

  updateCurrentConversation: (conversation: Conversation) => {
    set((state) => ({
      currentConversation: conversation,
      conversations: state.conversations.map((c) =>
        c.id === conversation.id ? conversation : c
      ),
    }));
  },

  upsertConversation: (conversation: Conversation) => {
    set((state) => {
      const existingIndex = state.conversations.findIndex((c) => c.id === conversation.id);
      let updatedConversations: Conversation[];

      if (existingIndex !== -1) {
        // Update existing and move to top
        const filtered = state.conversations.filter((c) => c.id !== conversation.id);
        updatedConversations = [conversation, ...filtered];
      } else {
        // Add new at top
        updatedConversations = [conversation, ...state.conversations];
      }

      return { conversations: updatedConversations };
    });
  },

  removeConversation: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      currentConversation: state.currentConversation?.id === conversationId
        ? null
        : state.currentConversation,
    }));
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await api.getMessages(conversationId);
      set({ messages, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch messages';
      set({ error: message, isLoading: false });
    }
  },

  addMessage: (message: Message) => {
    set((state) => {
      const existingIndex = state.messages.findIndex((m) => m.id === message.id);
      if (existingIndex !== -1) {
        // Update existing message with new status if provided
        const updatedMessages = [...state.messages];
        updatedMessages[existingIndex] = {
          ...updatedMessages[existingIndex],
          ...message,
        };
        return { messages: updatedMessages };
      }
      return {
        messages: [...state.messages, message],
      };
    });
  },

  setTyping: (userId: string, typing: boolean) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: typing },
    }));
  },

  updateMessageStatus: (messageId: string, status: string) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, status } : msg
      ),
    }));
  },

  markConversationRead: (conversationId: string) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.conversationId === conversationId && msg.status !== 'read'
          ? { ...msg, status: 'read', readAt: new Date().toISOString() }
          : msg
      ),
    }));
  },

  decrementUnreadCount: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId && conv.unreadCount && conv.unreadCount > 0
          ? { ...conv, unreadCount: 0 }
          : conv
      ),
    }));
  },

  incrementUnreadCount: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
          : conv
      ),
    }));
  },

  clearError: () => set({ error: null }),
}));
