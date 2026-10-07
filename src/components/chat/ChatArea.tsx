import { useRef, useEffect, useState } from 'react';
import { Pencil, Check, X, FileSearch, Menu, FileText } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { DocumentSearchDialog } from './DocumentSearchDialog';
import type { Message, DocumentSearchResult } from '@/types';
import aksaraLogo from '@/assets/aksara-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { displaySessionTitle } from '@/lib/utils';

interface ChatAreaProps {
  messages: Message[];
  onSend: (message: string, file?: File) => void;
  onRegenerate?: (messageId: string) => void;
  sessionTitle?: string;
  activeSessionId?: string | null;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  onOpenDocument?: (doc: DocumentSearchResult) => void;
  scopedDocumentName?: string;
  /** An answer is being generated for the latest message. */
  isSending?: boolean;
  /** Opens the sidebar drawer on small screens. */
  onOpenSidebar?: () => void;
}

function formatConversationDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ChatArea({
  messages,
  onSend,
  onRegenerate,
  sessionTitle,
  activeSessionId,
  onRenameSession,
  onOpenDocument,
  scopedDocumentName,
  isSending,
  onOpenSidebar,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const editTitleInputRef = useRef<HTMLInputElement>(null);

  const title = displaySessionTitle(sessionTitle);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

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
    setEditTitleValue(title);
    setIsEditingTitle(true);
  };

  const handleConfirmEditTitle = () => {
    const newTitle = editTitleValue.trim();
    // Comparing against the displayed title keeps "New Chat" (and its auto-naming) intact
    if (activeSessionId && onRenameSession && newTitle && newTitle !== title) {
      onRenameSession(activeSessionId, newTitle);
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
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
      {/* Header Bar */}
      <header className="h-14 min-h-[56px] border-b border-gray-200 bg-white flex items-center justify-between gap-3 px-3 sm:px-5 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="md:hidden p-2 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                ref={editTitleInputRef}
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={handleEditTitleKeyDown}
                onBlur={handleConfirmEditTitle}
                className="text-[15px] font-semibold text-gray-800 bg-white border border-primary/40 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 max-w-full"
                aria-label="Judul percakapan"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); handleConfirmEditTitle(); }}
                className="p-1 text-primary-ink hover:bg-primary/10 rounded-md"
                title="Simpan"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleCancelEditTitle(); }}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded-md"
                title="Batal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group min-w-0">
              <h2 className="text-[15px] font-semibold text-gray-800 truncate">{title}</h2>
              {activeSessionId && onRenameSession && (
                <button
                  onClick={handleStartEditTitle}
                  className="p-1.5 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all shrink-0"
                  title="Ubah judul"
                  aria-label="Ubah judul percakapan"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Scoped document indicator */}
          {scopedDocumentName && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1 px-2.5 py-1 bg-primary/10 rounded-full min-w-0">
              <FileSearch className="w-3.5 h-3.5 text-primary-ink shrink-0" />
              <span className="text-xs font-medium text-primary-ink truncate max-w-[180px]">
                {scopedDocumentName}
              </span>
            </div>
          )}
        </div>

        {onOpenDocument && (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0"
            title="Cari dan buka dokumen"
          >
            <FileSearch className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Cari Dokumen</span>
          </button>
        )}
      </header>

      {/*
        Body keeps the same element order in both states ([content][composer]) so the
        composer is never remounted when it moves from the centre to the bottom.
      */}
      <div className={`flex-1 flex flex-col min-h-0 ${isEmpty ? 'justify-center overflow-y-auto' : ''}`}>
        <div className={isEmpty ? 'shrink-0 px-6 pt-8' : 'flex-1 overflow-y-auto'}>
          {isEmpty ? (
            scopedDocumentName ? (
              /* Empty state inside the document workspace */
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary-ink" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Tanyakan apa saja tentang dokumen ini</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-sm break-words">
                  Jawaban AKSARA akan difokuskan pada <span className="font-medium text-gray-700">{scopedDocumentName}</span>.
                </p>
              </div>
            ) : (
              /* Empty state: greeting above the centred prompt */
              <div className="flex flex-col items-center text-center">
                <img src={aksaraLogo} alt="AKSARA" className="w-12 h-12 object-contain mb-5" />
                <h2 className="text-2xl font-semibold text-gray-900">
                  {firstName ? `Halo, ${firstName}` : 'Halo'}
                </h2>
                <p className="text-gray-500 mt-1">Apa yang ingin Anda cari hari ini?</p>
              </div>
            )
          ) : (
            <div className="pt-6 pb-2">
              {/* Date of the first message in this conversation */}
              <div className="text-center mb-6">
                <span className="text-xs text-gray-400">{formatConversationDate(messages[0].timestamp)}</span>
              </div>

              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={isSending && index === messages.length - 1}
                  onRegenerate={message.role === 'assistant' && onRegenerate ? () => onRegenerate(message.id) : undefined}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer: centred under the greeting when empty, docked at the bottom otherwise */}
        <div className={`shrink-0 px-3 sm:px-6 ${isEmpty ? 'pt-8 pb-[12vh]' : 'pt-1 pb-3'}`}>
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={onSend}
              disabled={isSending}
              placeholder={scopedDocumentName ? 'Tanyakan tentang dokumen ini…' : undefined}
            />
            <p className="text-center text-[11px] text-gray-400 mt-2 px-4">
              AKSARA dapat keliru. Selalu verifikasi dengan protokol internal RSCM.
            </p>
          </div>
        </div>
      </div>

      {isSearchOpen && onOpenDocument && (
        <DocumentSearchDialog
          onSelectDocument={onOpenDocument}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
}
