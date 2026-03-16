import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import aksaraLogo from '@/assets/aksara-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatSession } from '@/types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
}: ChatSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email || 'User';

  // Focus the input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (deletingId === sessionId) {
      onDeleteSession(sessionId);
      setDeletingId(null);
    } else {
      setDeletingId(sessionId);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
    setDeletingId(null);
  };

  const handleConfirmEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editingId && editValue.trim()) {
      onRenameSession(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <aside 
      className={`bg-sidebar-bg border-r border-gray-200 text-gray-800 flex flex-col h-full transition-all duration-300 ${
        isExpanded ? 'w-[260px] min-w-[260px]' : 'w-[72px] min-w-[72px]'
      }`}
    >
      {/* Logo & Toggle */}
      <div className={`px-4 pt-5 pb-3 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} relative`}>
        <div className={`flex items-center gap-2 mb-1 ${!isExpanded && 'hidden'}`}>
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-lg font-bold tracking-wide text-primary">AKSARA</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest -mt-1">
              Asisten Pencarian Sumber Data
            </p>
          </div>
        </div>
        {!isExpanded && (
           <img src={aksaraLogo} alt="AKSARA Logo" className="w-8 h-8 object-contain mb-1" />
        )}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors ${
            !isExpanded && 'absolute -right-3 top-6 bg-white border border-gray-200 shadow-sm z-10'
          }`}
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mb-4 mt-2">
        <button
          onClick={onNewChat}
          className={`bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${isExpanded ? 'w-full px-4' : 'w-12 h-12 mx-auto rounded-xl p-0'}`}
        >
          <Plus className="w-5 h-5" />
          {isExpanded && <span>New Chat</span>}
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 mt-2">
        {isExpanded && sessions.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4 px-2">
            No conversations yet. Start a new chat!
          </p>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => editingId !== session.id && onSelectSession(session.id)}
            className={`w-full group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-150 mb-0.5 ${
              activeSessionId === session.id
                ? 'bg-sidebar-active text-primary font-medium'
                : 'text-gray-600 hover:bg-sidebar-hover'
            } ${!isExpanded && 'justify-center px-0'}`}
          >
            <MessageSquare className={`w-4 h-4 shrink-0 ${
              activeSessionId === session.id ? 'text-primary' : 'text-gray-400'
            }`} />
            {isExpanded && (
              <>
                {editingId === session.id ? (
                  /* Inline edit mode */
                  <div className="flex-1 min-w-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={() => handleConfirmEdit()}
                      className="flex-1 min-w-0 text-[13px] bg-white border border-primary/30 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary text-gray-700"
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleConfirmEdit(e); }}
                      className="p-0.5 text-green-500 hover:bg-green-50 rounded shrink-0"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleCancelEdit(e); }}
                      className="p-0.5 text-gray-400 hover:bg-gray-100 rounded shrink-0"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Normal display mode */
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px]">{session.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(session.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                      <button
                        onClick={(e) => handleStartEdit(e, session)}
                        className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                        title="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        className={`p-1 rounded transition-colors ${
                          deletingId === session.id
                            ? 'text-red-500 bg-red-50 opacity-100'
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={deletingId === session.id ? 'Click again to confirm' : 'Delete session'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* User Profile */}
      <div className={`p-4 border-t border-gray-100 ${!isExpanded && 'flex justify-center flex-col items-center p-3'}`}>
        <div className={`flex items-center ${isExpanded ? 'gap-3' : 'flex-col gap-2'}`}>
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-sm font-bold text-white uppercase shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
            title="Profile Settings"
          >
            {displayName.charAt(0)}
          </button>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{role || 'User'}</p>
            </div>
          )}
          <div className={`flex items-center gap-1 ${!isExpanded && 'flex-col mt-1'}`}>
            <button 
              onClick={() => navigate('/settings')}
              title="Profile Settings"
              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
