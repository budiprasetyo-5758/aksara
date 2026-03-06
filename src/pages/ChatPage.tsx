import { useState, useEffect } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { sendChatMessage } from '@/lib/api';
import type { Message } from '@/types';

function getSessionId(): string {
  let sid = localStorage.getItem('aksara_session_id');
  if (!sid) {
    sid = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('aksara_session_id', sid);
  }
  return sid;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(getSessionId);

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => {
      const filtered = prev.filter((m) => !m.isLoading);
      return [...filtered, userMessage, loadingMessage];
    });

    try {
      const response = await sendChatMessage(content, sessionId);

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
      };

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [...filtered, assistantMessage];
      });
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `⚠️ **Error:** ${error.message || 'Failed to get response from server.'}\n\nPastikan backend sedang berjalan (\`uvicorn main:app --reload --port 8000\`).`,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [...filtered, errorMessage];
      });
    }
  };

  return (
    <div className="flex fixed inset-0 overflow-hidden bg-white">
      <ChatSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <ChatArea messages={messages} onSend={handleSend} />
      </div>
    </div>
  );
}
