'use client';

import { useState } from 'react';
import { X, User, Search } from 'lucide-react';
import { api, User as UserType } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const { user } = useAuthStore();
  const { fetchConversations, setCurrentConversation, conversations } = useChatStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundUser, setFoundUser] = useState<UserType | null>(null);

  const handleSearchUser = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setFoundUser(null);

    try {
      const users = await api.searchUsers(email.trim());
      if (users.length > 0) {
        setFoundUser(users[0]);
      } else {
        setError('User not found with this email');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search user';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!foundUser || !user) return;

    setIsLoading(true);
    setError('');

    try {
      // Check if conversation already exists
      const existingConv = conversations.find(
        c => !c.isGroup && c.participants.some(p => p.id === foundUser.id)
      );

      if (existingConv) {
        setCurrentConversation(existingConv);
        onClose();
        return;
      }

      // Create new conversation
      const conversation = await api.createConversation(foundUser.id);
      await fetchConversations();
      setCurrentConversation(conversation);
      onClose();
      setEmail('');
      setFoundUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="rounded-xl w-full max-w-md p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>New Chat</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ background: 'var(--surface-light)' }}
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Search by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
              />
              <button
                type="button"
                onClick={handleSearchUser}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {foundUser && (
            <div className="p-4 rounded-lg" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--surface)' }}>
                  {foundUser.profilePhoto ? (
                    <img
                      src={foundUser.profilePhoto}
                      alt={foundUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>{foundUser.name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{foundUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartChat}
                disabled={isLoading}
                className="w-full mt-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
              >
                {isLoading ? 'Starting...' : 'Start Conversation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
