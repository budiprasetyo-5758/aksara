import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Pencil, Check, X, FileSearch } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { DocumentSearch } from './DocumentSearch';
import type { Message, DocumentSearchResult } from '@/types';
import aksaraLogo from '@/assets/aksara-logo.png';
import { useAuth } from '@/contexts/AuthContext';

interface ChatAreaProps {
  messages: Message[];
  onSend: (message: string, file?: File) => void;
  onRegenerate?: (messageId: string) => void;
  sessionTitle?: string;
  activeSessionId?: string | null;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  onOpenDocument?: (doc: DocumentSearchResult) => void;
  scopedDocumentName?: string;
}

export function ChatArea({ messages, onSend, onRegenerate, sessionTitle, activeSessionId, onRenameSession, onOpenDocument, scopedDocumentName }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { role } = useAuth();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const editTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isEditingTitle && editTitleInputRef.current) {
      editTitleInputRef.current.focus();
      editTitleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleStartEditTitle = () => {
    if (!activeSessionId || !onRenameSession) return;
    setEditTitleValue(sessionTitle || 'New Chat');
    setIsEditingTitle(true);
  };

  const handleConfirmEditTitle = () => {
    if (activeSessionId && onRenameSession && editTitleValue.trim() && editTitleValue.trim() !== sessionTitle) {
      onRenameSession(activeSessionId, editTitleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditTitleValue('');
  };

  const handleEditTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmEditTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Header Bar */}
      <header className="relative z-10 h-14 min-h-[56px] border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-7 h-7 object-contain" />
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={editTitleInputRef}
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={handleEditTitleKeyDown}
                onBlur={handleConfirmEditTitle}
                className="text-lg font-bold text-gray-700 bg-white border border-primary/30 rounded px-2 py-0.5 focus:outline-none focus:border-primary w-64 max-w-full"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); handleConfirmEditTitle(); }}
                className="p-1 text-green-500 hover:bg-green-50 rounded"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleCancelEditTitle(); }}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-lg font-bold text-primary truncate max-w-xs">{sessionTitle || 'AKSARA'}</h2>
              {activeSessionId && onRenameSession && (
                <button
                  onClick={handleStartEditTitle}
                  className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-md transition-all shrink-0"
                  title="Rename session"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Scoped document indicator */}
          {scopedDocumentName && (
            <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-primary/5 border border-primary/20 rounded-full">
              <FileSearch className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary truncate max-w-[160px]">
                {scopedDocumentName}
              </span>
            </div>
          )}
        </div>
        
        {role === 'admin' && (
          <div className="flex items-center gap-2">
            <Link 
              to="/admin"
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Shield className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Admin Dashboard</span>
            </Link>
          </div>
        )}
      </header>

      {/* Messages Area or Empty State */}
      <div className="flex-1 overflow-y-auto bg-white py-6">
        {isEmpty && !scopedDocumentName ? (
          /* Empty state with document search */
          <div className="flex flex-col items-center justify-center h-full px-4">
            <img src={aksaraLogo} alt="AKSARA" className="w-16 h-16 object-contain mb-4 opacity-80" />
            <h2 className="text-xl font-bold text-gray-700 mb-1">AKSARA RSCM</h2>
            <p className="text-sm text-gray-400 mb-8 text-center max-w-md">
              Search for a document to open it alongside the chat, or just type a question below.
            </p>
            {onOpenDocument && (
              <DocumentSearch onSelectDocument={onOpenDocument} />
            )}
          </div>
        ) : (
          <>
            {/* Time Divider */}
            <div className="text-center mb-6">
              <span className="text-xs text-gray-400 bg-white px-3">Today, 10:23 AM</span>
            </div>

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={message.role === 'assistant' && onRegenerate ? () => onRegenerate(message.id) : undefined}
              />
            ))}
            {/* Spacer to prevent input from hiding the last message */}
            <div className="h-24 shrink-0" />
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-6 left-0 right-0 px-6 pointer-events-none flex justify-center">
        <div className="max-w-3xl w-full pointer-events-auto">
          <ChatInput onSend={onSend} />
        </div>
      </div>
    </div>
  );
}
