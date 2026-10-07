import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file. The app will not function correctly.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email atau kata sandi salah.',
  email_not_confirmed: 'Email Anda belum dikonfirmasi. Silakan buka tautan konfirmasi yang kami kirim ke inbox Anda.',
  weak_password: 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
  same_password: 'Kata sandi baru harus berbeda dari kata sandi lama.',
  user_already_exists: 'Email ini sudah terdaftar. Silakan masuk atau atur ulang kata sandi.',
  email_address_invalid: 'Alamat email tidak valid.',
  signup_disabled: 'Pendaftaran akun baru sedang dinonaktifkan.',
  over_email_send_rate_limit: 'Terlalu banyak permintaan email. Silakan coba lagi beberapa saat lagi.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.',
  otp_expired: 'Kode atau tautan salah, sudah dipakai, atau kedaluwarsa. Silakan minta yang baru.',
};

/** Indonesian message for a Supabase auth error, falling back to its own message. */
export function authErrorMessage(error: { code?: string; message?: string }): string {
  return (error.code && AUTH_ERROR_MESSAGES[error.code]) || error.message || 'Terjadi kesalahan. Silakan coba lagi.';
}

/**
 * Error Supabase appends to a redirect URL — expired reset/confirmation link,
 * cancelled Google consent, etc. Checked in the hash (implicit flow) and query.
 */
export function getAuthRedirectError(): string | null {
  for (const raw of [window.location.hash.slice(1), window.location.search.slice(1)]) {
    const params = new URLSearchParams(raw);
    const code = params.get('error_code');
    if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
    const message = params.get('error_description') || params.get('error');
    if (message) return message;
  }
  return null;
}
