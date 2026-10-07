import { useState } from 'react';
import { ThumbsUp, ThumbsDown, BookOpen, RefreshCw, Copy, Share2, Check, Paperclip, FileText, Eye, Download, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, SourceReference } from '@/types';
import aksaraLogo from '@/assets/aksara-logo.png';
import { PdfPreviewModal } from './PdfPreviewModal';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  /** The answer is still streaming in: hide actions until it is complete. */
  isStreaming?: boolean;
}

const actionButton = 'p-1.5 rounded-md transition-colors';
const actionIdle = 'text-gray-400 hover:text-gray-700 hover:bg-gray-100';
const actionActive = 'text-primary-ink bg-primary/10';

function AssistantAvatar() {
  return (
    <div className="w-7 h-7 rounded-full shrink-0 border border-gray-200 flex items-center justify-center bg-white">
      <img src={aksaraLogo} alt="" className="w-4.5 h-4.5 object-contain" />
    </div>
  );
}

export function MessageBubble({ message, onRegenerate, isStreaming }: MessageBubbleProps) {
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
      <div className="w-full mb-6">
        <div className="max-w-3xl mx-auto flex items-start gap-3 px-4">
          <AssistantAvatar />
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-gray-900 mb-1.5">AKSARA</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="typing-dots flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              </span>
              Mencari referensi…
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="w-full mb-6">
        <div className="max-w-3xl mx-auto flex justify-end px-4">
          <div className="max-w-[85%] sm:max-w-[75%] min-w-0 bg-primary/10 text-gray-800 rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
            {message.attachmentName && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-ink bg-white/70 rounded-lg px-2.5 py-1.5 border border-primary/15">
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{message.attachmentName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="w-full mb-6">
      <div className="max-w-3xl mx-auto flex items-start gap-3 px-4">
        <AssistantAvatar />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-gray-900 mb-1">AKSARA</p>
          <div className="prose prose-base max-w-none text-gray-800 prose-p:leading-relaxed prose-a:text-primary-ink prose-a:font-medium prose-headings:text-gray-900 prose-strong:text-gray-900 prose-li:my-0 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => {
                  const isFileDownload = props.children && String(props.children).startsWith('FILE_DOWNLOAD:');
                  if (isFileDownload) {
                    const fileName = String(props.children).replace('FILE_DOWNLOAD:', '').trim();
                    const url = props.href || '#';
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="not-prose mt-4 mb-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white shadow-sm hover:shadow-md transition-all group no-underline"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary-ink">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate m-0">
                              {fileName}
                            </p>
                            <p className="text-xs text-primary-ink font-medium mt-0.5 m-0">
                              Dokumen tersedia untuk diunduh
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-primary-dark text-white group-hover:scale-110 transition-transform shadow-sm">
                          <Download className="w-4 h-4" />
                        </div>
                      </a>
                    );
                  }
                  return (
                    <a {...props} target="_blank" rel="noopener noreferrer">
                      {props.children}
                    </a>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Source Citations */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-gray-600">
                  Sumber referensi ({message.sources.length})
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {message.sources.map((source, index) => (
                  <details
                    key={`${source.document_id}-${source.page_number}-${index}`}
                    className="group border border-gray-200 rounded-xl bg-white overflow-hidden [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer list-none hover:bg-gray-50 transition-colors">
                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary-ink text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700 truncate min-w-0 flex-1">
                        {source.file_name}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        Hal. {source.page_number}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pt-2 pb-3 border-t border-gray-100 bg-gray-50/60 text-sm text-gray-600 leading-relaxed">
                      {source.content ? (
                        <div className="whitespace-pre-wrap">{source.content}</div>
                      ) : (
                        <em className="text-gray-400">Teks kutipan tidak tersedia</em>
                      )}

                      {/* Button to open PDF preview modal */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setPreviewSource(source);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-ink bg-primary/10 hover:bg-primary/15 transition-colors px-3 py-1.5 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Lihat halaman asli
                      </button>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isStreaming && (
            <div className="flex items-center gap-0.5 mt-2 -ml-1.5">
              <button
                title="Jawaban membantu"
                aria-label="Jawaban membantu"
                onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
                className={`${actionButton} ${feedback === 'like' ? actionActive : actionIdle}`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>

              <button
                title="Jawaban kurang tepat"
                aria-label="Jawaban kurang tepat"
                onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
                className={`${actionButton} ${feedback === 'dislike' ? 'text-red-500 bg-red-50' : actionIdle}`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1" />

              {onRegenerate && (
                <button
                  title="Buat ulang jawaban"
                  aria-label="Buat ulang jawaban"
                  onClick={onRegenerate}
                  className={`${actionButton} ${actionIdle}`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              <button
                title={copied ? 'Tersalin!' : 'Salin jawaban'}
                aria-label="Salin jawaban"
                onClick={handleCopy}
                className={`${actionButton} ${copied ? actionActive : actionIdle}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                title={shared ? 'Teks disalin!' : 'Bagikan'}
                aria-label="Bagikan jawaban"
                onClick={handleShare}
                className={`${actionButton} ${shared ? actionActive : actionIdle}`}
              >
                {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          )}
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
