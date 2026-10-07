import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Settings,
  LogOut,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ChevronsUpDown,
} from 'lucide-react';
import aksaraLogo from '@/assets/aksara-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { displaySessionTitle } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';
import type { ChatSession } from '@/types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  /** Drawer state on small screens (below md). */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const GROUP_ORDER = ['Hari ini', 'Kemarin', '7 hari terakhir', '30 hari terakhir', 'Lebih lama'] as const;
type GroupLabel = (typeof GROUP_ORDER)[number];

function getGroupLabel(dateStr: string, today: Date): GroupLabel {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(today) - startOfDay(new Date(dateStr))) / 86_400_000);
  if (days <= 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  if (days < 7) return '7 hari terakhir';
  if (days < 30) return '30 hari terakhir';
  return 'Lebih lama';
}

function groupSessions(sessions: ChatSession[]): { label: GroupLabel; sessions: ChatSession[] }[] {
  const today = new Date();
  const byLabel = new Map<GroupLabel, ChatSession[]>();
  for (const session of sessions) {
    const label = getGroupLabel(session.created_at, today);
    byLabel.set(label, [...(byLabel.get(label) ?? []), session]);
  }
  return GROUP_ORDER.filter((label) => byLabel.has(label)).map((label) => ({
    label,
    sessions: byLabel.get(label)!,
  }));
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  mobileOpen,
  onMobileClose,
}: ChatSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email || 'Pengguna';
  // The mobile drawer always shows the full sidebar; the icon rail is desktop-only
  const compact = !isExpanded && !mobileOpen;

  // Focus the input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close the profile menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleSelect = (sessionId: string) => {
    onSelectSession(sessionId);
    onMobileClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onMobileClose();
  };

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
    setEditValue(displaySessionTitle(session.title));
    setDeletingId(null);
  };

  const handleConfirmEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const original = sessions.find((s) => s.id === editingId);
    const newTitle = editValue.trim();
    // Comparing against the displayed title keeps "New Chat" (and its auto-naming) intact
    if (editingId && newTitle && newTitle !== displaySessionTitle(original?.title)) {
      onRenameSession(editingId, newTitle);
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

  const goTo = (path: string) => {
    setMenuOpen(false);
    onMobileClose();
    navigate(path);
  };

  const menuItemClass =
    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors';

  const renderSession = (session: ChatSession) => {
    const isActive = activeSessionId === session.id;
    const isArmed = deletingId === session.id;

    return (
      <div
        key={session.id}
        onClick={() => editingId !== session.id && handleSelect(session.id)}
        className={`group flex items-center gap-1 pl-3 pr-1.5 py-2 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-sidebar-active text-primary-ink font-medium'
            : 'text-gray-700 hover:bg-sidebar-hover'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
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
              className="flex-1 min-w-0 text-[13px] bg-white border border-primary/40 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
              aria-label="Judul percakapan"
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); handleConfirmEdit(e); }}
              className="p-0.5 text-primary-ink hover:bg-primary/10 rounded shrink-0"
              title="Simpan"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); handleCancelEdit(e); }}
              className="p-0.5 text-gray-400 hover:bg-gray-100 rounded shrink-0"
              title="Batal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Normal display mode */
          <>
            <span className="flex-1 min-w-0 truncate text-[13px]">{displaySessionTitle(session.title)}</span>
            <div
              className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                isArmed
                  ? 'opacity-100'
                  : `opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${isActive ? 'max-md:opacity-100' : ''}`
              }`}
            >
              {!isArmed && (
                <button
                  onClick={(e) => handleStartEdit(e, session)}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-white/80 transition-colors"
                  title="Ubah judul"
                  aria-label="Ubah judul percakapan"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className={`rounded transition-colors ${
                  isArmed
                    ? 'flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-red-600 bg-red-50'
                    : 'p-1 text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
                title={isArmed ? 'Klik sekali lagi untuk menghapus' : 'Hapus percakapan'}
                aria-label={isArmed ? 'Konfirmasi hapus percakapan' : 'Hapus percakapan'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isArmed && 'Hapus?'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] shrink-0 bg-sidebar-bg border-r border-gray-200 text-gray-800 flex flex-col h-full transition-[transform,width] duration-200 md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        } ${compact ? 'md:w-16' : ''}`}
        aria-label="Sidebar"
      >
        {/* Logo & Toggle */}
        <div className={`h-14 flex items-center shrink-0 ${compact ? 'justify-center' : 'justify-between pl-4 pr-2'}`}>
          {compact ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="group relative w-10 h-10 rounded-lg flex items-center justify-center hover:bg-sidebar-hover transition-colors"
              title="Buka sidebar"
              aria-label="Buka sidebar"
            >
              <img src={aksaraLogo} alt="AKSARA" className="w-7 h-7 object-contain transition-opacity group-hover:opacity-0" />
              <PanelLeftOpen className="w-5 h-5 text-gray-600 absolute opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <img src={aksaraLogo} alt="AKSARA Logo" className="w-8 h-8 object-contain shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-base font-bold tracking-wide text-primary leading-tight">AKSARA</h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">
                    Asisten Pencarian Sumber Data
                  </p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-sidebar-hover rounded-lg transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="hidden md:flex p-1.5 text-gray-400 hover:text-gray-700 hover:bg-sidebar-hover rounded-lg transition-colors"
                title="Ciutkan sidebar"
                aria-label="Ciutkan sidebar"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* New Chat Button */}
        <div className={`px-3 pt-1 pb-2 ${compact ? 'flex justify-center' : ''}`}>
          <button
            onClick={handleNewChat}
            className={`bg-primary-dark hover:bg-primary-ink text-white rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              compact ? 'w-10 h-10' : 'w-full py-2.5 px-4'
            }`}
            title="Percakapan baru"
          >
            <Plus className="w-4.5 h-4.5" />
            {!compact && <span>Percakapan baru</span>}
          </button>
        </div>

        {/* Sessions List */}
        {compact ? (
          <div className="flex-1" />
        ) : (
          <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Riwayat percakapan">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-6 px-4">
                Belum ada percakapan. Mulai dengan menekan "Percakapan baru".
              </p>
            )}
            {groupSessions(sessions).map((group) => (
              <div key={group.label} className="mt-3 first:mt-1">
                <p className="px-3 pb-1 text-[11px] font-medium text-gray-400">{group.label}</p>
                <div className="space-y-0.5">{group.sessions.map(renderSession)}</div>
              </div>
            ))}
          </nav>
        )}

        {/* User Profile + Menu */}
        <div ref={menuRef} className="relative p-2 border-t border-gray-200/70 shrink-0">
          {menuOpen && (
            <div
              role="menu"
              className={`absolute bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-1 ${
                compact ? 'left-2 w-60' : 'left-2 right-2'
              }`}
              style={{ animation: 'dialogIn 0.12s ease-out' }}
            >
              <div className="px-3 py-2 mb-1 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button role="menuitem" onClick={() => goTo('/settings')} className={menuItemClass}>
                <Settings className="w-4 h-4 text-gray-500" />
                Pengaturan profil
              </button>
              {role === 'admin' && (
                <button role="menuitem" onClick={() => goTo('/admin')} className={menuItemClass}>
                  <Shield className="w-4 h-4 text-gray-500" />
                  Dashboard admin
                </button>
              )}
              <div className="my-1 h-px bg-gray-100" />
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className={`${menuItemClass} text-red-600 hover:bg-red-50`}
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`w-full flex items-center gap-3 rounded-lg hover:bg-sidebar-hover transition-colors ${
              compact ? 'justify-center p-1.5' : 'px-2 py-2'
            }`}
            title={compact ? displayName : undefined}
          >
            <UserAvatar size="sm" />
            {!compact && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
                    {role === 'admin' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-ink bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0" />
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
