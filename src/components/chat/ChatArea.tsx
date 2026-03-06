import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { Message } from '@/types';
import aksaraLogo from '@/assets/aksara-logo.png';
import { useAuth } from '@/contexts/AuthContext';

interface ChatAreaProps {
  messages: Message[];
  onSend: (message: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function ChatArea({ messages, onSend, onRegenerate }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { role } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Header Bar */}
      <header className="relative z-10 h-14 min-h-[56px] border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-7 h-7 object-contain" />
          <h2 className="text-lg font-bold text-primary">AKSARA</h2>
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-white py-6">
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
