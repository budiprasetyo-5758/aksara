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
}

export function DocumentWorkspace({
  document,
  messages,
  onSend,
  onClose,
  sessionTitle,
  activeSessionId,
  onRenameSession,
}: DocumentWorkspaceProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left: Document Viewer */}
      <div className="w-1/2 h-full min-w-0 shrink-0">
        <DocumentViewer document={document} onClose={onClose} />
      </div>

      {/* Right: Chat Area */}
      <div className="w-1/2 h-full min-w-0 flex flex-col relative">
        <ChatArea
          messages={messages}
          onSend={onSend}
          sessionTitle={sessionTitle}
          activeSessionId={activeSessionId}
          onRenameSession={onRenameSession}
          scopedDocumentName={document.file_name}
        />
      </div>
    </div>
  );
}
