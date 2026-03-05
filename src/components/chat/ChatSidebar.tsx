import { useState } from 'react';
import {
  Plus,
  FileText,
  Ticket,
  ClipboardList,
  Calendar,
  FileCheck,
  MoreVertical,
} from 'lucide-react';
import aksaraLogo from '@/assets/aksara-logo.png';
import type { ChatSession } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const mockSessions: ChatSession[] = [
  { id: '1', title: 'HR Policy Inquiry', icon: 'document', category: 'recent', color: '#2A9D8F', updatedAt: new Date() },
  { id: '2', title: 'IT Support Ticket #402', icon: 'ticket', category: 'recent', updatedAt: new Date() },
  { id: '3', title: 'Medical Records Access', icon: 'document', category: 'recent', updatedAt: new Date() },
  { id: '4', title: 'Shift Schedule', icon: 'schedule', category: 'tools', updatedAt: new Date() },
  { id: '5', title: 'RSCM Protocols', icon: 'protocol', category: 'tools', updatedAt: new Date() },
];

const iconMap = {
  document: FileText,
  ticket: Ticket,
  medical: ClipboardList,
  schedule: Calendar,
  protocol: FileCheck,
};

export function ChatSidebar() {
  const [activeId, setActiveId] = useState('1');
  const { user, role, signOut } = useAuth();

  const recentItems = mockSessions.filter((s) => s.category === 'recent');
  const toolItems = mockSessions.filter((s) => s.category === 'tools');

  return (
    <aside className="w-[260px] min-w-[260px] bg-sidebar-bg border-r border-gray-200 text-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-lg font-bold tracking-wide text-primary">AKSARA</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest -mt-1">
              Asisten Pencarian Sumber Data
            </p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 mb-4">
        <button className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Recent */}
        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium px-3 mb-2">
          Recent Inquiries
        </p>
        <ul className="space-y-0.5 mb-5">
          {recentItems.map((session) => {
            const Icon = iconMap[session.icon];
            const isActive = session.id === activeId;
            return (
              <li key={session.id}>
                <button
                  onClick={() => setActiveId(session.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-sidebar-active text-primary font-medium'
                      : 'text-gray-600 hover:bg-sidebar-hover'
                  }`}
                >
                  {session.color && isActive ? (
                    <div
                      className="w-1 h-6 rounded-full mr-1"
                      style={{ backgroundColor: session.color }}
                    />
                  ) : null}
                  <Icon className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate">{session.title}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Tools */}
        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium px-3 mb-2">
          Tools
        </p>
        <ul className="space-y-0.5">
          {toolItems.map((session) => {
            const Icon = iconMap[session.icon];
            const isActive = session.id === activeId;
            return (
              <li key={session.id}>
                <button
                  onClick={() => setActiveId(session.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-sidebar-active text-primary font-medium'
                      : 'text-gray-600 hover:bg-sidebar-hover'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate">{session.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-sm font-bold text-white uppercase">
            {user?.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{role || 'User'}</p>
          </div>
          <button 
            onClick={() => signOut()}
            title="Sign Out"
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
