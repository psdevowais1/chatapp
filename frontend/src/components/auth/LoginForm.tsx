'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      router.push('/chat');
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="max-w-md w-full space-y-8 p-8 bg-[#2a2a2a] rounded-xl shadow-lg border border-[#404040]">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-[#a0a0a0]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <Button type="submit" isLoading={isLoading}>
            Sign in
          </Button>

          <p className="text-center text-sm text-[#a0a0a0]">
            Do not have an account?{' '}
            <Link href="/register" className="text-[#f5b229] hover:text-[#d99a1f] font-medium">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
