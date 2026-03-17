import { useState, useEffect } from 'react';
import { X, FileText, Loader2, ExternalLink, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import type { DocumentSearchResult } from '@/types';
import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface DocumentViewerProps {
  document: DocumentSearchResult;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the PDF through our backend proxy and create a local blob URL
    // This avoids Supabase Storage's x-frame-options restrictions
    let blobUrl: string | null = null;

    async function loadPdf() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(`${API_BASE}/api/documents/${document.id}/view`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(blobUrl);
      } catch (err: any) {
        setError(err.message || 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [document.id]);

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ${isExpanded ? 'absolute inset-0 z-30' : 'relative'}`}>
      {/* Header */}
      <div className="h-14 min-h-[56px] border-b border-gray-200 flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{document.file_name}</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {document.file_type} · {document.total_pages} pages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={document.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Close document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document iframe */}
      <div className="flex-1 relative bg-gray-50 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-gray-400">Loading document...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-gray-600 font-medium">Failed to load document</p>
              <p className="text-xs text-gray-400">{error}</p>
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-2"
              >
                Open in new tab instead →
              </a>
            </div>
          </div>
        )}
        {pdfBlobUrl && (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full border-0"
            title={document.file_name}
          />
        )}
      </div>
    </div>
  );
}
