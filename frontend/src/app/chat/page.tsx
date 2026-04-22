'use client';

import ChatContent from '../../components/chat/ChatContent';
import SocketProvider from '../../components/providers/SocketProvider';

export default function ChatPage() {
  return (
    <SocketProvider>
      <ChatContent />
    </SocketProvider>
  );
}
