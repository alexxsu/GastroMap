import React, { useState, useMemo } from 'react';
import { Lock, Users, Globe, Settings, ChevronDown, AlertCircle } from 'lucide-react';
import { UserMap, UserProfile } from '../types';
import { AppUser } from '../hooks/useAuth';

interface MapSelectorPillProps {
  activeMap: UserMap;
  user: AppUser;
  userProfile: UserProfile | null;
  userOwnMaps: UserMap[];
  userSharedMaps: UserMap[];
  userJoinedMaps: UserMap[];
  allMaps: UserMap[];
  isCompactCardOpen: boolean;
  setIsCompactCardOpen: (open: boolean) => void;
  onSelectMap: (map: UserMap) => void;
  onManageMaps: () => void;
  restaurantsCount: number;
  filteredCount: number;
}

// Helper to get owner display name with fallbacks
const getOwnerDisplayName = (map: UserMap): string => {
  // ownerDisplayName should now be enriched from user profiles for admin view
  if (map.ownerDisplayName &&
      map.ownerDisplayName !== 'Anonymous' &&
      map.ownerDisplayName !== 'Unknown' &&
      map.ownerDisplayName !== 'Unknown User' &&
      map.ownerDisplayName !== 'Default Map') {
    return map.ownerDisplayName;
  }
  // Then try email (extract username part)
  if (map.ownerEmail) {
    return map.ownerEmail.split('@')[0];
  }
  // Final fallback
  return 'Unknown';
};

