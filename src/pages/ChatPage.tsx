import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { ChatInput } from '@/components/chat/ChatInput';
import type { Message } from '@/types';

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'How do I request access to the patient database for the new resident?',
    timestamp: new Date(),
  },
  {
    id: '2',
    role: 'assistant',
    content: `To request access to the patient database for a new resident, please follow these steps defined in the RSCM IT Policy:

1. Log in to the **Intranet Portal**.
2. Navigate to the **IT Services** section.
3. Select the '**System Access Request Form**'.
4. Fill in the resident's details and select 'EMR Access' under system type.

> *Note: Approval from the department head is required and usually takes 1-2 business days.*`,
    timestamp: new Date(),
    sources: [
      {
        document_id: '1',
        file_name: 'RSCM_IT_Policy.pdf',
        page_number: 12,
        bbox: { x: 0, y: 0, width: 100, height: 50 },
        snippet: 'System Access Request Form...',
      },
    ],
  },
  {
    id: '3',
    role: 'user',
    content: 'Can you send me the link directly?',
    timestamp: new Date(),
  },
  {
    id: '4',
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isLoading: true,
  },
];

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const handleSend = (content: string) => {
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
      // Remove any existing loading message
      const filtered = prev.filter((m) => !m.isLoading);
      return [...filtered, userMessage, loadingMessage];
    });

    // Simulate response
    setTimeout(() => {
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [
          ...filtered,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content:
              'Berikut adalah tautan langsung ke **System Access Request Form**:\n\n[https://intranet.rscm.co.id/it-services/access-request](https://intranet.rscm.co.id/it-services/access-request)\n\nSilakan login terlebih dahulu dengan kredensial RSCM Anda sebelum mengakses formulir tersebut.',
            timestamp: new Date(),
          },
        ];
      });
    }, 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea messages={messages} />
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
