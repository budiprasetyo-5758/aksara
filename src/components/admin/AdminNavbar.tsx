import { Plus, Bell, Search, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Documents', path: '/admin/documents' },
  { label: 'Users', path: '/admin/users' },
  { label: 'Settings', path: '/admin/settings' },
];

export function AdminNavbar() {
  const location = useLocation();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-8">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-800">
            AKSARA<sub className="text-[10px] text-gray-400 font-normal ml-0.5">admin</sub>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.path === '/admin/documents' ||
              (link.path === '/admin' && location.pathname === '/admin');
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

      {/* Right: Search + Icons */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents..."
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
