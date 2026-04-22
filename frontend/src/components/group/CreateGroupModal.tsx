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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] rounded-lg w-full max-w-md p-6 border border-[#404040]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Create Group</h2>
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

        {nonExistentUser && (
          <div className="mb-4 p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-orange-400">
                  User with email <strong>"{nonExistentUser.email}"</strong> does not exist.
                </p>
                <p className="text-xs text-orange-300 mt-1">
                  Ask them to register or add a different email.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleTryAnotherEmail}
                    className="px-3 py-1.5 bg-[#3a3a3a] text-white text-sm rounded-lg hover:bg-[#4a4a4a] transition-colors"
                  >
                    Try another
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveNonExistentUser}
                    className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
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
            <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
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
                className="flex-1 px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                disabled={isCheckingUser || !emailInput.trim() || !!nonExistentUser}
                className="px-3 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCheckingUser ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                  className="flex items-center gap-1 px-2 py-1 bg-[#3a3a3a] rounded-full"
                >
                  <span className="text-sm text-white">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-[#a0a0a0] hover:text-white"
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
            className="w-full py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
