import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import aksaraLogo from '@/assets/aksara-logo.png';
import { UserAvatar } from '@/components/chat/UserAvatar';

const navLinks = [
  { label: 'Dokumen', path: '/admin' },
  { label: 'Klasifikasi', path: '/admin/classifications' },
  { label: 'Pengguna', path: '/admin/users' },
];

export function AdminNavbar() {
  const location = useLocation();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between gap-4 px-4 sm:px-6 shrink-0">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-2 sm:gap-8 min-w-0 h-full">
        <Link to="/admin" className="flex items-center gap-2 shrink-0">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-7 h-7 object-contain" />
          <span className="hidden sm:inline text-lg font-bold text-primary">AKSARA</span>
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-primary-ink bg-primary/10 px-1.5 py-0.5 rounded">
            Admin
          </span>
        </Link>
        <nav className="flex items-center gap-1 h-full overflow-x-auto" aria-label="Menu admin">
          {navLinks.map((link) => {
            const isActive =
              (link.path === '/admin' && (location.pathname === '/admin' || location.pathname === '/admin/documents')) ||
              (link.path !== '/admin' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                aria-current={isActive ? 'page' : undefined}
                className={`h-full flex items-center px-2 sm:px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary-ink'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Back to Chat + current user */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-lg transition-colors border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          title="Kembali ke chat"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Kembali ke chat</span>
        </Link>
        <div className="hidden sm:block">
          <UserAvatar size="sm" />
        </div>
      </div>
    </header>
  );
}
