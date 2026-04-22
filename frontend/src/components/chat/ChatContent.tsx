'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import ConversationList from './ConversationList';
import MessageArea from './MessageArea';
import { Conversation } from '../../lib/api';

export default function ChatContent() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, isLoading: authLoading, _hasHydrated } = useAuthStore();
  const { setCurrentConversation, conversations, fetchConversations } = useChatStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  useEffect(() => {
    if (_hasHydrated) {
      checkAuth();
    }
  }, [checkAuth, _hasHydrated]);

  useEffect(() => {
    if (_hasHydrated && !authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router, _hasHydrated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setCurrentConversation(conversation);
    setShowMobileList(false);
  };

  const handleBack = () => {
    setShowMobileList(true);
    setSelectedConversation(null);
    setCurrentConversation(null);
  };

  // Handle Escape key to close conversation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedConversation) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConversation]);

  if (!_hasHydrated || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--background)' }}>
      <div className={`lg:block ${showMobileList ? 'block' : 'hidden'}`}>
        <ConversationList 
          onSelectConversation={handleSelectConversation} 
          selectedId={selectedConversation?.id} 
        />
      </div>
      <div className={`flex-1 ${showMobileList ? 'hidden lg:block' : 'block'}`}>
        <MessageArea conversation={selectedConversation} onBack={handleBack} />
      </div>
    </div>
  );
}
