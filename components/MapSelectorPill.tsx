import React from 'react';
import { Lock, Users, Globe, Settings } from 'lucide-react';
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
  const getPillStyles = () => {
    if (isCompactCardOpen) {
      return 'bg-blue-600/90 border-blue-400/50 text-white';
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
    if (activeMap.isDefault) {
      return <Lock size={16} className={isCompactCardOpen ? 'text-white' : 'text-blue-400'} />;
    }
    if (activeMap.ownerUid === user?.uid) {
      return <Users size={16} className={isCompactCardOpen ? 'text-white' : 'text-purple-400'} />;
    }
    return <Globe size={16} className={isCompactCardOpen ? 'text-white' : 'text-green-400'} />;
  };

  return (
    <>
      {/* Pill Button */}
      <button
        onClick={() => setIsCompactCardOpen(!isCompactCardOpen)}
        className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 mt-1 rounded-full backdrop-blur border shadow-lg transition-all duration-200 text-sm font-medium pointer-events-auto self-start ${getPillStyles()}`}
      >
        {getIcon()}
        <span className="truncate max-w-[160px]">{activeMap.name}</span>
      </button>

      {/* Compact Viewing Card */}
      {isCompactCardOpen && (
        <div className="bg-gray-900/90 backdrop-blur border border-gray-700 rounded-xl px-3 py-2 shadow-xl animate-scale-in pointer-events-auto self-start min-w-[220px]">
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
            {activeMap.isDefault ? (
              <span className="text-blue-400">Your Default Map</span>
            ) : activeMap.ownerUid === user?.uid ? (
              <span className="text-purple-400">Shared Map (Owner)</span>
            ) : (
              <span className="text-green-400">Shared Map by {(activeMap.ownerDisplayName && activeMap.ownerDisplayName !== 'Anonymous' && activeMap.ownerDisplayName !== 'Unknown') ? activeMap.ownerDisplayName : activeMap.ownerUid}</span>
            )}
          </div>

          {/* Map selector dropdown - for non-guest users with maps */}
          {!user?.isAnonymous && (userOwnMaps.length > 0 || userSharedMaps.length > 0 || userJoinedMaps.length > 0) && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Switch Map</label>
              <select
                className="w-full bg-gray-800 text-gray-100 text-[11px] rounded-md px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={activeMap.id}
                onChange={(e) => {
                  const allUserMaps = [...userOwnMaps, ...userSharedMaps, ...userJoinedMaps];
                  const selected = allUserMaps.find((m) => m.id === e.target.value);
                  if (selected) onSelectMap(selected);
                }}
              >
                {/* Default Maps Section */}
                {userOwnMaps.filter(m => m.isDefault).length > 0 && (
                  <optgroup label="Your Default Map">
                    {userOwnMaps.filter(m => m.isDefault).map((m) => (
                      <option key={m.id} value={m.id}>
                        🔒 {m.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Created Shared Maps Section */}
                {userSharedMaps.length > 0 && (
                  <optgroup label="Shared Maps (Owner)">
                    {userSharedMaps.map((m) => (
                      <option key={m.id} value={m.id}>
                        👥 {m.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Joined Shared Maps Section */}
                {userJoinedMaps.length > 0 && (
                  <optgroup label="Shared Maps (Joined)">
                    {userJoinedMaps.map((m) => {
                      const ownerName = (m.ownerDisplayName && m.ownerDisplayName !== 'Anonymous' && m.ownerDisplayName !== 'Unknown')
                        ? m.ownerDisplayName
                        : m.ownerUid;
                      return (
                        <option key={m.id} value={m.id}>
                          🌐 {m.name} ({ownerName})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {/* Admin all maps selector */}
          {userProfile?.role === 'admin' && allMaps.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Admin: All Maps</label>
              <select
                className="w-full bg-gray-800 text-gray-100 text-[11px] rounded-md px-2 py-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={activeMap.id}
                onChange={(e) => {
                  const selected = allMaps.find((m) => m.id === e.target.value);
                  if (selected) onSelectMap(selected);
                }}
              >
                {allMaps.map((m) => {
                  const displayName = (m.ownerDisplayName && m.ownerDisplayName !== 'Anonymous' && m.ownerDisplayName !== 'Unknown')
                    ? m.ownerDisplayName
                    : m.ownerUid;
                  return (
                    <option key={m.id} value={m.id}>
                      {displayName + ' – ' + m.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="flex gap-4 mt-2 pt-2 border-t border-gray-700 text-xs">
            <div className="flex gap-1">
              <span className="text-gray-500">Pins:</span>
              <span className="text-gray-200">{restaurantsCount}</span>
            </div>
            <div className="flex gap-1">
              <span className="text-gray-500">Visible:</span>
              <span className="text-gray-200">{filteredCount}</span>
            </div>
          </div>

          {/* Manage Maps Button - only for non-anonymous users */}
          {!user?.isAnonymous && (
            <button
              onClick={onManageMaps}
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
