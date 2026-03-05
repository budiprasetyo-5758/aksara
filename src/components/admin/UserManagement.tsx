import { useState, useEffect } from 'react';
import { Search, Shield, User, ChevronDown, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  role: 'admin' | 'user';
  full_name: string;
  username: string;
  phone_number: string | null;
  created_at: string;
  email?: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, username, phone_number, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else if (data) {
        setUsers(data as UserProfile[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'user') => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Error updating role:', error);
        alert(`Failed to update role: ${error.message}`);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    return (
      (user.full_name || '').toLowerCase().includes(q) ||
      (user.username || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      user.id.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">User Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {users.length} total user{users.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Registered Users</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, username..."
                className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                  Name
                </th>
                <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                  Username
                </th>
                <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                  Contact
                </th>
                <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                  Joined
                </th>
                <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                  Role
                </th>
                <th className="text-right text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white uppercase ${
                        user.role === 'admin'
                          ? 'bg-gradient-to-br from-teal-400 to-cyan-600'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                      }`}>
                        {user.role === 'admin' ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          user.full_name ? user.full_name.charAt(0) : <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {user.full_name || <span className="text-gray-400 italic">No name</span>}
                        </p>
                        <p className="text-xs text-gray-400 font-mono truncate">{user.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>

                  {/* Username */}
                  <td className="px-5 py-4">
                    {user.username ? (
                      <span className="text-sm text-gray-600">@{user.username}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">—</span>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      {user.phone_number && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          <span>{user.phone_number}</span>
                        </div>
                      )}
                      {!user.phone_number && (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </div>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Role Badge */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        user.role === 'admin' ? 'bg-primary' : 'bg-gray-400'
                      }`} />
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end">
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.id, e.target.value as 'admin' | 'user')}
                          disabled={updatingId === user.id}
                          className={`appearance-none pl-3 pr-8 py-1.5 text-sm border rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                            updatingId === user.id
                              ? 'opacity-50 cursor-wait'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
