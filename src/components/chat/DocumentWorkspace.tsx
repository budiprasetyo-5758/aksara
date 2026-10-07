import { DocumentViewer } from './DocumentViewer';
import { ChatArea } from './ChatArea';
import type { Message, DocumentSearchResult } from '@/types';

interface DocumentWorkspaceProps {
  document: DocumentSearchResult;
  messages: Message[];
  onSend: (message: string, file?: File) => void;
  onClose: () => void;
  sessionTitle?: string;
  activeSessionId?: string | null;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  isSending?: boolean;
  onOpenSidebar?: () => void;
}

export function DocumentWorkspace({
  document,
  messages,
  onSend,
  onClose,
  sessionTitle,
  activeSessionId,
  onRenameSession,
  isSending,
  onOpenSidebar,
}: DocumentWorkspaceProps) {
  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
      {/* Document Viewer: top below lg, left on wide screens */}
      <div className="h-[45%] lg:h-full lg:w-1/2 min-w-0 min-h-0 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200">
        <DocumentViewer document={document} onClose={onClose} />
      </div>

      {/* Chat Area */}
      <div className="flex-1 lg:w-1/2 min-w-0 min-h-0 flex flex-col relative">
        <ChatArea
          messages={messages}
          onSend={onSend}
          sessionTitle={sessionTitle}
          activeSessionId={activeSessionId}
          onRenameSession={onRenameSession}
          scopedDocumentName={document.file_name}
          isSending={isSending}
          onOpenSidebar={onOpenSidebar}
        />
      </div>
    </div>
  );
}
