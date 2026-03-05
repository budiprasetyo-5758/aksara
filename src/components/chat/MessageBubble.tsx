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
      <div className="flex items-start gap-3 mb-6">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center bg-white shadow-sm">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-5 h-5 object-contain" />
        </div>
        <div className="typing-dots flex items-center gap-1 bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100 w-fit">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-3 mb-6 justify-end w-full">
        <div className="flex flex-col items-end max-w-[70%]">
          <div className="bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm w-fit inline-block text-left break-words">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center shrink-0 text-xs font-bold text-white shadow-sm z-10">
          AN
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3 mb-6 w-full">
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center bg-white shadow-sm z-10 mt-1">
        <img src={aksaraLogo} alt="AKSARA Logo" className="w-5 h-5 object-contain" />
      </div>
      <div className="max-w-[80%] flex flex-col items-start">
        <p className="text-xs font-bold text-primary mb-1 ml-1 uppercase tracking-wider">AKSARA</p>
        <div className="bg-white rounded-2xl rounded-tl-sm px-6 py-5 shadow-sm border border-gray-100 w-fit text-left">
          <div className="prose prose-sm max-w-none text-gray-700 prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary-dark prose-headings:text-gray-900 prose-strong:text-gray-900 prose-li:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
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