export const MapSelectorPill: React.FC<MapSelectorPillProps> = ({
  activeMap,
  user,
  userProfile,
  userOwnMaps,
  userSharedMaps,
  userJoinedMaps,
  allMaps,
  isCompactCardOpen,
  setIsCompactCardOpen,
  onSelectMap,
  onManageMaps,
  restaurantsCount,
  filteredCount
}) => {
  const [isAdminListOpen, setIsAdminListOpen] = useState(false);
  const isGuest = user?.isAnonymous || userProfile?.role === 'guest';

  const visibility = activeMap.visibility || (activeMap.isDefault ? 'private' : 'shared');

  const getPillStyles = () => {
    if (isCompactCardOpen) {
      return 'bg-blue-600/90 border-blue-400/50 text-white';
    }
    if (visibility === 'public' || isGuest) {
      return 'bg-green-900/80 border-green-700 text-green-200 hover:bg-green-800/90 hover:border-green-600';
    }
    if (activeMap.isDefault) {
      return 'bg-gray-900/80 border-gray-700 text-gray-200 hover:bg-gray-800/90 hover:border-gray-600';
    }
    if (activeMap.ownerUid === user?.uid) {
      return 'bg-purple-900/80 border-purple-700 text-purple-200 hover:bg-purple-800/90 hover:border-purple-600';
    }
    return 'bg-green-900/80 border-green-700 text-green-200 hover:bg-green-800/90 hover:border-green-600';
  };

  const getIcon = () => {
    if (visibility === 'public' || isGuest) {
      return <Globe size={16} className={isCompactCardOpen ? 'text-white' : 'text-green-400'} />;
    }
    if (activeMap.isDefault) {
      return <Lock size={16} className={isCompactCardOpen ? 'text-white' : 'text-blue-400'} />;
    }
    if (activeMap.ownerUid === user?.uid) {
      return <Users size={16} className={isCompactCardOpen ? 'text-white' : 'text-purple-400'} />;
    }
    return <Globe size={16} className={isCompactCardOpen ? 'text-white' : 'text-green-400'} />;
  };

  const categorizeMaps = (maps: UserMap[]) => {
    // My Maps section
    const myDefaults = maps.filter(m => m.ownerUid === user?.uid && m.isDefault);
    const myShared = maps.filter(m => m.ownerUid === user?.uid && !m.isDefault);
    
    // Other Maps section - separate demo (public) maps from other users' shared maps
    const demoMaps = maps.filter(m => m.ownerUid !== user?.uid && m.visibility === 'public');
    const otherUserMaps = maps.filter(m => m.ownerUid !== user?.uid && m.visibility !== 'public');
    
    return [
      { key: 'my-default', label: 'My Default Map', items: myDefaults, isMyMaps: true },
      { key: 'my-shared', label: 'My Shared Maps', items: myShared, isMyMaps: true },
      { key: 'demo', label: 'Demo Maps', items: demoMaps, isMyMaps: false },
      { key: 'other-users', label: "Other Users' Maps", items: otherUserMaps, isMyMaps: false }
    ].filter(section => section.items.length > 0);
  };

  // Group sections by category for rendering
  const getGroupedSections = (sections: ReturnType<typeof categorizeMaps>) => {
    const myMaps = sections.filter(s => s.isMyMaps);
    const otherMaps = sections.filter(s => !s.isMyMaps);
    return { myMaps, otherMaps };
  };

  const getDisplayName = (map: UserMap) => {
    // For admins viewing others, show owner - map name
    if (userProfile?.role === 'admin' && map.ownerUid !== user?.uid) {
      return `${getOwnerDisplayName(map)} - ${map.name}`;
    }
    return map.name;
  };

  const optionLabel = (map: UserMap) => {
    const name = map.name;
    const lock = "\uD83D\uDD12";      // 🔒
    const usersIcon = "\uD83D\uDC65"; // 👥
    const globe = "\uD83C\uDF10";     // 🌐
    if (map.visibility === 'public') return `${globe} ${name} - Public`;
    if (map.isDefault) return `${lock} ${name} - Private`;
    if (map.ownerUid === user?.uid) return `${usersIcon} ${name}`;
    return `${globe} ${name} (${getOwnerDisplayName(map)})`;
  };

  return (
    <>
      {/* Pill Button */}
      <button
        data-tutorial="map-pill"
        onClick={() => setIsCompactCardOpen(!isCompactCardOpen)}
        className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 mt-1 rounded-full backdrop-blur border shadow-lg transition-all duration-200 text-sm font-medium pointer-events-auto self-start ${getPillStyles()}`}
      >
        {getIcon()}
        <span className="truncate max-w-[200px]">{getDisplayName(activeMap)}</span>
      </button>

      {/* Compact Viewing Card */}
      {isCompactCardOpen && (
        <div className="bg-gray-900/90 backdrop-blur border border-gray-700 rounded-xl px-3 py-2 shadow-xl animate-scale-in pointer-events-auto self-start w-[260px]">
          <div className="flex items-center gap-2 text-xs text-gray-200">
            <span className={`inline-flex h-2 w-2 rounded-full flex-shrink-0 ${
              activeMap.isDefault ? 'bg-blue-400' :
              activeMap.ownerUid === user?.uid ? 'bg-purple-400' : 'bg-green-400'
            }`} />
            <span className="truncate">
              Viewing: <span className="font-semibold">{activeMap.name}</span>
            </span>
          </div>

          {/* Map type label */}
          <div className="mt-1 text-[10px]">
            {visibility === 'public' || isGuest ? (
              <span className="text-green-400">Demo Map - Public</span>
            ) : activeMap.isDefault ? (
              <span className="text-blue-400">Your Default Map - Private</span>
            ) : activeMap.ownerUid === user?.uid ? (
              <span className="text-purple-400">Shared Map (Owner)</span>
            ) : (
              <span className="text-green-400">Shared Map by {getOwnerDisplayName(activeMap)}</span>
            )}
          </div>

          {/* Guest locked state message */}
          {isGuest && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2 px-2 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                <div className="text-[11px] text-gray-400">
                  <span className="text-amber-400">Demo mode</span> - Sign in to create and switch between your own maps
                </div>
              </div>
            </div>
          )}

          {/* Unified map selector for non-guest users */}
          {!isGuest && (userProfile?.role === 'admin' ? allMaps.length > 0 : (userOwnMaps.length > 0 || userSharedMaps.length > 0 || userJoinedMaps.length > 0)) && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                {userProfile?.role === 'admin' ? 'Admin: All Maps' : 'Switch Map'}
              </label>
              <button
                onClick={() => setIsAdminListOpen(!isAdminListOpen)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all duration-200 ${
                  isAdminListOpen
                    ? 'bg-blue-600/20 border-blue-500/40 text-white'
                    : 'bg-gray-800/60 border-gray-700 text-gray-200 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {activeMap.visibility === 'public' ? (
                    <Globe size={14} className="text-green-400 flex-shrink-0" />
                  ) : activeMap.isDefault ? (
                    <Lock size={14} className="text-blue-400 flex-shrink-0" />
                  ) : (
                    <Users size={14} className="text-purple-400 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">
                    {userProfile?.role === 'admin' ? `${getOwnerDisplayName(activeMap)} - ${activeMap.name}` : activeMap.name}
                  </span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isAdminListOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Collapsible map list */}
              <div className={`overflow-hidden transition-all duration-300 ease-out ${isAdminListOpen ? 'max-h-60 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <div
                  className="max-h-56 overflow-y-scroll rounded-lg border border-gray-700 bg-gray-900/90"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  {(() => {
                    const mapsToShow = userProfile?.role === 'admin' ? allMaps : [...userOwnMaps, ...userSharedMaps, ...userJoinedMaps];
                    const sections = categorizeMaps(mapsToShow);
                    const { myMaps, otherMaps } = getGroupedSections(sections);
                    return (
                      <>
                        {/* My Maps Category */}
                        {myMaps.length > 0 && (
                          <div className={otherMaps.length > 0 ? 'border-b border-gray-700' : ''}>
                            <div className="px-2 py-1.5 bg-gray-800/50 text-[10px] uppercase tracking-wider text-gray-400 font-semibold sticky top-0 backdrop-blur-sm">
                              My Maps
                            </div>
                            {myMaps.map(section => (
                              <div key={section.key} className="px-2 py-1.5 border-b border-gray-800/50 last:border-b-0">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5 pl-1">{section.label}</div>
                                <div className="flex flex-col">
                                  {section.items.map(map => (
                                    <div
                                      key={map.id}
                                      onClick={() => {
                                        onSelectMap(map);
                                        setIsAdminListOpen(false);
                                        setIsCompactCardOpen(false);
                                      }}
                                      className={`w-full text-left px-2 py-1.5 rounded cursor-pointer transition ${
                                        map.id === activeMap.id
                                          ? 'bg-blue-600/30 text-white'
                                          : 'text-gray-200 hover:bg-gray-800/70'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {map.isDefault ? (
                                          <Lock size={14} className="text-blue-400 flex-shrink-0" />
                                        ) : (
                                          <Users size={14} className="text-purple-400 flex-shrink-0" />
                                        )}
                                        <div className="flex flex-col leading-tight min-w-0">
                                          <span className="text-sm truncate">{map.name}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Other Maps Category */}
                        {otherMaps.length > 0 && (
                          <div>
                            <div className="px-2 py-1.5 bg-gray-800/50 text-[10px] uppercase tracking-wider text-gray-400 font-semibold sticky top-0 backdrop-blur-sm">
                              Other Maps
                            </div>
                            {otherMaps.map(section => (
                              <div key={section.key} className="px-2 py-1.5 border-b border-gray-800/50 last:border-b-0">
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5 pl-1">{section.label}</div>
                                <div className="flex flex-col">
                                  {section.items.map(map => (
                                    <div
                                      key={map.id}
                                      onClick={() => {
                                        onSelectMap(map);
                                        setIsAdminListOpen(false);
                                        setIsCompactCardOpen(false);
                                      }}
                                      className={`w-full text-left px-2 py-1.5 rounded cursor-pointer transition ${
                                        map.id === activeMap.id
                                          ? 'bg-blue-600/30 text-white'
                                          : 'text-gray-200 hover:bg-gray-800/70'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {/* Demo maps (public) get globe, others get users icon */}
                                        {map.visibility === 'public' ? (
                                          <Globe size={14} className="text-green-400 flex-shrink-0" />
                                        ) : (
                                          <Users size={14} className="text-purple-400 flex-shrink-0" />
                                        )}
                                        <div className="flex flex-col leading-tight min-w-0">
                                          <span className="text-sm truncate">{map.name}</span>
                                          <span className="text-[10px] text-gray-500 truncate">{getOwnerDisplayName(map)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-2 pt-2 border-t border-gray-700 text-xs">
            <div className="flex gap-1">
              <span className="text-gray-500">Pins:</span>
              <span className="text-gray-200">{restaurantsCount}</span>
            </div>
            <div className="flex gap-1">
              <span className="text-gray-500">Filtered:</span>
              <span className="text-gray-200">{filteredCount}</span>
            </div>
          </div>

          {/* Manage Maps Button - only for non-anonymous users */}
          {!user?.isAnonymous && (
            <button
              data-tutorial="manage-maps-button"
              onClick={() => {
                setIsCompactCardOpen(false);
                onManageMaps();
              }}
              className="mt-2 pt-2 border-t border-gray-700 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-white transition"
            >
              <Settings size={12} />
              <span>Manage Maps</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};



