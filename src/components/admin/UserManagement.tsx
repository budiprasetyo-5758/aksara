import { useState, useEffect } from 'react';
import { Search, ChevronDown, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/chat/UserAvatar';

interface UserProfile {
  id: string;
  role: 'admin' | 'user';
  full_name: string;
  username: string;
  phone_number: string | null;
  created_at: string;
  email?: string | null;
  avatar_url?: string | null;
}

const thClass = 'text-left text-[11px] text-gray-500 font-semibold uppercase tracking-wider px-5 py-3';

export function UserManagement() {
  const { user: currentUser } = useAuth();
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
        .select('id, role, full_name, username, phone_number, created_at, email, avatar_url')
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
        alert(`Gagal mengubah peran: ${error.message}`);
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
      (user.email || '').toLowerCase().includes(q)
    );
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500">
            {users.length.toLocaleString('id-ID')} pengguna terdaftar · {adminCount} admin
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Daftar Pengguna</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pengguna…"
              className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              aria-label="Cari pengguna"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={thClass}>Pengguna</th>
                  <th className={thClass}>Username</th>
                  <th className={thClass}>Telepon</th>
                  <th className={thClass}>Bergabung</th>
                  <th className={thClass}>Peran</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const isUpdating = updatingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Name + email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar size="sm" name={user.full_name || user.email} avatarUrl={user.avatar_url ?? null} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {user.full_name || <span className="text-gray-400 italic">Belum ada nama</span>}
                              {isSelf && <span className="ml-1.5 text-xs font-normal text-gray-400">(Anda)</span>}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-5 py-4">
                        {user.username ? (
                          <span className="text-sm text-gray-600">@{user.username}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        {user.phone_number ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{user.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Role: one inline control instead of a badge plus a separate selector */}
                      <td className="px-5 py-4">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            onChange={(e) => updateRole(user.id, e.target.value as 'admin' | 'user')}
                            // Guard against an admin locking themselves out of the dashboard
                            disabled={isUpdating || isSelf}
                            title={isSelf ? 'Anda tidak dapat mengubah peran akun sendiri' : 'Ubah peran'}
                            aria-label={`Peran ${user.full_name || user.email || 'pengguna'}`}
                            className={`appearance-none pl-3 pr-8 py-1.5 text-sm font-medium border rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed ${
                              user.role === 'admin'
                                ? 'bg-primary/10 border-primary/20 text-primary-ink'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                            } ${isUpdating ? 'opacity-50 cursor-wait' : ''} ${isSelf ? 'opacity-70' : 'cursor-pointer'}`}
                          >
                            <option value="user">Pengguna</option>
                            <option value="admin">Admin</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                      Tidak ada pengguna yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
