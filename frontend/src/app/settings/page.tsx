'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Save, Key, LogOut, Shield, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { api } from '../../lib/api';
import Avatar from '../../components/ui/Avatar';

export default function SettingsPage() {
  const router = useRouter();
  const { user, _hasHydrated, isAuthenticated, setUser, logout } = useAuthStore();
  const { theme, toggleTheme, _hasHydrated: themeHydrated } = useThemeStore();
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
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
          <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Settings</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderColor: 'var(--danger)', border: '1px solid' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)', borderColor: 'var(--success)', border: '1px solid' }}>
            {success}
          </div>
        )}

        {/* Theme Section */}
        <div className="rounded-lg p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>Theme</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--surface-light)' }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                  <span style={{ color: 'var(--foreground)' }}>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                  <span style={{ color: 'var(--foreground)' }}>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="rounded-lg p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>Profile</h2>

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
                className="absolute bottom-0 right-0 p-1.5 rounded-full transition-colors"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>{user.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            </div>
          </div>

          {/* Update Name Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-light)',
                  color: 'var(--foreground)',
                  '--tw-ring-color': 'var(--primary)'
                } as React.CSSProperties}
                placeholder="Your name"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || name === user.name}
              className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="rounded-lg p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Key className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
            Change Password
          </h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-light)',
                  color: 'var(--foreground)'
                }}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-light)',
                  color: 'var(--foreground)'
                }}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-light)',
                  color: 'var(--foreground)'
                }}
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}
            >
              <Key className="w-4 h-4" style={{ color: 'black' }} />
              Update Password
            </button>
          </form>
        </div>

        {/* Logout Section */}
        <div className="rounded-lg p-6 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>Account</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--danger)', color: 'white' }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Admin Panel - Superuser Only */}
        {user?.role === 'SUPERUSER' && (
          <div className="rounded-lg p-6 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <Shield className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
              Superuser
            </h2>
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--foreground)', color: 'var(--background)' }}
            >
              <Shield className="w-4 h-4" />
              Manage Users
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
