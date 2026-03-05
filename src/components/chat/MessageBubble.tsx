import { ThumbsUp, ThumbsDown, Link, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types';
import aksaraLogo from '@/assets/aksara-logo.png';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
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
        <div className="max-w-3xl mx-auto flex items-start gap-4 px-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-sm mt-1">
            AN
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">You</p>
            <div className="text-gray-800 text-base leading-relaxed break-words">
              {message.content}
            </div>
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

          {/* Action Buttons */}
          {message.sources && message.sources.length > 0 && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Link className="w-3.5 h-3.5" />
                Go to Intranet Portal
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Download className="w-3.5 h-3.5" />
                Download Guide PDF
              </button>
            </div>
          )}

          {/* Feedback */}
          <div className="flex items-center gap-2 mt-3 -ml-1">
            <button className="p-1 text-gray-400 hover:text-primary transition-colors rounded">
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-danger transition-colors rounded">
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
