'use client';

import { useRouter } from 'next/navigation';
import { Search, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Conversation } from '../../lib/api';
import { useEffect, useState } from 'react';
import Avatar from '../ui/Avatar';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string | null;
}

export default function ConversationList({ onSelectConversation, selectedId }: ConversationListProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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
    <div className="w-80 flex flex-col h-full p-3" style={{ background: 'var(--background)' }}>
      {/* Header with rounded corners */}
      <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Messages</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className="p-2 rounded-xl transition-colors"
              style={{ background: showSearch ? 'var(--surface-light)' : 'var(--surface-light)' }}
              title="Search conversations"
            >
              <Search className="w-5 h-5" style={{ color: showSearch ? 'var(--foreground)' : 'var(--text-muted)' }} />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="hover:opacity-80 transition-opacity rounded-full overflow-hidden"
              title="Open settings"
            >
              <Avatar user={user} size="md" />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 rounded-xl focus:outline-none text-sm"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface-light)',
                color: 'var(--foreground)'
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Conversations list with rounded styling */}
      <div className="flex-1 overflow-y-auto rounded-xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {isLoading ? (
          <div className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery.trim() ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => {
              const other = getOtherParticipant(conversation);
              const isSelected = conversation.id === selectedId;
              const isGroup = conversation.isGroup;
              const displayName = isGroup ? conversation.groupName : other?.name;

              return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelect(conversation)}
                  className="w-full p-3 flex items-start gap-3 rounded-xl transition-colors"
                  style={{
                    background: isSelected
                      ? 'var(--surface-light)'
                      : 'transparent'
                  }}
                >
                  {isGroup ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                      <Users className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <Avatar user={other} size="md" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-medium" style={{ color: 'var(--foreground)' }}>{displayName}</h3>
                      {(conversation.unreadCount ?? 0) > 0 && (
                        <span className="w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--foreground)', color: 'var(--background)' }}>
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    {(conversation.unreadCount ?? 0) > 0 && (
                      <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                        New message{(conversation.unreadCount ?? 0) > 1 ? 's' : ''}
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
