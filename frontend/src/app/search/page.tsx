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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/chat')}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--surface-light)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Find Users</h1>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Search by email..."
                className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {users.map((foundUser) => (
            <div
              key={foundUser.id}
              className="p-4 rounded-lg flex items-center justify-between"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>{foundUser.name}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{foundUser.email}</p>
              </div>
              <button
                onClick={() => handleStartChat(foundUser)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
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
