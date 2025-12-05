import React, { useState } from 'react';
import { X, User as UserIcon, BarChart2, Layers, Info, Shield, Check } from 'lucide-react';
import { AppUser } from '../hooks/useAuth';
import { UserProfile } from '../types';
import { useLanguage, Language } from '../hooks/useLanguage';

// Custom language icon component
const LanguageIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <text x="2" y="11" fontSize="8" fontWeight="600" fill="currentColor">中</text>
    <text x="11" y="20" fontSize="8" fontWeight="600" fill="currentColor">EN</text>
    <line x1="10" y1="4" x2="14" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

interface SideMenuProps {
  user: AppUser;
  userProfile: UserProfile | null;
  isMenuOpen: boolean;
  isMenuClosing: boolean;
  isMenuAnimatingIn: boolean;
  onClose: () => void;
  onOpenUserDetail: () => void;
  onViewStats: () => void;
  onManageMaps: () => void;
  onViewInfo: () => void;
  onSiteManagement?: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  user,
  userProfile,
  isMenuOpen,
  isMenuClosing,
  isMenuAnimatingIn,
  onClose,
  onOpenUserDetail,
  onViewStats,
  onManageMaps,
  onViewInfo,
  onSiteManagement
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  if (!isMenuOpen && !isMenuClosing) return null;

  const isAdmin = userProfile?.role === 'admin';

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setShowLanguageMenu(false);
  };

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
              <h2 className="text-white font-bold text-lg">{t('appName')}</h2>
              <p className="text-gray-500 text-xs">{t('tagline')}</p>
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
              <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-gray-700 group-hover:border-gray-600 transition-colors duration-200" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                <UserIcon size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
              </div>
            )}
            <div className="text-left">
              <span className="font-medium block">{user?.displayName || userProfile?.displayName || t('user')}</span>
              <span className="text-xs text-gray-500">{t('viewProfile')}</span>
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
                <span className="font-medium block">{t('mapManagement')}</span>
                <span className="text-xs text-gray-500">{t('manageMaps')}</span>
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
                <span className="font-medium block">{t('statistics')}</span>
                <span className="text-xs text-gray-500">{t('viewStats')}</span>
              </div>
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                  <LanguageIcon size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                </div>
                <div className="text-left flex-1">
                  <span className="font-medium block">{t('language')}</span>
                  <span className="text-xs text-gray-500">{language === 'en' ? t('english') : t('chinese')}</span>
                </div>
              </button>

              {/* Language Dropdown */}
              {showLanguageMenu && (
                <div className="absolute left-4 right-4 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
                  <button
                    onClick={() => handleLanguageSelect('en')}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <span className="font-medium">English</span>
                    {language === 'en' && <Check size={16} className="text-blue-400" />}
                  </button>
                  <button
                    onClick={() => handleLanguageSelect('zh')}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <span className="font-medium">简体中文</span>
                    {language === 'zh' && <Check size={16} className="text-blue-400" />}
                  </button>
                </div>
              )}
            </div>

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
                <span className="font-medium block">{t('about')}</span>
                <span className="text-xs text-gray-500">{t('howItWorks')}</span>
              </div>
            </button>

            {/* Site Management - Admin Only */}
            {isAdmin && onSiteManagement && (
              <>
                <div className="pt-3 mt-3 border-t border-gray-700">
                  <p className="text-xs text-purple-400 font-medium uppercase tracking-wider px-4 mb-2">{t('admin')}</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onSiteManagement();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-purple-900/30 rounded-xl transition-all duration-200 group border border-purple-500/20"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 flex items-center justify-center transition-colors duration-200">
                    <Shield size={20} className="text-purple-400 group-hover:text-purple-300 transition-colors duration-200" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium block text-purple-300">{t('siteManagement')}</span>
                    <span className="text-xs text-purple-400/70">{t('manageUsersSettings')}</span>
                  </div>
                </button>
              </>
            )}
          </div>

        {/* Menu Footer - Close Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200"
          >
            <X size={18} />
            <span className="text-sm font-medium">{t('closeMenu')}</span>
          </button>
        </div>
      </div>
    </>
  );
};
