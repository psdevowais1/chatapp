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
import GroupSettingsModal from '../group/GroupSettingsModal';
import NewChatModal from './NewChatModal';
import {
  joinConversation,
  leaveConversation,
  sendMessage as socketSendMessage,
  emitTypingStart,
  emitTypingStop,
  markMessagesRead,
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
  const [showGroupSettings, setShowGroupSettings] = useState(false);
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
    if (conversation) {
      fetchMessages(conversation.id);
      joinConversation(conversation.id);
    }

    return () => {
      if (conversation) {
        leaveConversation(conversation.id);
      }
    };
  }, [conversation?.id, fetchMessages]);

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (conversation && user) {
      markMessagesRead(conversation.id, user.id);
      decrementUnreadCount(conversation.id);
    }
  }, [conversation, user, markMessagesRead, decrementUnreadCount]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      <div className="flex-1 flex items-center justify-center h-full p-3" style={{ background: 'var(--background)' }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Start a Conversation</h2>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Choose an option to get started</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowNewChat(true)}
              className="flex flex-col items-center gap-2 p-6 rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}
            >
              <User className="w-8 h-8" style={{ color: 'var(--foreground)' }} />
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>New Chat</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Start 1-on-1 conversation</span>
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex flex-col items-center gap-2 p-6 rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}
            >
              <Users className="w-8 h-8" style={{ color: 'var(--foreground)' }} />
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>Create Group</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Group conversation</span>
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
    <div className="flex-1 flex flex-col h-full p-3" style={{ background: 'var(--background)' }}>
      {/* Header with rounded corners */}
      <div className="rounded-xl p-4 flex items-center gap-4 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-colors lg:hidden"
          style={{ background: 'var(--surface-light)' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
        </button>
        {isGroup ? (
          <button
            onClick={() => setShowGroupSettings(true)}
            className="flex-1 flex items-center gap-3 p-2 -m-2 rounded-xl transition-colors"
            style={{ background: 'transparent' }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
              {conversation.groupPhoto ? (
                <img
                  src={`http://localhost:5000${conversation.groupPhoto}`}
                  alt={conversation.groupName || 'Group'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {conversation.groupName?.charAt(0).toUpperCase() || 'G'}
                </span>
              )}
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>{conversation.groupName}</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{conversation.participants.length} members</p>
            </div>
          </button>
        ) : (
          <div className="flex-1 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              <Avatar user={otherUser} size="md" />
            </div>
            <div>
              <h2 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>{otherUser?.name}</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{otherUser?.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area with rounded styling */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {messages.map((message) => {
          const isOwn = message.senderId === user?.id;

          return (
            <div key={message.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && <Avatar user={message.sender} size="sm" />}
              <div
                className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl"
                style={{
                  background: isOwn ? 'var(--surface-light)' : 'var(--surface-light)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                {isGroup && !isOwn && (
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{message.sender?.name}</p>
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
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: 'var(--surface-light)' }}
                      >
                        {getFileIcon(message.attachmentType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{message.attachmentName}</p>
                          {message.attachmentSize && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {formatFileSize(message.attachmentSize)}
                            </p>
                          )}
                        </div>
                      </a>
                    )}
                  </div>
                )}
                {message.content && !isAudio(message.attachmentType) && <p>{message.content}</p>}
                <div className="flex items-center gap-1 justify-end mt-1">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
            <div className="px-4 py-2 rounded-2xl" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <span className="animate-pulse">typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form with rounded styling */}
      <form onSubmit={handleSendMessage} className="p-4 rounded-xl mt-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {selectedFile && (
          <div className="mb-2 p-2 rounded-lg flex items-center gap-2" style={{ background: 'var(--surface-light)' }}>
            {getFileIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{selectedFile.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded"
              style={{ background: 'var(--surface)' }}
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        )}

        {isRecording && (
          <div className="mb-3 p-3 rounded-2xl" style={{ background: 'var(--surface-light)' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--foreground)' }}>
                  <Mic className="w-5 h-5" style={{ color: 'var(--background)' }} />
                </div>
                <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: 'var(--foreground)' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full animate-pulse"
                        style={{
                          background: 'var(--foreground)',
                          height: `${Math.random() * 16 + 8}px`,
                          animationDelay: `${i * 50}ms`,
                          animationDuration: '300ms',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm mt-1 font-medium" style={{ color: 'var(--foreground)' }}>
                  {formatRecordingTime(recordingTime)}
                </p>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
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
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--surface-light)' }}
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
            className="flex-1 px-4 py-2 rounded-xl focus:outline-none"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface-light)',
              color: 'var(--foreground)'
            }}
            disabled={isLoading || uploadingFile || isRecording}
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || uploadingFile}
            className="p-2 rounded-xl transition-colors"
            style={{
              background: 'var(--surface-light)',
              color: 'var(--text-muted)'
            }}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={isLoading || uploadingFile || isRecording || (!newMessage.trim() && !selectedFile)}
            className="px-4 py-2 rounded-xl disabled:opacity-50 transition-colors"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            {uploadingFile ? (
              <span className="text-sm">Uploading...</span>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Group Settings Modal */}
      {showGroupSettings && conversation && (
        <GroupSettingsModal
          isOpen={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          conversation={conversation}
        />
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg w-full max-w-sm p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Delete Group</h2>
            </div>
            <p className="mb-2" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--foreground)' }}>{conversation.groupName}</strong>?
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--danger)' }}>
              This action cannot be undone. All messages will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'var(--surface-light)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                style={{ background: 'var(--danger)', color: 'white' }}
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
