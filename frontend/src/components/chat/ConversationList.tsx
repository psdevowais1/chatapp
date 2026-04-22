'use client';

import { useRouter } from 'next/navigation';
import { Search, Settings, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Conversation, Message } from '../../lib/api';
import { useEffect, useState, useRef } from 'react';
import Avatar from '../ui/Avatar';
import {
  initSocket,
  onReceiveMessage,
  offReceiveMessage,
} from '../../lib/socket';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string | null;
}

export default function ConversationList({ onSelectConversation, selectedId }: ConversationListProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations, fetchConversations, isLoading, incrementUnreadCount, currentConversation } = useChatStore();
  const conversationsRef = useRef(conversations);
  const currentConversationRef = useRef(currentConversation);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Keep refs in sync
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Listen for new messages to update unread count and refresh conversation list
  useEffect(() => {
    if (user) {
      initSocket(user.id);
    }

    onReceiveMessage((message: Message) => {
      // Check if conversation exists in current list
      const conversationExists = conversationsRef.current.some(c => c.id === message.conversationId);
      
      if (!conversationExists) {
        // New conversation - refresh the entire list
        fetchConversations();
      } else if (currentConversationRef.current?.id !== message.conversationId) {
        // Existing conversation not currently open - increment unread
        incrementUnreadCount(message.conversationId);
        // Also refresh to update ordering by latest message
        fetchConversations();
      }
    });

    return () => {
      offReceiveMessage();
    };
  }, [user, incrementUnreadCount, fetchConversations]);

  const handleSelect = (conversation: Conversation) => {
    onSelectConversation(conversation);
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.id !== user?.id);
  };

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      return conversation.messages[0].content.substring(0, 30) + '...';
    }
    return 'No messages yet';
  };

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (conversation.isGroup) {
      return conversation.groupName?.toLowerCase().includes(query);
    } else {
      const other = getOtherParticipant(conversation);
      return other?.name.toLowerCase().includes(query) || other?.email.toLowerCase().includes(query);
    }
  });

  return (
    <div className="w-80 bg-[#2a2a2a] border-r border-[#404040] flex flex-col h-full">
      <div className="p-4 border-b border-[#404040]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-[#f5b229]/20' : 'hover:bg-[#3a3a3a]'}`}
              title="Search conversations"
            >
              <Search className={`w-5 h-5 ${showSearch ? 'text-[#f5b229]' : 'text-[#a0a0a0]'}`} />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-[#3a3a3a] rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-[#a0a0a0]" />
            </button>
          </div>
        </div>
        
        {showSearch && (
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a] text-sm"
              autoFocus
            />
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-[#a0a0a0] truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-[#a0a0a0]">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-[#a0a0a0]">
              {searchQuery.trim() ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#404040]">
            {filteredConversations.map((conversation) => {
              const other = getOtherParticipant(conversation);
              const isSelected = conversation.id === selectedId;
              const isGroup = conversation.isGroup;
              const displayName = isGroup ? conversation.groupName : other?.name;

              return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelect(conversation)}
                  className={`w-full p-4 flex items-start gap-3 transition-colors ${
                    isSelected 
                      ? 'bg-[#3a3a3a]' 
                      : (conversation.unreadCount ?? 0) > 0 
                        ? 'bg-[#f5b229]/10 hover:bg-[#f5b229]/20' 
                        : 'hover:bg-[#3a3a3a]'
                  }`}
                >
                  {isGroup ? (
                    <div className="w-10 h-10 bg-[#3a3a3a] rounded-full flex items-center justify-center border border-[#404040]">
                      <Users className="w-5 h-5 text-[#f5b229]" />
                    </div>
                  ) : (
                    <Avatar user={other} size="md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-medium text-white">{displayName}</h3>
                      {(conversation.unreadCount ?? 0) > 0 && (
                        <span className="w-5 h-5 bg-[#f5b229] text-black text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    {(conversation.unreadCount ?? 0) > 0 && (
                      <p className="text-sm text-[#f5b229] font-medium mt-1">
                        You have unread message{(conversation.unreadCount ?? 0) > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
