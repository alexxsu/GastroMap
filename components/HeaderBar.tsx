import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Menu, Search, Filter, ChevronUp, Bell, MapPin, Map } from 'lucide-react';
import { Restaurant, AppNotification, UserMap } from '../types';
import { GRADES, getGradeColor, getBestGrade } from '../utils/rating';
import { NotificationPanel } from './NotificationPanel';
import { useLanguage } from '../hooks/useLanguage';

// Restaurant with map info for the search list
export interface RestaurantWithMap extends Restaurant {
  mapId: string;
  mapName: string;
}

interface HeaderBarProps {
  // All restaurants across all maps for the pin list
  allRestaurantsWithMaps: RestaurantWithMap[];
  // Current map's restaurants (for filtering display)
  currentMapRestaurants: Restaurant[];
  // Search/List state
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isSearchClosing: boolean;
  closeSearch: () => void;
  onSelectPin: (restaurant: RestaurantWithMap) => void;
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
  // Active map info
  activeMapId?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  allRestaurantsWithMaps,
  currentMapRestaurants,
  isSearchOpen,
  setIsSearchOpen,
  isSearchClosing,
  closeSearch,
  onSelectPin,
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
  showNotifications = false,
  activeMapId
}) => {
  const { t, language } = useLanguage();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifClosing, setIsNotifClosing] = useState(false);
  const headerBarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close search
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerBarRef.current && !headerBarRef.current.contains(event.target as Node)) {
        closeSearch();
      }
    };

    // Add listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSearchOpen, closeSearch]);

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

  const handleSearchToggle = () => {
    if (isSearchOpen) {
      closeSearch();
    } else {
      setIsSearchOpen(true);
    }
  };

  // Group restaurants by map, then sort alphabetically within each group
  const groupedByMap = useMemo(() => {
    const groups: { [mapId: string]: { mapName: string; restaurants: RestaurantWithMap[] } } = {};
    
    allRestaurantsWithMaps.forEach(r => {
      if (!groups[r.mapId]) {
        groups[r.mapId] = { mapName: r.mapName, restaurants: [] };
      }
      groups[r.mapId].restaurants.push(r);
    });
    
    // Sort restaurants alphabetically within each group
    Object.values(groups).forEach(group => {
      group.restaurants.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Sort groups: current map first, then alphabetically by map name
    const entries = Object.entries(groups);
    entries.sort(([idA, groupA], [idB, groupB]) => {
      if (idA === activeMapId) return -1;
      if (idB === activeMapId) return 1;
      return groupA.mapName.localeCompare(groupB.mapName);
    });
    
    return entries;
  }, [allRestaurantsWithMaps, activeMapId]);

  return (
    <div ref={headerBarRef} data-component="header-bar" className="w-full bg-gray-800/90 backdrop-blur border border-gray-700 p-2 rounded-xl shadow-lg pointer-events-auto transition-all duration-200">
      <div className="flex items-center gap-2 relative min-h-[40px]">
        {/* Hamburger Menu Button */}
        <button
          data-tutorial="menu-button"
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors duration-200 flex-shrink-0"
        >
          <Menu size={20} />
        </button>

        {/* Logo/Title - clickable to open pin list */}
        {!isSearchOpen && !isSearchClosing && (
          <div
            data-tutorial="search-bar"
            onClick={handleSearchToggle}
            className="flex-1 flex items-center gap-2 px-1 text-white cursor-pointer hover:opacity-80 transition-opacity duration-200 animate-scale-in"
          >
            <img src="/logo.svg" className="w-7 h-7 object-contain" alt="Logo" />
            <span className="font-bold truncate">TraceBook</span>
          </div>
        )}

        {/* Search Header - when list is open */}
        {(isSearchOpen || isSearchClosing) && (
          <div data-tutorial="search" className={`flex-1 flex items-center bg-gray-700/50 rounded-lg px-3 h-[36px] ${isSearchClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
            <MapPin size={14} className="text-blue-400 mr-2 flex-shrink-0" />
            <span className="text-sm text-white flex-1">
              {language === 'zh' ? '所有地点' : 'All Locations'}
              <span className="text-gray-400 ml-2">({allRestaurantsWithMaps.length})</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeSearch();
              }}
              className="text-gray-400 hover:text-white p-1 transition-transform duration-200"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        )}

        {/* Search, Filter, and Notification Buttons */}
        {!isSearchOpen && !isSearchClosing && (
          <div className="flex items-center gap-0.5 animate-scale-in relative">
            <button
              onClick={(e) => { e.stopPropagation(); handleSearchToggle(); }}
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

      {/* Pin List - shows when search is open */}
      {(isSearchOpen || isSearchClosing) && (
        <div className={`mt-2 border-t border-gray-700 pt-2 max-h-72 overflow-y-auto overflow-x-hidden ${isSearchClosing ? 'animate-collapse-up' : 'animate-expand-down'}`}>
          {allRestaurantsWithMaps.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <MapPin size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{language === 'zh' ? '暂无地点' : 'No locations yet'}</p>
              <p className="text-xs mt-1">{language === 'zh' ? '添加你的第一个体验！' : 'Add your first experience!'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByMap.map(([mapId, { mapName, restaurants }]) => (
                <div key={mapId}>
                  {/* Map Section Header */}
                  <div className="flex items-center gap-2 px-2 py-1 sticky top-0 bg-gray-800/95 backdrop-blur z-10">
                    <Map size={12} className={mapId === activeMapId ? 'text-blue-400' : 'text-gray-500'} />
                    <span className={`text-xs font-medium uppercase tracking-wide ${mapId === activeMapId ? 'text-blue-400' : 'text-gray-500'}`}>
                      {mapName}
                      {mapId === activeMapId && (
                        <span className="ml-1 text-[10px] normal-case">
                          ({language === 'zh' ? '当前' : 'current'})
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-600">({restaurants.length})</span>
                  </div>
                  
                  {/* Restaurants in this map */}
                  <div className="space-y-0.5">
                    {restaurants.map(r => {
                      const bestGrade = getBestGrade(r.visits);
                      return (
                        <button
                          key={`${r.mapId}-${r.id}`}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onSelectPin(r);
                          }}
                          className="w-full text-left px-2 py-2 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white flex items-center gap-3 transition-colors"
                        >
                          {/* Grade Badge */}
                          <div className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${getGradeColor(bestGrade)} bg-gray-700/50`}>
                            {bestGrade}
                          </div>
                          
                          {/* Restaurant Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{r.name}</div>
                            <div className="text-xs text-gray-500 truncate">{r.address}</div>
                          </div>
                          
                          {/* Visit Count */}
                          <div className="flex-shrink-0 text-xs text-gray-500">
                            {r.visits.length} {r.visits.length === 1 ? (language === 'zh' ? '次' : 'visit') : (language === 'zh' ? '次' : 'visits')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
