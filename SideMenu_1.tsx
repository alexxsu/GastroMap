import React from 'react';
import { X, User as UserIcon, BarChart2, Layers, Info } from 'lucide-react';
import { AppUser } from '../hooks/useAuth';

interface SideMenuProps {
  user: AppUser;
  isMenuOpen: boolean;
  isMenuClosing: boolean;
  isMenuAnimatingIn: boolean;
  onClose: () => void;
  onOpenUserDetail: () => void;
  onViewStats: () => void;
  onManageMaps: () => void;
  onViewInfo: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  user,
  isMenuOpen,
  isMenuClosing,
  isMenuAnimatingIn,
  onClose,
  onOpenUserDetail,
  onViewStats,
  onManageMaps,
  onViewInfo
}) => {
  if (!isMenuOpen && !isMenuClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${isMenuAnimatingIn && !isMenuClosing ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-700 z-[101] shadow-2xl transform transition-transform duration-300 ease-out ${
          isMenuAnimatingIn && !isMenuClosing ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" className="w-10 h-10 object-contain" alt="Logo" />
            <div>
              <h2 className="text-white font-bold text-lg">TraceBook</h2>
              <p className="text-gray-500 text-xs">Trace your experiences</p>
            </div>
          </div>
        </div>

        {/* User Profile Section - Separated */}
        <div className="p-3 border-b border-gray-700">
          <button
            onClick={() => {
              onClose();
              onOpenUserDetail();
            }}
            className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-gray-700 group-hover:border-gray-600 transition-colors duration-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                <UserIcon size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
              </div>
            )}
            <div className="text-left">
              <span className="font-medium block">{user?.displayName || 'User'}</span>
              <span className="text-xs text-gray-500">View your profile</span>
            </div>
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-3 space-y-1">
            {/* Map Management */}
            <button
              onClick={() => {
                onClose();
                onManageMaps();
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                <Layers size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
              </div>
              <div className="text-left">
                <span className="font-medium block">Map Management</span>
                <span className="text-xs text-gray-500">Manage your maps</span>
              </div>
            </button>

            {/* Stats */}
            <button
              onClick={() => {
                onClose();
                onViewStats();
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                <BarChart2 size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
              </div>
              <div className="text-left">
                <span className="font-medium block">Statistics</span>
                <span className="text-xs text-gray-500">View your stats</span>
              </div>
            </button>

            {/* About */}
            <button
              onClick={() => {
                onClose();
                onViewInfo();
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                <Info size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
              </div>
              <div className="text-left">
                <span className="font-medium block">About</span>
                <span className="text-xs text-gray-500">How TraceBook works</span>
              </div>
            </button>
          </div>

        {/* Menu Footer - Close Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200"
          >
            <X size={18} />
            <span className="text-sm font-medium">Close Menu</span>
          </button>
        </div>
      </div>
    </>
  );
};
