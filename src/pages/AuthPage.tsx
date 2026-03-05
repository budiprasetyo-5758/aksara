import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import aksaraLogo from '@/assets/aksara-logo.png';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Supabase might require email verification, but assuming auto-confirm for dev
        setError('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-16 h-16 object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-primary">
          AKSARA
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 uppercase tracking-widest font-medium">
          Asisten Pencarian Sumber Data
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl border border-gray-100 sm:px-10">
          <div className="flex justify-center mb-8 border-b border-gray-200">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                isLogin ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
              {isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                !isLogin ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
              {!isLogin && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleAuth}>
            {error && (
              <div
                className={`p-4 rounded-lg text-sm ${
                  error.includes('successful')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
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
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="doctor@hospital.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="min. 6 characters"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  'Sign in'
                ) : (
                  'Register Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
