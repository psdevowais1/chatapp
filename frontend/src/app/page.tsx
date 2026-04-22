'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated) {
      if (isAuthenticated) {
        router.push('/chat');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, _hasHydrated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  );
}
