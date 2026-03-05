import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import aksaraLogo from '@/assets/aksara-logo.png';

const navLinks = [
  { label: 'Documents', path: '/admin' },
  { label: 'Users', path: '/admin/users' },
];

export function AdminNavbar() {
  const location = useLocation();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-8">
        <Link to="/admin" className="flex items-center gap-2">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-7 h-7 object-contain" />
          <span className="text-lg font-bold text-primary">
            AKSARA<sub className="text-[10px] text-gray-400 font-normal ml-0.5">admin</sub>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              (link.path === '/admin' && (location.pathname === '/admin' || location.pathname === '/admin/documents')) ||
              (link.path !== '/admin' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors relative ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Back to Chat */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-gray-200 hover:border-primary/30"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>
      </div>
    </header>
  );
}
