import { useState } from 'react';
import { ThumbsUp, ThumbsDown, BookOpen, RefreshCw, Copy, Share2, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, SourceReference } from '@/types';
import aksaraLogo from '@/assets/aksara-logo.png';
import { SourceCard } from './SourceCard';
import { PdfPreviewModal } from './PdfPreviewModal';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const [previewSource, setPreviewSource] = useState<SourceReference | null>(null);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: message.content });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(message.content);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  if (message.isLoading) {
    return (
      <div className="w-full mb-8">
        <div className="max-w-3xl mx-auto flex items-start gap-4 px-4">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center bg-white shadow-sm">
            <img src={aksaraLogo} alt="AKSARA Logo" className="w-5 h-5 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">AKSARA</p>
            <div className="typing-dots flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="w-full mb-8">
        <div className="max-w-3xl mx-auto flex items-start justify-end gap-3 px-4">
          <div className="max-w-[75%] min-w-0">
            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-right">You</p>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3 text-gray-800 text-base leading-relaxed break-words">
              {message.content}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-sm mt-5">
            AN
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="w-full mb-8">
      <div className="max-w-3xl mx-auto flex items-start gap-4 px-4">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center bg-white shadow-sm mt-1">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-5 h-5 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">AKSARA</p>
          <div className="prose prose-base max-w-none text-gray-800 prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary-dark prose-headings:text-gray-900 prose-strong:text-gray-900 prose-li:my-0 break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>

          {/* Source Citations */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sumber ({message.sources.length})
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {message.sources.map((source, index) => (
                  <SourceCard
                    key={`${source.document_id}-${source.page_number}-${index}`}
                    source={source}
                    onClick={() => setPreviewSource(source)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 mt-3 -ml-1">
            {/* Like */}
            <button
              title="Suka"
              onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
              className={`group relative p-1.5 rounded-md transition-colors ${
                feedback === 'like'
                  ? 'text-emerald-500 bg-emerald-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            {/* Dislike */}
            <button
              title="Tidak suka"
              onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
              className={`group relative p-1.5 rounded-md transition-colors ${
                feedback === 'dislike'
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-200 mx-0.5" />

            {/* Regenerate */}
            <button
              title="Generate ulang"
              onClick={onRegenerate}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors rounded-md"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Copy */}
            <button
              title={copied ? 'Tersalin!' : 'Salin jawaban'}
              onClick={handleCopy}
              className={`p-1.5 rounded-md transition-colors ${
                copied
                  ? 'text-emerald-500 bg-emerald-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Share */}
            <button
              title={shared ? 'Link disalin!' : 'Bagikan'}
              onClick={handleShare}
              className={`p-1.5 rounded-md transition-colors ${
                shared
                  ? 'text-emerald-500 bg-emerald-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewSource && (
        <PdfPreviewModal
          source={previewSource}
          onClose={() => setPreviewSource(null)}
        />
      )}
    </div>
  );
}
