import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/store';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UsersRound, 
  Shield, 
  Grid3X3, 
  Key, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      path: '/users',
      name: 'Users',
      icon: <Users className="w-5 h-5" />
    },
    {
      path: '/groups',
      name: 'Groups',
      icon: <UsersRound className="w-5 h-5" />
    },
    {
      path: '/roles',
      name: 'Roles',
      icon: <Shield className="w-5 h-5" />
    },
    {
      path: '/modules',
      name: 'Modules',
      icon: <Grid3X3 className="w-5 h-5" />
    },
    {
      path: '/permissions',
      name: 'Permissions',
      icon: <Key className="w-5 h-5" />
    }
  ];

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-900 text-white">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-bold">IAM System</h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between h-16 px-4 bg-gray-800 border-b border-gray-700">
                <h1 className="text-xl font-bold">IAM System</h1>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-4 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`
                    }
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Logout Button */}
              <div className="p-4 border-t border-gray-700">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="ml-3">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center h-16 bg-gray-800 border-b border-gray-700">
            <h1 className="text-xl font-bold">IAM System</h1>
          </div>

          {/* User Info */}
          <div className="p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;