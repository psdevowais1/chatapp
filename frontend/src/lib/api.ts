const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  profilePhoto?: string | null;
  createdAt: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  isGroup?: boolean;
  groupName?: string | null;
  groupPhoto?: string | null;
  creatorId?: string | null;
  participants: User[];
  messages?: Message[];
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string | null;
  conversationId: string;
  createdAt: string;
  sender: User;
  receiver?: User | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  status?: string;
  readAt?: string | null;
}

interface UploadResponse {
  url: string;
  name: string;
  type: string;
  size: number;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async searchUsers(email: string): Promise<User[]> {
    return this.request<User[]>(`/users/search?email=${encodeURIComponent(email)}`);
  }

  async checkUserExists(email: string): Promise<{ exists: boolean; user?: User }> {
    return this.request<{ exists: boolean; user?: User }>(`/users/check-email?email=${encodeURIComponent(email)}`);
  }

  async createConversation(otherUserId: string): Promise<Conversation> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    });
  }

  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/conversations');
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, receiverId: string, content: string): Promise<Message> {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    });
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async updateProfile(data: { name?: string; profilePhoto?: string }): Promise<User> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Group methods
  async createGroup(name: string, memberEmails: string[], groupPhoto?: string): Promise<Conversation> {
    return this.request<Conversation>('/groups/create', {
      method: 'POST',
      body: JSON.stringify({ name, memberEmails, groupPhoto }),
    });
  }

  async addGroupMembers(conversationId: string, emails: string[]): Promise<Conversation> {
    return this.request<Conversation>('/groups/add-members', {
      method: 'POST',
      body: JSON.stringify({ conversationId, emails }),
    });
  }

  async getGroupMembers(conversationId: string): Promise<User[]> {
    return this.request<User[]>(`/groups/${conversationId}/members`);
  }

  async leaveGroup(conversationId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/groups/${conversationId}/leave`, {
      method: 'POST',
    });
  }

  async deleteGroup(conversationId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/groups/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async removeGroupMember(conversationId: string, memberId: string): Promise<{ success: boolean; group: Conversation }> {
    return this.request<{ success: boolean; group: Conversation }>(`/groups/${conversationId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async updateGroupInfo(conversationId: string, data: { name?: string; groupPhoto?: string }): Promise<Conversation> {
    return this.request<Conversation>(`/groups/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
export type { User, Message, Conversation, AuthResponse };
