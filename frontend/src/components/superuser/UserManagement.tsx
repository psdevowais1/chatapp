'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Edit, Check, AlertCircle } from 'lucide-react';
import { api, User } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface UserWithCount extends User {
  _count?: {
    messagesSent: number;
    conversations: number;
  };
}

export default function UserManagement() {
  const { user: currentUser, _hasHydrated } = useAuthStore();
  const [users, setUsers] = useState<UserWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<UserWithCount | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserWithCount | null>(null);

  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await api.createUser(createForm);
      setSuccess('User created successfully');
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', name: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    setError(null);
    setSuccess(null);

    try {
      const updateData: any = {};
      if (editForm.name !== showEditModal.name) updateData.name = editForm.name;
      if (editForm.email !== showEditModal.email) updateData.email = editForm.email;
      if (editForm.password) updateData.password = editForm.password;

      if (Object.keys(updateData).length === 0) {
        setShowEditModal(null);
        return;
      }

      await api.updateUser(showEditModal.id, updateData);
      setSuccess('User updated successfully');
      setShowEditModal(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteConfirm) return;

    setError(null);
    setSuccess(null);

    try {
      await api.deleteUser(showDeleteConfirm.id);
      setSuccess('User deleted successfully');
      setShowDeleteConfirm(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user: UserWithCount) => {
    setEditForm({ name: user.name, email: user.email, password: '' });
    setShowEditModal(user);
  };

  if (!_hasHydrated) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (currentUser?.role !== 'SUPERUSER') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold" style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Only superusers can access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>User Management</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            <UserPlus className="w-5 h-5" />
            Create User
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)' }}>
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
            <p style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid var(--success)' }}>
            <Check className="w-5 h-5" style={{ color: 'var(--success)' }} />
            <p style={{ color: 'var(--success)' }}>{success}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No users found</div>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <table className="w-full">
              <thead style={{ background: 'var(--surface-light)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Messages</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Conversations</th>
                  <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--surface-light)' }}>
                          {user.profilePhoto ? (
                            <img
                              src={`http://localhost:5000${user.profilePhoto}`}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--foreground)' }}>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs" style={{
                        background: user.role === 'SUPERUSER' ? 'var(--surface-light)' : 'var(--surface-light)',
                        color: user.role === 'SUPERUSER' ? 'var(--foreground)' : 'var(--text-muted)'
                      }}>
                        {user.role || 'USER'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{user._count?.messagesSent || 0}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{user._count?.conversations || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ background: 'var(--surface-light)' }}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => setShowDeleteConfirm(user)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg w-full max-w-md p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg" style={{ background: 'var(--surface-light)' }}>
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg transition-colors"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
              >
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg w-full max-w-md p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Edit User</h2>
              <button onClick={() => setShowEditModal(null)} className="p-1 rounded-lg" style={{ background: 'var(--surface-light)' }}>
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-light)', color: 'var(--foreground)' }}
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg transition-colors"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
              >
                Update User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg w-full max-w-sm p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <AlertCircle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Delete User?</h2>
            </div>
            <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete <span style={{ color: 'var(--foreground)' }} className="font-medium">{showDeleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--surface-light)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 py-2 rounded-lg transition-colors"
                style={{ background: 'var(--danger)', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
