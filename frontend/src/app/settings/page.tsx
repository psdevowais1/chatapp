'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Save, Key, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import Avatar from '../../components/ui/Avatar';

export default function SettingsPage() {
  const router = useRouter();
  const { user, _hasHydrated, isAuthenticated, setUser, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const uploadResponse = await api.uploadFile(file);
      const updatedUser = await api.updateProfile({ profilePhoto: uploadResponse.url });
      setUser(updatedUser);
      setSuccess('Profile photo updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update photo';
      setError(message);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await api.updateProfile({ name: name.trim() });
      setUser(updatedUser);
      setSuccess('Profile updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updatePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
          <h1 className="text-xl font-semibold text-white">Settings</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm border border-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/30 text-green-400 rounded-lg text-sm border border-green-700">
            {success}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-[#2a2a2a] rounded-lg p-6 mb-4 border border-[#404040]">
          <h2 className="text-lg font-medium text-white mb-4">Profile</h2>
          
          {/* Profile Photo */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar user={user} size="lg" />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                className="hidden"
                accept="image/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute bottom-0 right-0 p-1.5 bg-[#f5b229] text-black rounded-full hover:bg-[#d99a1f] transition-colors"
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <p className="font-medium text-white">{user.name}</p>
              <p className="text-sm text-[#a0a0a0]">{user.email}</p>
            </div>
          </div>

          {/* Update Name Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
                placeholder="Your name"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || name === user.name}
              className="flex items-center gap-2 px-4 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#404040]">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#f5b229]" />
            Change Password
          </h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 transition-colors"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Logout Section */}
        <div className="bg-[#2a2a2a] rounded-lg p-6 mt-4 border border-[#404040]">
          <h2 className="text-lg font-medium text-white mb-4">Account</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
