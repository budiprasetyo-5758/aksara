import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase, getAuthRedirectError, authErrorMessage } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout, AuthSpinner, authInputClass, authSubmitClass } from '@/components/auth/AuthLayout';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Landing page for the "reset password" email link. Supabase turns the link's
 * token into a session on load, which is what authorizes updateUser() here.
 */
export function ResetPasswordPage() {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError] = useState(getAuthRedirectError);
  const [done, setDone] = useState(false);

  if (isLoading) {
    return <AuthSpinner />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setDone(true);
  };

  // No session: link expired, already used, or page opened directly
  if (!session) {
    return (
      <AuthLayout>
        <h3 className="text-lg font-semibold text-gray-900">Tautan reset tidak valid atau sudah kedaluwarsa</h3>
        <p className="mt-2 text-sm text-gray-500">
          {linkError || 'Silakan minta tautan reset kata sandi yang baru dari halaman masuk.'}
        </p>
        <Link to="/auth" className={`${authSubmitClass} mt-6`}>
          Kembali ke halaman masuk
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Kata sandi berhasil diperbarui</h3>
          <p className="mt-2 text-sm text-gray-500">Kata sandi baru Anda sudah aktif dan Anda sudah masuk.</p>
        </div>
        <button onClick={() => navigate('/', { replace: true })} className={`${authSubmitClass} mt-6`}>
          Lanjut ke AKSARA
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Buat kata sandi baru</h3>
        <p className="mt-1 text-sm text-gray-500">
          Untuk akun <span className="font-medium text-gray-700">{session.user.email}</span>
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="p-4 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
            Kata sandi baru
          </label>
          <div className="mt-1 relative">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-10`}
              placeholder={`min. ${MIN_PASSWORD_LENGTH} karakter`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Ulangi kata sandi baru
          </label>
          <div className="mt-1">
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authInputClass}
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className={authSubmitClass}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan kata sandi'}
        </button>
      </form>
    </AuthLayout>
  );
}
