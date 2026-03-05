import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import aksaraLogo from '@/assets/aksara-logo.png';
import { useAuth } from '@/contexts/AuthContext';

export function AuthPage() {
  const { session, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // email or username
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  const validateUsername = (value: string): boolean => {
    return /^[a-zA-Z0-9_]{3,30}$/.test(value);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login: support username or email
        let loginEmail = loginIdentifier;

        // If it doesn't look like an email, try to find email by username
        if (!loginIdentifier.includes('@')) {
          const { data: emailResult, error: rpcError } = await supabase
            .rpc('get_email_by_username', { lookup_username: loginIdentifier.toLowerCase() });
          
          if (rpcError || !emailResult) {
            throw new Error('Username not found. Please check and try again.');
          }
          loginEmail = emailResult;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw error;
        navigate('/');
      } else {
        // Register
        if (!fullName.trim()) {
          throw new Error('Full name is required.');
        }
        if (!validateUsername(username)) {
          throw new Error('Username must be 3-30 characters, only letters, numbers, and underscores.');
        }

        // Check if username is already taken
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single();
        
        if (existing) {
          throw new Error('Username is already taken. Please choose another one.');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim().toLowerCase(),
            },
          },
        });
        if (error) throw error;
        setError('Registration successful! You can now log in.');
        setIsLogin(true);
        setLoginIdentifier(email);
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

          <form className="space-y-5" onSubmit={handleAuth}>
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

            {/* Register-only fields */}
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="John Doe"
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
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="john_doe"
                      maxLength={30}
                    />
                    <p className="mt-1 text-xs text-gray-400">Letters, numbers, and underscores only. 3-30 characters.</p>
                  </div>
                </div>
              </>
            )}

            {/* Email / Username field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {isLogin ? 'Email or Username' : 'Email address'}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type={isLogin ? 'text' : 'email'}
                  autoComplete={isLogin ? 'username' : 'email'}
                  required
                  value={isLogin ? loginIdentifier : email}
                  onChange={(e) => isLogin ? setLoginIdentifier(e.target.value) : setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder={isLogin ? 'email@example.com or username' : 'email@example.com'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
