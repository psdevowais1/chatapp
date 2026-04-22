'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft } from 'lucide-react';
import { api, User } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

export default function SearchPage() {
  const router = useRouter();
  const { user, _hasHydrated, isAuthenticated } = useAuthStore();
  const { createConversation, setCurrentConversation } = useChatStore();
  const [email, setEmail] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const results = await api.searchUsers(email);
      setUsers(results);
      if (results.length === 0) {
        setError('No users found');
      }
    } catch {
      setError('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async (otherUser: User) => {
    try {
      const conversation = await createConversation(otherUser.id);
      setCurrentConversation(conversation);
      router.push(`/chat?conversation=${conversation.id}`);
    } catch {
      setError('Failed to start conversation');
    }
  };

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-[#a0a0a0]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/chat')}
            className="p-2 hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Find Users</h1>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a0a0a0] w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Search by email..."
                className="w-full pl-10 pr-4 py-3 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {users.map((foundUser) => (
            <div
              key={foundUser.id}
              className="p-4 bg-[#2a2a2a] rounded-lg border border-[#404040] flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium text-white">{foundUser.name}</h3>
                <p className="text-sm text-[#a0a0a0]">{foundUser.email}</p>
              </div>
              <button
                onClick={() => handleStartChat(foundUser)}
                className="px-4 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] transition-colors"
              >
                Chat
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
