'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserManagement from '../../components/superuser/UserManagement';
import { useAuthStore } from '../../store/authStore';

export default function AdminPage() {
  const router = useRouter();
  const { user, _hasHydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="p-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/chat')}
            className="font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            Back to Chat
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Admin Panel</h1>
          <div className="w-20" />
        </div>
      </div>
      <UserManagement />
    </div>
  );
}
