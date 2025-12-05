import React, { useEffect, useMemo, useState } from 'react';
import { Menu, Search, Filter, X, Bell, Lock, Users, Globe, Sparkles } from 'lucide-react';
import { Restaurant, AppNotification, UserMap } from '../types';
import { GRADES, getGradeColor } from '../utils/rating';
import { NotificationPanel } from './NotificationPanel';
import { useLanguage } from '../hooks/useLanguage';
import { SearchResultGroup } from '../hooks/useSearch';

interface HeaderBarProps {
  // Search props
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResultGroup[];
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  isSearchClosing: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  closeSearch: () => void;
  onSearchSelect: (restaurant: Restaurant, map: UserMap) => void;
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
  isMenuOpen: boolean;
  // Notifications
  notifications?: AppNotification[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  showNotifications?: boolean;
  isAdmin?: boolean;
  isGuest?: boolean;
  currentUserUid?: string;
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
  isMenuOpen,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  showNotifications = false,
  isAdmin = false,
  isGuest = false,
  currentUserUid
}) => {
  const { t, language } = useLanguage();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifClosing, setIsNotifClosing] = useState(false);
  const showSearchInput = isSearchFocused || searchQuery || isSearchClosing;
  const [openMaps, setOpenMaps] = useState<Record<string, boolean>>({});
  const [adminSearchMode, setAdminSearchMode] = useState<'list' | 'input'>('list');

  // Reset admin search mode when search closes
  useEffect(() => {
    if (!showSearchInput) {
      setAdminSearchMode('list');
    }
  }, [showSearchInput]);

  // Clear any lingering query when returning to admin list mode
  useEffect(() => {
    if (isAdmin && adminSearchMode === 'list' && searchQuery) {
      setSearchQuery('');
    }
  }, [adminSearchMode, isAdmin, searchQuery, setSearchQuery]);

  // When admin enters input mode, ensure focus stays active
  useEffect(() => {
    if (isAdmin && adminSearchMode === 'input') {
      setIsSearchFocused(true);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [adminSearchMode, isAdmin, setIsSearchFocused, searchInputRef]);

  const toggleMapOpen = (mapId: string) => {
    setOpenMaps(prev => {
      const currentlyOpen = prev[mapId] === true;
      return {
        ...prev,
        [mapId]: !currentlyOpen
      };
    });
  };

  const getOwnerDisplayName = (map: UserMap) => {
    if (map.ownerDisplayName &&
        map.ownerDisplayName !== 'Anonymous' &&
        map.ownerDisplayName !== 'Unknown' &&
        map.ownerDisplayName !== 'Unknown User' &&
        map.ownerDisplayName !== 'Default Map') {
      return map.ownerDisplayName;
    }
    if (map.ownerEmail) {
      return map.ownerEmail.split('@')[0];
    }
    return 'Unknown';
  };

  const mapLabel = (map: UserMap) => {
    if (isAdmin) {
      return `${getOwnerDisplayName(map)} - ${map.name}`;
    }
    if (map.isDefault) return isGuest ? 'Demo Map' : 'Default Map';
    if (map.visibility === 'shared') {
      const owner = getOwnerDisplayName(map);
      return `${owner} - ${map.name}`;
    }
    return map.name;
  };

  const mapIcon = (map: UserMap) => {
    if (map.isDefault) return <Lock size={14} className="text-blue-400" />;
    if (map.visibility === 'shared') return <Users size={14} className="text-green-400" />;
    return <Globe size={14} className="text-gray-300" />;
  };

  const mapSubtext = (map: UserMap) => {
    if (map.isDefault) return isGuest ? 'Demo map (private)' : 'Private default map';
    if (map.visibility === 'shared') return 'Shared map';
    if (map.visibility === 'public') return 'Public map';
    return 'Map';
  };

  const categorizedResults = useMemo(() => {
    const buckets: Record<string, SearchResultGroup[]> = {
      default: [],
      ownShared: [],
      other: []
    };
    searchResults.forEach(group => {
      if (currentUserUid && group.map.ownerUid === currentUserUid && group.map.isDefault) {
        buckets.default.push(group);
      } else if (currentUserUid && group.map.ownerUid === currentUserUid) {
        buckets.ownShared.push(group);
      } else {
        buckets.other.push(group);
      }
    });
    return [
      { key: 'default', label: 'Your Default Map', items: buckets.default },
      { key: 'ownShared', label: 'Your Shared Maps', items: buckets.ownShared },
      { key: 'other', label: 'Other Maps', items: buckets.other }
    ].filter(section => section.items.length > 0);
  }, [searchResults, currentUserUid]);

  const adminAura = useMemo(() => isAdmin ? 'shadow-[0_0_0_1px_rgba(148,163,255,0.35)] ring-1 ring-indigo-400/40 bg-gradient-to-r from-gray-800/90 via-gray-800/80 to-gray-900/90' : '', [isAdmin]);
  const adminGlow = isAdmin ? 'shadow-[0_12px_40px_-18px_rgba(99,102,241,0.45)]' : '';

  const handleNotifToggle = () => {
    if (isNotifOpen) {
      setIsNotifClosing(true);
      setTimeout(() => {
        setIsNotifOpen(false);
        setIsNotifClosing(false);
      }, 300);
    } else {
      setIsNotifOpen(true);
    }
  };

  const closeNotifications = () => {
    setIsNotifClosing(true);
    setTimeout(() => {
      setIsNotifOpen(false);
      setIsNotifClosing(false);
    }, 300);
  };

  return (
    <div data-component="header-bar" className={`w-full bg-gray-800/90 backdrop-blur border border-gray-700 p-2 rounded-xl shadow-lg pointer-events-auto transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 ${adminAura} ${adminGlow}`}>
          <div className="flex items-center gap-2 relative min-h-[40px]">
            {/* Hamburger Menu Button */}
        <button
          data-tutorial="menu-button"
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          className={`p-1.5 rounded-lg flex-shrink-0 transition-all duration-300 ${
            isMenuOpen
              ? 'bg-gray-700/80 text-blue-300 rotate-90 scale-110'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          aria-pressed={isMenuOpen}
        >
          <Menu size={20} className="transition-transform duration-300" />
        </button>

        {/* Logo/Title - clickable to trigger search */}
        {!showSearchInput && (
          <div
            data-tutorial="search-bar"
            onClick={() => {
              setIsSearchFocused(true);
              if (isAdmin) setAdminSearchMode('list');
            }}
            className="flex-1 flex items-center gap-2 px-1 text-white cursor-pointer hover:opacity-80 transition-opacity duration-200 animate-scale-in"
          >
            <img src="/logo.svg" className="w-7 h-7 object-contain" alt="Logo" />
            <span className="font-bold truncate">TraceBook</span>
          </div>
        )}

        {/* Search Input - appears when search is active */}
        {showSearchInput && (
          <>
            {/* Admin list mode (no input) */}
            {isAdmin && adminSearchMode === 'list' && (
              <div
                data-tutorial="search"
                className={`flex-1 flex items-center rounded-lg px-2 h-[36px] bg-gray-800/70 ${isSearchClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchFocused(true);
                  setAdminSearchMode('input');
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }}
              >
                <Search size={14} className="text-gray-300 mr-2 flex-shrink-0" />
                <div className="text-xs text-gray-300">Admin Search - search the database</div>
                <div className="ml-auto flex items-center gap-1">
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
              </div>
            )}

            {/* Normal or admin input mode */}
            {(!isAdmin || adminSearchMode === 'input') && (
              <div data-tutorial="search" className={`flex-1 flex items-center rounded-lg px-2 h-[36px] border ${isAdmin ? 'border-indigo-500/50 bg-gray-800/70' : 'border-transparent bg-gray-700/50'} ${isSearchClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
                <Search size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
              ref={searchInputRef}
              type="text"
              placeholder={t('searchExperiences')}
              className="bg-transparent border-none focus:outline-none text-sm text-white w-full placeholder-gray-500"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                if (isAdmin) return; // admins close via backdrop/map click
                setTimeout(() => { if (!searchQuery) closeSearch(); }, 150);
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAdmin && adminSearchMode === 'input') {
                      setAdminSearchMode('list');
                      setSearchQuery('');
                    } else {
                      closeSearch();
                    }
                  }}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Search, Filter, and Notification Buttons */}
        {!showSearchInput && (
          <div className="flex items-center gap-0.5 animate-scale-in relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSearchFocused(true);
                if (isAdmin) setAdminSearchMode('list');
              }}
              className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
            >
              <Search size={18} />
            </button>
            {/* Filter Button */}
            <button
              data-tutorial="filter-button"
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
      {isSearchFocused && searchResults.length > 0 && (searchQuery || isAdmin) && (
        <>
          <div
            className="fixed inset-0 z-10 bg-black/20"
            onClick={() => {
              setAdminSearchMode('list');
              closeSearch();
            }}
          ></div>
          <div className="mt-2 border-t border-gray-700 pt-2 max-h-64 overflow-y-auto rounded-lg bg-gray-800/60 backdrop-blur-sm animate-scale-in relative z-20">
            {categorizedResults.length > 0 ? (
              categorizedResults.map(section => (
                <div key={section.key} className="mb-1">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 px-2 py-1">{section.label}</div>
                  {section.items.map(group => {
                    const isOpen = openMaps[group.map.id] === true;
                    return (
                      <div key={group.map.id} className="px-1 mb-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMapOpen(group.map.id); }}
                          className={`w-full flex items-center justify-between px-2 py-2 rounded-md border transition-all duration-150 ${isOpen ? 'bg-gray-900/70 border-gray-700' : 'bg-gray-800/70 border-gray-800 hover:border-gray-600'} hover:bg-gray-800/80`}
                        >
                          <div className="flex items-center gap-2 text-left">
                            {mapIcon(group.map)}
                            <div className="flex flex-col leading-tight">
                              <span className="text-sm text-gray-100">{mapLabel(group.map)}</span>
                              <span className="text-[11px] text-gray-500">{mapSubtext(group.map)}</span>
                            </div>
                          </div>
                          <span className="text-[11px] text-gray-400">{group.matches.length} pins</span>
                        </button>
                        {isOpen && (
                          <div className="mt-1 flex flex-col gap-1 pl-2 pr-1 pb-1 animate-scale-in">
                            {group.matches.map(r => (
                              <button
                                key={r.id}
                                onClick={(e) => { e.stopPropagation(); onSearchSelect(r, group.map); }}
                                className="w-full text-left px-2 py-1.5 hover:bg-gray-700/80 rounded text-sm text-gray-200 hover:text-white flex flex-col border border-transparent hover:border-gray-600 transition-all duration-150"
                              >
                                <span className="font-semibold truncate">{r.name}</span>
                                <span className="text-[11px] text-gray-500 truncate">{r.address}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm px-2 py-1">{t('noResults')}</p>
            )}
          </div>
        </>
      )}

      {/* Filter Dropdown */}
      {(isFilterOpen || isFilterClosing) && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeFilter}></div>
          <div className={`mt-2 border-t border-gray-700 pt-3 pb-1 relative z-20 ${isFilterClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
            <div className="text-xs text-gray-400 font-bold uppercase mb-2 px-1">{t('filterByRating')}</div>
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
              <button onClick={(e) => { e.stopPropagation(); onSelectAllGrades(); }} className="text-blue-400 hover:text-blue-300">{t('selectAll')}</button>
              <button onClick={(e) => { e.stopPropagation(); onClearAllGrades(); }} className="text-gray-500 hover:text-gray-400">{t('clearAll')}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
