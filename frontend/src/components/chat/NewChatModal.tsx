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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] rounded-lg w-full max-w-md p-6 border border-[#404040]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">New Chat</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#a0a0a0]" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
              Search by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
              />
              <button
                type="button"
                onClick={handleSearchUser}
                disabled={isLoading}
                className="px-3 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {foundUser && (
            <div className="p-4 bg-[#3a3a3a] rounded-lg border border-[#404040]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#4a4a4a] rounded-full flex items-center justify-center">
                  {foundUser.profilePhoto ? (
                    <img 
                      src={foundUser.profilePhoto} 
                      alt={foundUser.name} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-[#a0a0a0]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{foundUser.name}</p>
                  <p className="text-sm text-[#a0a0a0]">{foundUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartChat}
                disabled={isLoading}
                className="w-full mt-3 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 transition-colors"
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
