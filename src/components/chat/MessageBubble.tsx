import { Plus, ThumbsUp, ThumbsDown, Link, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.isLoading) {
    return (
      <div className="flex items-start gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 text-white" />
        </div>
        <div className="typing-dots flex items-center gap-1 bg-white rounded-2xl px-5 py-3 shadow-sm">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-3 mb-6 justify-end">
        <div className="max-w-[70%] bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center shrink-0 text-xs font-bold text-white">
          AN
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
        <Plus className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[75%]">
        <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">AKSARA</p>
        <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-gray-100">
          <div className="markdown-content text-sm text-gray-700">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {/* Action Buttons (example - shown on certain messages) */}
          {message.sources && message.sources.length > 0 && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Link className="w-3.5 h-3.5" />
                Go to Intranet Portal
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Download className="w-3.5 h-3.5" />
                Download Guide PDF
              </button>
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="flex items-center gap-2 mt-2 ml-1">
          <button className="text-gray-400 hover:text-primary transition-colors">
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-danger transition-colors">
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
