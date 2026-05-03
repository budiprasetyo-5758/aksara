import { useState, useEffect, useCallback } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { DocumentWorkspace } from '@/components/chat/DocumentWorkspace';
import {
  sendChatMessage,
  sendChatMessageStream,
  sendChatMessageMultimodal,
  fetchSessions,
  createSession,
  deleteSession,
  renameSession,
  fetchSessionMessages,
} from '@/lib/api';
import type { Message, ChatSession, DocumentSearchResult } from '@/types';

// Simple memory cache to prevent reload delays when switching menus
let cachedSessions: ChatSession[] | null = null;
let cachedActiveSessionId: string | null = null;
let cachedMessages: Record<string, Message[]> = {};
let cachedActiveDocument: DocumentSearchResult | null = null;

export function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(cachedSessions || []);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(cachedActiveSessionId);
  const [messages, setMessages] = useState<Message[]>(
    cachedActiveSessionId && cachedMessages[cachedActiveSessionId] ? cachedMessages[cachedActiveSessionId] : []
  );
  const [activeDocument, setActiveDocument] = useState<DocumentSearchResult | null>(cachedActiveDocument);

  // ── Sync cache with state ──────────────────────────────
  useEffect(() => { cachedSessions = sessions; }, [sessions]);
  useEffect(() => { cachedActiveSessionId = activeSessionId; }, [activeSessionId]);
  useEffect(() => { if (activeSessionId) cachedMessages[activeSessionId] = messages; }, [activeSessionId, messages]);
  useEffect(() => { cachedActiveDocument = activeDocument; }, [activeDocument]);

  // ── Load sessions on mount ────────────────────────────
  useEffect(() => {
    if (!cachedSessions) {
      loadSessions();
    } else {
      // Background sync to ensure data is fresh
      fetchSessions().then((data) => setSessions(data)).catch(console.error);
    }
  }, []);

  const loadSessions = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);

      // Auto-select the most recent session if none is active
      if (data.length > 0 && !cachedActiveSessionId) {
        setActiveSessionId(data[0].id);
        await loadMessages(data[0].id);
      }
    } catch (error) {
      console.error('[ChatPage] Failed to load sessions:', error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const data = await fetchSessionMessages(sessionId);
      const mapped: Message[] = data.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
        sources: m.sources,
        attachmentName: m.attachment_name,
      }));
      setMessages(mapped);
      cachedMessages[sessionId] = mapped; // Update cache immediately
    } catch (error) {
      console.error('[ChatPage] Failed to load messages:', error);
      setMessages([]);
    }
  };

  // ── Handlers ──────────────────────────────────────────
  const handleNewChat = useCallback(async () => {
    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setActiveDocument(null); // Reset workspace on new chat
    } catch (error) {
      console.error('[ChatPage] Failed to create session:', error);
    }
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setActiveDocument(null); // Reset workspace when switching sessions

    // Use cache immediately if available to prevent delay
    if (cachedMessages[sessionId]) {
      setMessages(cachedMessages[sessionId]);
    } else {
      setMessages([]); // Or keep previous briefly while loading
    }

    await loadMessages(sessionId);
  }, [activeSessionId]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    // ── Optimistic UI: update state immediately, revert on error ──
    const previousSessions = sessions;
    const previousActiveId = activeSessionId;
    const previousMessages = messages;

    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);

    if (activeSessionId === sessionId) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        loadMessages(remaining[0].id);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
      setActiveDocument(null);
    }

    try {
      await deleteSession(sessionId);
    } catch (error) {
      // Revert on failure
      console.error('[ChatPage] Failed to delete session:', error);
      setSessions(previousSessions);
      setActiveSessionId(previousActiveId);
      setMessages(previousMessages);
    }
  }, [activeSessionId, sessions, messages]);

  const handleRenameSession = useCallback(async (sessionId: string, newTitle: string) => {
    try {
      const updated = await renameSession(sessionId, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s))
      );
    } catch (error) {
      console.error('[ChatPage] Failed to rename session:', error);
    }
  }, []);

  const handleOpenDocument = useCallback((doc: DocumentSearchResult) => {
    setActiveDocument(doc);
  }, []);

  const handleCloseDocument = useCallback(() => {
    setActiveDocument(null);
  }, []);

  const handleSend = async (content: string, file?: File) => {
    // If no active session, create one first
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const newSession = await createSession();
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        sessionId = newSession.id;
      } catch (error) {
        console.error('[ChatPage] Failed to create session:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content || (file ? `📎 ${file.name}` : ''),
      timestamp: new Date(),
      attachmentName: file?.name,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: assistantMessageId,
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
      const documentId = activeDocument?.id;

      if (file) {
        // Multimodal: non-streaming (different model/path)
        const response = await sendChatMessageMultimodal(content, sessionId, file);

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
      } else {
        // Text chat: use streaming for progressive token rendering
        try {
          const response = await sendChatMessageStream(
            content,
            sessionId,
            // onToken: progressively update the assistant message content
            (token) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + token, isLoading: false }
                    : m
                )
              );
            },
            // onSources: attach sources as soon as they arrive
            (sources) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, sources } : m
                )
              );
            },
            documentId,
          );

          // Final update with complete answer (ensures consistency)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: response.answer, sources: response.sources, isLoading: false }
                : m
            )
          );
        } catch {
          // Fallback to non-streaming on error
          const response = await sendChatMessage(content, sessionId, documentId);
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
        }
      }

      // Refresh sessions to pick up title update
      const updatedSessions = await fetchSessions();
      setSessions(updatedSessions);
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

  // Get active session title
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="flex fixed inset-0 overflow-hidden bg-white">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {activeDocument ? (
          <DocumentWorkspace
            document={activeDocument}
            messages={messages}
            onSend={handleSend}
            onClose={handleCloseDocument}
            sessionTitle={activeSession?.title || 'New Chat'}
            activeSessionId={activeSessionId}
            onRenameSession={handleRenameSession}
          />
        ) : (
          <ChatArea
            messages={messages}
            onSend={handleSend}
            sessionTitle={activeSession?.title || 'New Chat'}
            activeSessionId={activeSessionId}
            onRenameSession={handleRenameSession}
            onOpenDocument={handleOpenDocument}
          />
        )}
      </div>
    </div>
  );
}
