import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DocumentSearch } from './DocumentSearch';
import type { DocumentSearchResult } from '@/types';

interface DocumentSearchDialogProps {
  onSelectDocument: (doc: DocumentSearchResult) => void;
  onClose: () => void;
}

/** Command-palette style dialog for opening a document beside the chat. */
export function DocumentSearchDialog({ onSelectDocument, onClose }: DocumentSearchDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-search-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ animation: 'dialogIn 0.15s ease-out' }}
      >
        <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-1">
          <div>
            <h2 id="document-search-title" className="text-sm font-semibold text-gray-900">
              Buka dokumen
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Dokumen akan tampil berdampingan dengan chat, dan pertanyaan Anda difokuskan ke dokumen tersebut.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <DocumentSearch
          onSelectDocument={(doc) => {
            onClose();
            onSelectDocument(doc);
          }}
        />
      </div>
    </div>
  );
}
