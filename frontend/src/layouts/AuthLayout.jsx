// AuthLayout

import { Outlet, Link } from 'react-router-dom';
import '../styles/global.css';

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-2">Caro Online</h1>
            <p className="text-blue-700 text-xs sm:text-sm">Chơi cờ caro trực tuyến</p>
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6 text-blue-700 text-xs sm:text-sm">
          <p>© 2024 Caro Online</p>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
