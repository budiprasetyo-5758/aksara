import { useState } from 'react';
import { supabase, getAuthRedirectError, authErrorMessage } from '@/lib/supabase';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout, AuthSpinner, authInputClass, authSubmitClass } from '@/components/auth/AuthLayout';

type AuthMode = 'login' | 'register' | 'forgot';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
    </svg>
  );
}

export function AuthPage() {
  const { session, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Shows an expired-link / cancelled-Google error carried back in the redirect URL
  const [error, setError] = useState<string | null>(getAuthRedirectError);
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const navigate = useNavigate();

  if (isLoading) {
    return <AuthSpinner />;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  const validateUsername = (value: string): boolean => {
    return /^[a-zA-Z0-9_]{3,30}$/.test(value);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setUnconfirmedEmail(null);
  };

  const handleLogin = async () => {
    const loginEmail = email.trim();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (error) {
      if (error.code === 'email_not_confirmed') {
        setUnconfirmedEmail(loginEmail);
      }
      throw new Error(authErrorMessage(error));
    }
    navigate('/');
  };

  const handleRegister = async () => {
    const name = fullName.trim();
    const handle = username.trim().toLowerCase();
    const signupEmail = email.trim();

    if (!name) {
      throw new Error('Nama lengkap wajib diisi.');
    }
    if (!validateUsername(handle)) {
      throw new Error('Username harus 3–30 karakter dan hanya berisi huruf, angka, atau garis bawah.');
    }

    // profiles RLS hides other users from visitors, so availability is checked server-side
    const { data: available, error: checkError } = await supabase
      .rpc('is_username_available', { candidate: handle });
    if (checkError) {
      throw new Error('Tidak dapat memeriksa ketersediaan username. Silakan coba lagi.');
    }
    if (!available) {
      throw new Error('Username sudah digunakan. Silakan pilih yang lain.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: {
        data: {
          full_name: name,
          username: handle,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) throw new Error(authErrorMessage(error));

    // With email confirmation on, Supabase answers an existing email with an identity-less user
    if (data.user && data.user.identities?.length === 0) {
      throw new Error(authErrorMessage({ code: 'user_already_exists' }));
    }

    // With a session (confirmation off) the auth listener signs in and this page redirects
    if (!data.session) {
      setMode('login');
      setEmail(signupEmail);
      setPassword('');
      setNotice(`Pendaftaran berhasil! Kami telah mengirim tautan konfirmasi ke ${signupEmail}. Silakan konfirmasi email Anda sebelum masuk.`);
    }
  };

  const handleForgotPassword = async () => {
    const resetEmail = email.trim();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(authErrorMessage(error));
    // Same message whether or not the email exists, so accounts can't be probed
    setNotice(`Jika ${resetEmail} terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim. Periksa inbox dan folder spam Anda.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setUnconfirmedEmail(null);

    try {
      if (mode === 'login') await handleLogin();
      else if (mode === 'register') await handleRegister();
      else await handleForgotPassword();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    setLoading(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setError(null);
    setUnconfirmedEmail(null);
    setNotice(`Tautan konfirmasi baru telah dikirim ke ${unconfirmedEmail}.`);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
        // Always show the account chooser — matters on shared workstations
        queryParams: { prompt: 'select_account' },
      },
    });
    // On success the browser is already navigating to Google
    if (error) {
      setError(authErrorMessage(error));
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <AuthLayout>
      {mode === 'forgot' ? (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke halaman masuk
          </button>
          <h3 className="text-lg font-semibold text-gray-900">Atur ulang kata sandi</h3>
          <p className="mt-1 text-sm text-gray-500">
            Masukkan email akun Anda, kami akan mengirimkan tautan untuk membuat kata sandi baru.
          </p>
        </div>
      ) : (
        <div className="flex justify-center mb-8 border-b border-gray-200">
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                mode === tab ? 'text-primary-ink' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'login' ? 'Masuk' : 'Daftar'}
              {mode === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="p-4 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {error}
            {unconfirmedEmail && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={busy}
                className="block mt-2 font-medium underline hover:text-red-800 disabled:opacity-60"
              >
                Kirim ulang email konfirmasi
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="p-4 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
            {notice}
          </div>
        )}

        {/* Register-only fields */}
        {mode === 'register' && (
          <>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Nama lengkap
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={authInputClass}
                  placeholder="Nama sesuai identitas"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className={authInputClass}
                  placeholder="budi_santoso"
                  maxLength={30}
                />
                <p className="mt-1 text-xs text-gray-400">Hanya huruf, angka, dan garis bawah. 3–30 karakter.</p>
              </div>
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Alamat email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="nama@email.com"
            />
          </div>
        </div>

        {/* Password */}
        {mode !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Kata sandi
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-medium text-primary-ink hover:underline"
                >
                  Lupa kata sandi?
                </button>
              )}
            </div>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'register' ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${authInputClass} pr-10`}
                placeholder="min. 6 karakter"
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
        )}

        <div>
          <button type="submit" disabled={busy} className={authSubmitClass}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'login' ? (
              'Masuk'
            ) : mode === 'register' ? (
              'Buat akun'
            ) : (
              'Kirim tautan reset'
            )}
          </button>
        </div>
      </form>

      {mode !== 'forgot' && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">atau</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleIcon className="w-5 h-5" />
            )}
            Lanjutkan dengan Google
          </button>
        </>
      )}
    </AuthLayout>
  );
}
