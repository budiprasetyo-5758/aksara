import { useState, useRef, useEffect } from 'react';
import { X, FileText, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import type { SourceReference } from '@/types';

interface PdfPreviewModalProps {
  source: SourceReference;
  onClose: () => void;
}

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function PdfPreviewModal({ source, onClose }: PdfPreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch page image from backend
    const fetchImage = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const url = `${API_BASE}/api/documents/${source.document_id}/page/${source.page_number}/image`;
        const response = await fetch(url, { headers });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Unauthorized (403). Session mungkin kedaluwarsa.`);
          }
          throw new Error(`Failed to load page image (${response.status})`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err: any) {
        setError(err.message || 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [source.document_id, source.page_number]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // Calculate highlight position relative to the rendered image
  const renderHighlight = () => {
    if (!imageDimensions.width || !imageDimensions.height) return null;
    if (!source.bbox || (source.bbox.x === 0 && source.bbox.y === 0 && source.bbox.width === 0)) return null;

    // bbox values are in PDF coordinates (points, where 1 point = 1/72 inch)
    // The image was rendered at 2x, so PDF page at 72 DPI → image at 144 DPI
    // Scale factor: image pixels / PDF points = 2.0
    const scale = 2.0 * zoom;

    return (
      <div
        className="absolute border-2 border-yellow-400 bg-yellow-300/20 rounded-sm pointer-events-none animate-pulse"
        style={{
          left: `${source.bbox.x * scale}px`,
          top: `${source.bbox.y * scale}px`,
          width: `${source.bbox.width * scale}px`,
          height: `${source.bbox.height * scale}px`,
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{source.file_name}</h3>
              <p className="text-xs text-gray-500">Halaman {source.page_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-4"
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading page preview...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileText className="w-8 h-8 mb-3" />
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1 text-gray-300">Backend mungkin belum aktif untuk endpoint ini</p>
            </div>
          )}

          {imageUrl && !loading && (
            <div className="relative inline-block shadow-lg rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={`${source.file_name} — Page ${source.page_number}`}
                onLoad={handleImageLoad}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                className="block max-w-none"
              />
              {renderHighlight()}
            </div>
          )}
        </div>

        {/* Footer — Snippet */}
        {source.content && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <p className="text-xs text-gray-500 font-medium mb-1">Kutipan Sumber:</p>
            <div className="text-sm text-gray-700 leading-relaxed italic max-h-32 overflow-y-auto pr-2">
              "{source.content}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
