'use client';

import { useState } from 'react';
import { X, Users, Plus, AlertCircle } from 'lucide-react';
import { api, User } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NonExistentUser {
  email: string;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { user } = useAuthStore();
  const { fetchConversations } = useChatStore();
  const [groupName, setGroupName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [error, setError] = useState('');
  const [nonExistentUser, setNonExistentUser] = useState<NonExistentUser | null>(null);

  const handleAddEmail = async () => {
    const email = emailInput.trim();
    if (!email) return;

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      setNonExistentUser(null);
      return;
    }

    if (members.includes(email)) {
      setError('Email already added');
      setNonExistentUser(null);
      return;
    }

    if (email === user?.email) {
      setError('You cannot add yourself');
      setNonExistentUser(null);
      return;
    }

    setIsCheckingUser(true);
    setError('');
    setNonExistentUser(null);

    try {
      const result = await api.checkUserExists(email);

      if (result.exists) {
        setMembers([...members, email]);
        setEmailInput('');
        setNonExistentUser(null);
      } else {
        setNonExistentUser({ email });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check user';
      setError(message);
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleRemoveNonExistentUser = () => {
    setNonExistentUser(null);
    setEmailInput('');
  };

  const handleTryAnotherEmail = () => {
    setNonExistentUser(null);
    setEmailInput('');
    setError('');
  };

  const handleRemoveEmail = (email: string) => {
    setMembers(members.filter((m) => m !== email));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    
    if (members.length === 0) {
      setError('Please add at least one member');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.createGroup(groupName, members);
      await fetchConversations();
      onClose();
      setGroupName('');
      setMembers([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create group';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="rounded-lg w-full max-w-md p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Create Group</h2>
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

        {nonExistentUser && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.2)', border: '1px solid #f97316' }}>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f97316' }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: '#f97316' }}>
                  User with email <strong>"{nonExistentUser.email}"</strong> does not exist.
                </p>
                <p className="text-xs mt-1" style={{ color: '#fdba74' }}>
                  Ask them to register or add a different email.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleTryAnotherEmail}
                    className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                    style={{ background: 'var(--surface-light)', color: 'var(--foreground)' }}
                  >
                    Try another
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveNonExistentUser}
                    className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                    style={{ background: '#ea580c', color: 'white' }}
                  >
                    Remove this
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 rounded-lg focus:outline-none"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Add Members (by email)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isCheckingUser && !nonExistentUser && (e.preventDefault(), handleAddEmail())}
                placeholder={nonExistentUser ? 'Clear the error above first' : 'Enter email address'}
                disabled={isCheckingUser || !!nonExistentUser}
                className="flex-1 px-3 py-2 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1px solid #000', background: '#fff', color: '#000' }}
              />
              <button
                type="button"
                onClick={handleAddEmail}
                disabled={isCheckingUser || !emailInput.trim() || !!nonExistentUser}
                className="px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: '#000', color: '#fff' }}
              >
                {isCheckingUser ? (
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: 'var(--surface-light)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={isLoading}
            className="w-full py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            <Users className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
