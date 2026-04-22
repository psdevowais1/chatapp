'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Camera, UserPlus, UserMinus, Trash2, Edit, AlertCircle, Check } from 'lucide-react';
import { api, User, Conversation } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
}

export default function GroupSettingsModal({ isOpen, onClose, conversation }: GroupSettingsModalProps) {
  const { user } = useAuthStore();
  const { fetchConversations, setCurrentConversation, updateCurrentConversation, removeConversation } = useChatStore();
  const [groupName, setGroupName] = useState(conversation.groupName || '');
  const [members, setMembers] = useState<User[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCreator = conversation.creatorId === user?.id;

  useEffect(() => {
    if (isOpen && conversation.id) {
      loadMembers();
      setGroupName(conversation.groupName || '');
    }
  }, [isOpen, conversation.id]);

  const loadMembers = async () => {
    try {
      const groupMembers = await api.getGroupMembers(conversation.id);
      setMembers(groupMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    try {
      const upload = await api.uploadFile(file);
      const updated = await api.updateGroupInfo(conversation.id, { groupPhoto: upload.url });
      await fetchConversations();
      updateCurrentConversation(updated);
      setSuccess('Group photo updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update photo';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!groupName.trim()) {
      setError('Group name cannot be empty');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const updated = await api.updateGroupInfo(conversation.id, { name: groupName });
      await fetchConversations();
      updateCurrentConversation(updated);
      setIsEditingName(false);
      setSuccess('Group name updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update name';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    const email = emailInput.trim();
    if (!email) return;

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    if (members.some((m) => m.email === email)) {
      setError('User already in group');
      return;
    }

    setIsCheckingUser(true);
    setError('');
    try {
      const result = await api.checkUserExists(email);
      if (result.exists) {
        const updated = await api.addGroupMembers(conversation.id, [email]);
        await loadMembers();
        await fetchConversations();
        setEmailInput('');
        setSuccess('Member added successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(`User with email "${email}" does not exist`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add member';
      setError(message);
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await api.removeGroupMember(conversation.id, memberId);
      await loadMembers();
      await fetchConversations();
      updateCurrentConversation(result.group);
      setShowRemoveMember(null);
      setSuccess('Member removed');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    setIsLoading(true);
    setError('');
    try {
      await api.deleteGroup(conversation.id);
      removeConversation(conversation.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      setError(message);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLeaveGroup = async () => {
    setIsLoading(true);
    setError('');
    try {
      await api.leaveGroup(conversation.id);
      await fetchConversations();
      setCurrentConversation(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave group';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto border border-[#404040]">
        <div className="sticky top-0 bg-[#2a2a2a] p-4 border-b border-[#404040] z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{isCreator ? 'Group Settings' : 'Group Info'}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#3a3a3a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#a0a0a0]" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          {/* Group Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#3a3a3a] flex items-center justify-center overflow-hidden">
                {conversation.groupPhoto ? (
                  <img
                    src={`http://localhost:5000${conversation.groupPhoto}`}
                    alt="Group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-[#f5b229]">
                    {conversation.groupName?.charAt(0).toUpperCase() || 'G'}
                  </span>
                )}
              </div>
              {isCreator && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-[#f5b229] rounded-full hover:bg-[#d99a1f] transition-colors"
                >
                  <Camera className="w-4 h-4 text-black" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
              Group Name
            </label>
            {isEditingName && isCreator ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={isLoading}
                  className="px-3 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 bg-[#3a3a3a] rounded-lg">
                <span className="text-white">{groupName}</span>
                {isCreator && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[#a0a0a0] hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members List */}
          <div>
            <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
              Members ({members.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-3 py-2 bg-[#3a3a3a] rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#4a4a4a] flex items-center justify-center overflow-hidden">
                      {member.profilePhoto ? (
                        <img
                          src={`http://localhost:5000${member.profilePhoto}`}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-[#a0a0a0]">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white">{member.name}</p>
                      <p className="text-xs text-[#a0a0a0]">{member.email}</p>
                    </div>
                    {member.id === conversation.creatorId && (
                      <span className="text-xs px-2 py-0.5 bg-[#f5b229]/20 text-[#f5b229] rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  {isCreator && member.id !== user?.id && (
                    <button
                      onClick={() => setShowRemoveMember(member.id)}
                      className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Member (Creator Only) */}
          {isCreator && (
            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1">
                Add Member
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isCheckingUser && (e.preventDefault(), handleAddMember())}
                  placeholder="Enter email address"
                  disabled={isCheckingUser}
                  className="flex-1 px-3 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a] disabled:opacity-50"
                />
                <button
                  onClick={handleAddMember}
                  disabled={isCheckingUser || !emailInput.trim()}
                  className="px-3 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50"
                >
                  {isCheckingUser ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Delete/Leave Group */}
          <div className="pt-4 border-t border-[#404040]">
            {isCreator ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            ) : (
              <button
                onClick={handleLeaveGroup}
                disabled={isLoading}
                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserMinus className="w-4 h-4" />
                Leave Group
              </button>
            )}
          </div>
        </div>

        {/* Remove Member Confirmation */}
        {showRemoveMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#404040] max-w-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Remove Member?</h3>
              </div>
              <p className="text-sm text-[#a0a0a0] mb-4">
                Are you sure you want to remove this member from the group?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRemoveMember(null)}
                  className="flex-1 py-2 bg-[#3a3a3a] text-white rounded-lg hover:bg-[#4a4a4a]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(showRemoveMember)}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Group Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#404040] max-w-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Delete Group?</h3>
              </div>
              <p className="text-sm text-[#a0a0a0] mb-4">
                This action cannot be undone. All messages and data will be permanently deleted.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-[#3a3a3a] text-white rounded-lg hover:bg-[#4a4a4a]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
