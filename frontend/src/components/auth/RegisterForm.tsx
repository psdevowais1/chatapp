'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function RegisterForm() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(email, password, name);
      router.push('/chat');
    } catch {
      // Error handled by store
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="max-w-md w-full space-y-8 p-8 bg-[#2a2a2a] rounded-xl shadow-lg border border-[#404040]">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="mt-2 text-[#a0a0a0]">Sign up to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {displayError && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-sm text-red-400">{displayError}</p>
            </div>
          )}

          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />

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
            placeholder="Create a password"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />

          <Button type="submit" isLoading={isLoading}>
            Create account
          </Button>

          <p className="text-center text-sm text-[#a0a0a0]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#f5b229] hover:text-[#d99a1f] font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
