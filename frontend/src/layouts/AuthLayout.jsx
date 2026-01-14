// AuthLayout

import { Outlet, Link } from 'react-router-dom';
import '../styles/global.css';
import '../styles/auth.css';

function AuthLayout() {
  return (
    <div className="auth-bg flex items-center justify-center p-3 sm:p-4">
      {/* Decorative blobs */}
      <div className="auth-blob blob-1" />
      <div className="auth-blob blob-2" />
      <div className="auth-blob blob-3" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 drop-shadow-sm">
              Caro Online
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">Chơi cờ caro trực tuyến</p>
          </Link>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl bg-white/75 backdrop-blur-xl shadow-2xl ring-1 ring-white/40 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6 text-slate-600 text-xs sm:text-sm">
          <p>© 2024 Caro Online</p>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
