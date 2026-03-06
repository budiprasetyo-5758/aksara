import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
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
    content: `To request access to the patient database for a new resident, please follow these steps defined in the IT Policy:

1. Log in to the **Intranet Portal**.
2. Navigate to the **IT Services** section.
3. Select the '**System Access Request Form**'.
4. Fill in the resident's details and select 'EMR Access' under system type.

> *Note: Approval from the department head is required and usually takes 1-2 business days.*`,
    timestamp: new Date(),
    sources: [
      {
        document_id: '1',
        file_name: 'IT_Policy_RSCM.pdf',
        page_number: 12,
        bbox: { x: 72, y: 340, width: 468, height: 120 },
        snippet: 'Untuk mengajukan akses sistem EMR, staf harus mengisi formulir System Access Request melalui Intranet Portal...',
      },
      {
        document_id: '2',
        file_name: 'SOP_Pendaftaran_Residen.pdf',
        page_number: 5,
        bbox: { x: 72, y: 200, width: 468, height: 80 },
        snippet: 'Proses pendaftaran residen baru memerlukan persetujuan kepala departemen dan estimasi waktu 1-2 hari kerja...',
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
              'Berikut adalah tautan langsung ke **System Access Request Form**:\n\n[https://intranet.hospital.com/it-services/access-request](https://intranet.hospital.com/it-services/access-request)\n\nSilakan login terlebih dahulu dengan kredensial Anda sebelum mengakses formulir tersebut.',
            timestamp: new Date(),
          },
        ];
      });
    }, 2000);
  };

  const handleRegenerate = (messageId: string) => {
    setMessages((prev) => {
      // Find the assistant message to regenerate
      const msgIndex = prev.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return prev;

      // Replace it with a loading message
      const loadingMessage: Message = {
        id: messageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      const updated = [...prev];
      updated[msgIndex] = loadingMessage;
      return updated;
    });

    // Simulate regenerated response
    setTimeout(() => {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content:
                  'Berikut adalah tautan langsung ke **System Access Request Form**:\n\n[https://intranet.hospital.com/it-services/access-request](https://intranet.hospital.com/it-services/access-request)\n\nSilakan login terlebih dahulu dengan kredensial Anda sebelum mengakses formulir tersebut.',
                isLoading: false,
                timestamp: new Date(),
              }
            : m
        );
        return updated;
      });
    }, 2000);
  };

  return (
    <div className="flex fixed inset-0 overflow-hidden bg-white">
      <ChatSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <ChatArea messages={messages} onSend={handleSend} onRegenerate={handleRegenerate} />
      </div>
    </div>
  );
}
