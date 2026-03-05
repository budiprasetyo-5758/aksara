import { useRef, useEffect } from 'react';
import { Bell, Settings, HelpCircle } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types';
import aksaraLogo from '@/assets/aksara-logo.png';

interface ChatAreaProps {
  messages: Message[];
}

export function ChatArea({ messages }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Header Bar */}
      <header className="relative z-10 h-14 min-h-[56px] border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-7 h-7 object-contain" />
          <h2 className="text-lg font-bold text-primary">AKSARA Chat</h2>
          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-white py-6">
        {/* Time Divider */}
        <div className="text-center mb-6">
          <span className="text-xs text-gray-400 bg-white px-3">Today, 10:23 AM</span>
        </div>

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
