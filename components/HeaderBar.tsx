import React, { useState } from 'react';
import { Menu, Search, Filter, X, Bell } from 'lucide-react';
import { Restaurant, AppNotification } from '../types';
import { GRADES, getGradeColor } from '../utils/rating';
import { NotificationPanel } from './NotificationPanel';

interface HeaderBarProps {
  // Search props
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Restaurant[];
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  isSearchClosing: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  closeSearch: () => void;
  onSearchSelect: (restaurant: Restaurant) => void;
  // Filter props
  selectedGrades: string[];
  isFilterOpen: boolean;
  isFilterClosing: boolean;
  onToggleGradeFilter: (grade: string) => void;
  onSelectAllGrades: () => void;
  onClearAllGrades: () => void;
  onFilterToggle: () => void;
  closeFilter: () => void;
  // Menu
  onMenuToggle: () => void;
  // Notifications
  notifications?: AppNotification[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  showNotifications?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearchFocused,
  setIsSearchFocused,
  isSearchClosing,
  searchInputRef,
  closeSearch,
  onSearchSelect,
  selectedGrades,
  isFilterOpen,
  isFilterClosing,
  onToggleGradeFilter,
  onSelectAllGrades,
  onClearAllGrades,
  onFilterToggle,
  closeFilter,
  onMenuToggle,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  showNotifications = false
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifClosing, setIsNotifClosing] = useState(false);
  const showSearchInput = isSearchFocused || searchQuery || isSearchClosing;

  const handleNotifToggle = () => {
    if (isNotifOpen) {
      setIsNotifClosing(true);
      setTimeout(() => {
        setIsNotifOpen(false);
        setIsNotifClosing(false);
      }, 200);
    } else {
      setIsNotifOpen(true);
    }
  };

  const closeNotifications = () => {
    setIsNotifClosing(true);
    setTimeout(() => {
      setIsNotifOpen(false);
      setIsNotifClosing(false);
    }, 200);
  };

  return (
    <div className="w-full bg-gray-800/90 backdrop-blur border border-gray-700 p-2 rounded-xl shadow-lg pointer-events-auto transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500">
      <div className="flex items-center gap-2 relative min-h-[40px]">
        {/* Hamburger Menu Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors duration-200 flex-shrink-0"
        >
          <Menu size={20} />
        </button>

        {/* Logo/Title - clickable to trigger search */}
        {!showSearchInput && (
          <div
            onClick={() => setIsSearchFocused(true)}
            className="flex-1 flex items-center gap-2 px-1 text-white cursor-pointer hover:opacity-80 transition-opacity duration-200 animate-scale-in"
          >
            <img src="/logo.svg" className="w-7 h-7 object-contain" alt="Logo" />
            <span className="font-bold truncate">TraceBook</span>
          </div>
        )}

        {/* Search Input - appears when search is active */}
        {showSearchInput && (
          <div className={`flex-1 flex items-center bg-gray-700/50 rounded-lg px-2 h-[36px] ${isSearchClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
            <Search size={14} className="text-gray-400 mr-2 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search your experiences..."
              className="bg-transparent border-none focus:outline-none text-sm text-white w-full placeholder-gray-500"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => { if (!searchQuery) closeSearch(); }, 150)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeSearch();
              }}
              className="text-gray-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search, Filter, and Notification Buttons */}
        {!showSearchInput && (
          <div className="flex items-center gap-0.5 animate-scale-in relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSearchFocused(true); }}
              className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
            >
              <Search size={18} />
            </button>
            {/* Filter Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onFilterToggle(); }}
              className={`p-1.5 hover:bg-gray-700 rounded-lg transition-colors duration-200 relative ${
                selectedGrades.length < GRADES.length || isFilterOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Filter size={18} />
              {selectedGrades.length < GRADES.length && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
            {/* Notification Button */}
            {showNotifications && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNotifToggle(); }}
                className={`p-1.5 hover:bg-gray-700 rounded-lg transition-colors duration-200 relative ${
                  isNotifOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            {/* Notification Panel */}
            {showNotifications && onMarkAsRead && onMarkAllAsRead && (
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                isOpen={isNotifOpen}
                isClosing={isNotifClosing}
                onClose={closeNotifications}
                onMarkAsRead={onMarkAsRead}
                onMarkAllAsRead={onMarkAllAsRead}
              />
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="mt-2 border-t border-gray-700 pt-2 max-h-60 overflow-y-auto">
          {searchResults.length > 0 ? (
            searchResults.map(r => (
              <button
                key={r.id}
                onClick={(e) => { e.stopPropagation(); onSearchSelect(r); }}
                className="w-full text-left px-2 py-2 hover:bg-gray-700 rounded text-sm text-gray-300 hover:text-white flex flex-col"
              >
                <span className="font-semibold">{r.name}</span>
                <span className="text-xs text-gray-500 truncate">{r.address}</span>
              </button>
            ))
          ) : (
            <p className="text-gray-500 text-sm px-2 py-1">No places found.</p>
          )}
        </div>
      )}

      {/* Filter Dropdown */}
      {(isFilterOpen || isFilterClosing) && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeFilter}></div>
          <div className={`mt-2 border-t border-gray-700 pt-3 pb-1 relative z-20 ${isFilterClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
            <div className="text-xs text-gray-400 font-bold uppercase mb-2 px-1">Filter by Grade</div>
            <div className="grid grid-cols-6 gap-1.5">
              {GRADES.map(grade => (
                <button
                  key={grade}
                  onClick={(e) => { e.stopPropagation(); onToggleGradeFilter(grade); }}
                  className={`
                    text-sm font-bold py-2 rounded-lg transition border
                    ${selectedGrades.includes(grade)
                      ? `${getGradeColor(grade)} bg-gray-700 border-gray-600`
                      : 'text-gray-600 border-transparent hover:bg-gray-700/50'}
                  `}
                >
                  {grade}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between text-xs px-1">
              <button onClick={(e) => { e.stopPropagation(); onSelectAllGrades(); }} className="text-blue-400 hover:text-blue-300">Select All</button>
              <button onClick={(e) => { e.stopPropagation(); onClearAllGrades(); }} className="text-gray-500 hover:text-gray-400">Clear All</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
