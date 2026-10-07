import { Link } from 'react-router-dom';
import aksaraLogo from '@/assets/aksara-logo.png';

/** Logo header + centered card shared by the sign-in and reset-password pages. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
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
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          <Link to="/kebijakan-privasi" className="hover:text-gray-700 hover:underline">
            Kebijakan Privasi
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AuthSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export const authInputClass =
  'appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-shadow sm:text-sm';

export const authSubmitClass =
  'w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-dark hover:bg-primary-ink focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-70 disabled:cursor-not-allowed';
