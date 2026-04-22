'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Paperclip, FileText, File as FileIcon, Image, X, Mic, Square, Play, Pause, Check, CheckCheck, User, Users, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { api, Conversation, Message } from '../../lib/api';
import Avatar from '../ui/Avatar';
import VoiceMessage from '../ui/VoiceMessage';
import CreateGroupModal from '../group/CreateGroupModal';
import NewChatModal from './NewChatModal';
import {
  initSocket,
  joinConversation,
  leaveConversation,
  onReceiveMessage,
  offReceiveMessage,
  sendMessage as socketSendMessage,
  emitTypingStart,
  emitTypingStop,
  onUserTyping,
  offUserTyping,
  markMessagesRead,
  onMessageDelivered,
  offMessageDelivered,
  onMessagesRead,
  offMessagesRead,
} from '../../lib/socket';

interface MessageAreaProps {
  conversation: Conversation | null;
  onBack: () => void;
}

export default function MessageArea({ conversation, onBack }: MessageAreaProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { messages, fetchMessages, addMessage, setTyping, typingUsers, updateMessageStatus, markConversationRead, decrementUnreadCount, fetchConversations, setCurrentConversation } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isGroup = conversation?.isGroup || false;
  const otherUser = conversation?.participants.find((p) => p.id !== user?.id);
  const isTyping = otherUser ? typingUsers[otherUser.id] : false;
  const isGroupCreator = isGroup && conversation?.creatorId === user?.id;

  useEffect(() => {
    if (user && !messages.length) {
      initSocket(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (conversation) {
      fetchMessages(conversation.id);
      joinConversation(conversation.id);

      onReceiveMessage((message: Message) => {
        if (message.conversationId === conversation.id) {
          // Mark message as read immediately since conversation is open
          const readMessage = { ...message, status: 'read' };
          addMessage(readMessage);
          // Notify server that message was read
          if (user) {
            markMessagesRead(conversation.id, user.id);
          }
        }
      });

      onUserTyping(({ userId, typing }) => {
        setTyping(userId, typing);
      });
    }

    return () => {
      if (conversation) {
        leaveConversation(conversation.id);
        offReceiveMessage();
        offUserTyping();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (conversation && user) {
      // Small delay to ensure messages are loaded first
      const timer = setTimeout(() => {
        markMessagesRead(conversation.id, user.id);
        decrementUnreadCount(conversation.id);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [conversation, user, decrementUnreadCount]);

  // Handle message delivered and read receipts
  useEffect(() => {
    const handleDelivered = (data: { messageId: string; conversationId: string }) => {
      updateMessageStatus(data.messageId, 'delivered');
    };

    const handleRead = (data: { conversationId: string; readBy: string; readAt: string }) => {
      // Update all messages in this conversation to read status
      markConversationRead(data.conversationId);
    };

    onMessageDelivered(handleDelivered);
    onMessagesRead(handleRead);

    return () => {
      offMessageDelivered();
      offMessagesRead();
    };
  }, [updateMessageStatus, markConversationRead]);

  const getMessageStatus = (message: Message) => {
    if (message.senderId !== user?.id) return null;
    
    const status = message.status || 'sent';
    
    if (status === 'read') {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (status === 'delivered') {
      return <CheckCheck className="w-4 h-4 text-white/60" />;
    } else {
      return <Check className="w-4 h-4 text-white/60" />;
    }
  };

  const handleTyping = () => {
    if (conversation && user) {
      emitTypingStart(conversation.id, user.id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop(conversation.id, user.id);
      }, 1000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !conversation || !user) return;

    setIsLoading(true);
    const content = newMessage.trim() || (selectedFile ? `Sent: ${selectedFile.name}` : '');
    setNewMessage('');

    try {
      let attachment;
      if (selectedFile) {
        setUploadingFile(true);
        const uploadResponse = await api.uploadFile(selectedFile);
        attachment = {
          url: uploadResponse.url,
          name: uploadResponse.name,
          type: uploadResponse.type,
          size: uploadResponse.size,
        };
        setSelectedFile(null);
        setUploadingFile(false);
      }

      // For groups, receiverId is null; for direct messages, it's the other user's id
      const receiverId = isGroup ? null : otherUser?.id || null;
      socketSendMessage(conversation.id, user.id, receiverId, content, attachment);
      emitTypingStop(conversation.id, user.id);
    } catch {
      console.error('Failed to send message');
    } finally {
      setIsLoading(false);
      setUploadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string | null | undefined) => {
    if (!type) return <FileIcon className="w-5 h-5" />;
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('word')) return <FileText className="w-5 h-5" />;
    return <FileIcon className="w-5 h-5" />;
  };

  const isImage = (type: string | null | undefined) => {
    return type?.startsWith('image/');
  };

  const isAudio = (type: string | null | undefined) => {
    return type?.startsWith('audio/');
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
          type: 'audio/webm',
        });

        stream.getTracks().forEach(track => track.stop());

        // Upload and send the voice message
        try {
          setUploadingFile(true);
          const uploadResponse = await api.uploadFile(audioFile);
          const attachment = {
            url: uploadResponse.url,
            name: uploadResponse.name,
            type: uploadResponse.type,
            size: uploadResponse.size,
          };

          if (conversation && user) {
            const receiverId = isGroup ? null : otherUser?.id || null;
            socketSendMessage(conversation.id, user.id, receiverId, '', attachment);
          }
        } catch (error) {
          console.error('Failed to send voice message:', error);
        } finally {
          setUploadingFile(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleDeleteGroup = async () => {
    if (!conversation || !isGroupCreator) return;

    setIsDeleting(true);
    try {
      await api.deleteGroup(conversation.id);
      await fetchConversations();
      setCurrentConversation(null);
      setShowDeleteConfirm(false);
      onBack();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1a1a] h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-4">Start a Conversation</h2>
          <p className="text-[#a0a0a0] mb-6">Choose an option to get started</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowNewChat(true)}
              className="flex flex-col items-center gap-2 p-6 bg-[#2a2a2a] border border-[#404040] rounded-lg hover:bg-[#3a3a3a] transition-colors"
            >
              <User className="w-8 h-8 text-[#f5b229]" />
              <span className="text-white font-medium">New Chat</span>
              <span className="text-xs text-[#a0a0a0]">Start 1-on-1 conversation</span>
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex flex-col items-center gap-2 p-6 bg-[#2a2a2a] border border-[#404040] rounded-lg hover:bg-[#3a3a3a] transition-colors"
            >
              <Users className="w-8 h-8 text-[#f5b229]" />
              <span className="text-white font-medium">Create Group</span>
              <span className="text-xs text-[#a0a0a0]">Group conversation</span>
            </button>
          </div>
        </div>
        
        <CreateGroupModal 
          isOpen={showCreateGroup} 
          onClose={() => setShowCreateGroup(false)} 
        />
        
        <NewChatModal
          isOpen={showNewChat}
          onClose={() => setShowNewChat(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a]">
      <div className="p-4 bg-[#2a2a2a] border-b border-[#404040] flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[#3a3a3a] rounded-lg transition-colors lg:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        {isGroup ? (
          <div className="flex-1">
            <h2 className="font-semibold text-white">{conversation.groupName}</h2>
            <p className="text-sm text-[#a0a0a0]">{conversation.participants.length} members</p>
          </div>
        ) : (
          <div className="flex-1">
            <h2 className="font-semibold text-white">{otherUser?.name}</h2>
            <p className="text-sm text-[#a0a0a0]">{otherUser?.email}</p>
          </div>
        )}
        {isGroupCreator && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete Group"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.senderId === user?.id;

          return (
            <div key={message.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && <Avatar user={message.sender} size="sm" />}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwn ? 'bg-[#3a3a3a] text-white' : 'bg-[#2a2a2a] text-white border border-[#404040]'
                }`}
              >
                {isGroup && !isOwn && (
                  <p className="text-xs font-semibold text-[#f5b229] mb-1">{message.sender?.name}</p>
                )}
                {message.attachmentUrl && (
                  <div className="mb-2">
                    {isImage(message.attachmentType) ? (
                      <a
                        href={`${process.env.NEXT_PUBLIC_SOCKET_URL}${message.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={`${process.env.NEXT_PUBLIC_SOCKET_URL}${message.attachmentUrl}`}
                          alt={message.attachmentName || 'Image'}
                          className="max-w-full h-auto rounded-lg max-h-48 object-cover"
                        />
                      </a>
                    ) : isAudio(message.attachmentType) ? (
                      <VoiceMessage 
                        url={`${process.env.NEXT_PUBLIC_SOCKET_URL}${message.attachmentUrl}`}
                        isOwn={isOwn}
                      />
                    ) : (
                      <a
                        href={`${process.env.NEXT_PUBLIC_SOCKET_URL}${message.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          isOwn ? 'bg-[#4a4a4a]' : 'bg-[#3a3a3a]'
                        }`}
                      >
                        {getFileIcon(message.attachmentType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.attachmentName}</p>
                          {message.attachmentSize && (
                            <p className={`text-xs text-[#a0a0a0]`}>
                              {formatFileSize(message.attachmentSize)}
                            </p>
                          )}
                        </div>
                      </a>
                    )}
                  </div>
                )}
                {message.content && !isAudio(message.attachmentType) && <p>{message.content}</p>}
                <div className={`flex items-center gap-1 justify-end mt-1 ${isOwn ? '' : ''}`}>
                  <p
                    className={`text-xs text-[#a0a0a0]`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                  {isOwn && getMessageStatus(message)}
                </div>
              </div>
              {isOwn && <Avatar user={message.sender} size="sm" />}
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#2a2a2a] text-[#a0a0a0] px-4 py-2 rounded-lg border border-[#404040]">
              <span className="animate-pulse">typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-[#2a2a2a] border-t border-[#404040]">
        {selectedFile && (
          <div className="mb-2 p-2 bg-[#3a3a3a] rounded-lg flex items-center gap-2">
            {getFileIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-[#a0a0a0]">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-[#4a4a4a] rounded"
            >
              <X className="w-4 h-4 text-[#a0a0a0]" />
            </button>
          </div>
        )}
        
        {isRecording && (
          <div className="mb-3 p-3 bg-[#3a3a3a] rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-[#f5b229] rounded-full flex items-center justify-center">
                  <Mic className="w-5 h-5 text-black" />
                </div>
                <div className="absolute inset-0 bg-[#f5b229] rounded-full animate-ping opacity-30" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-[#f5b229] rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 16 + 8}px`,
                          animationDelay: `${i * 50}ms`,
                          animationDuration: '300ms',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-white mt-1 font-medium">
                  {formatRecordingTime(recordingTime)}
                </p>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 bg-[#f5b229] text-black text-sm font-medium rounded-full hover:bg-[#d99a1f] transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[#a0a0a0] hover:bg-[#3a3a3a] rounded-lg transition-colors"
            title="Attach file"
            disabled={isRecording}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-[#404040] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5b229] text-white bg-[#3a3a3a]"
            disabled={isLoading || uploadingFile || isRecording}
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || uploadingFile}
            className={`p-2 rounded-lg transition-colors ${
              isRecording 
                ? 'bg-[#f5b229] text-black hover:bg-[#d99a1f]' 
                : 'text-[#a0a0a0] hover:bg-[#3a3a3a]'
            }`}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={isLoading || uploadingFile || isRecording || (!newMessage.trim() && !selectedFile)}
            className="px-4 py-2 bg-[#f5b229] text-black rounded-lg hover:bg-[#d99a1f] disabled:opacity-50 transition-colors"
          >
            {uploadingFile ? (
              <span className="text-sm">Uploading...</span>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Delete Group Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2a2a2a] rounded-lg w-full max-w-sm p-6 border border-[#404040]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Delete Group</h2>
            </div>
            <p className="text-[#a0a0a0] mb-2">
              Are you sure you want to delete <strong className="text-white">{conversation.groupName}</strong>?
            </p>
            <p className="text-sm text-red-400 mb-6">
              This action cannot be undone. All messages will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-[#3a3a3a] text-white rounded-lg hover:bg-[#4a4a4a] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
