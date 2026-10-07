import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/chat/UserAvatar';

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-shadow';

export function ProfileSettings() {
  const { user, role, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (!fullName.trim()) {
        throw new Error('Nama lengkap wajib diisi.');
      }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        throw new Error('Username harus 3–30 karakter dan hanya berisi huruf, angka, atau garis bawah.');
      }

      // profiles RLS hides other users' rows, so availability is checked server-side
      if (username !== profile?.username) {
        const { data: available, error: checkError } = await supabase
          .rpc('is_username_available', { candidate: username });
        if (checkError) {
          throw new Error('Tidak dapat memeriksa ketersediaan username. Silakan coba lagi.');
        }
        if (!available) {
          throw new Error('Username sudah digunakan. Silakan pilih yang lain.');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          phone_number: phoneNumber.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) {
        // 23505 = unique violation: someone took the username between the check and the save
        throw new Error(error.code === '23505' ? 'Username sudah digunakan. Silakan pilih yang lain.' : error.message);
      }

      await refreshProfile();
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan profil.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6">
        <div className="flex-1">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-2 py-1.5 -ml-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke chat</span>
          </button>
        </div>
        <h1 className="text-[15px] font-semibold text-gray-900">Pengaturan Profil</h1>
        <div className="flex-1" />
      </header>

      {/* Content */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        {/* Avatar + identity */}
        <div className="flex flex-col items-center text-center mb-8">
          <UserAvatar size="lg" />
          <p className="mt-3 text-base font-semibold text-gray-900">{profile?.full_name || user?.email}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
            role={message.type === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="profile-full-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama lengkap
            </label>
            <input
              id="profile-full-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Nama sesuai identitas"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="profile-username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className={inputClass}
              placeholder="budi_santoso"
              maxLength={30}
            />
            <p className="mt-1 text-xs text-gray-500">Hanya huruf, angka, dan garis bawah. 3–30 karakter.</p>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Nomor telepon <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={inputClass}
              placeholder="+62 812 3456 7890"
            />
          </div>

          {/* Read-only fields */}
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
              <p className="text-sm text-gray-800 break-all">{user?.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Peran</p>
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                  role === 'admin' ? 'bg-primary/10 text-primary-ink' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {role === 'admin' ? 'Admin' : 'Pengguna'}
              </span>
            </div>
          </div>

          {/* Save */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-dark hover:bg-primary-ink text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan…' : 'Simpan perubahan'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
