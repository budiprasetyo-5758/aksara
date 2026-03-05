import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
} from 'lucide-react';
import aksaraLogo from '@/assets/aksara-logo.png';
import { useAuth } from '@/contexts/AuthContext';

export function ChatSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email || 'User';

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
        <button className={`bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${isExpanded ? 'w-full px-4' : 'w-12 h-12 mx-auto rounded-xl p-0'}`}>
          <Plus className="w-5 h-5" />
          {isExpanded && <span>New Chat</span>}
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 mt-2">
        {/* Intentionally left blank for future session list */}
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
