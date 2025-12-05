import React, { useState, useMemo, useEffect } from 'react';
import { User as UserIcon, Crown } from 'lucide-react';
import { UserMap, MapMember } from '../types';

interface MemberAvatarsProps {
  activeMap: UserMap;
}

export const MemberAvatars: React.FC<MemberAvatarsProps> = ({ activeMap }) => {
  const [clickedMemberUid, setClickedMemberUid] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Build complete member list with owner always first
  const displayMembers = useMemo(() => {
    if (activeMap.isDefault) return [];
    
    const members = activeMap.memberInfo || [];
    
    // Check if owner is already in memberInfo
    const ownerInList = members.find(m => m.uid === activeMap.ownerUid);
    
    // Create owner entry if not in list, using ownerPhotoURL from map data as fallback
    const ownerMember: MapMember = ownerInList || {
      uid: activeMap.ownerUid,
      displayName: activeMap.ownerDisplayName || activeMap.ownerEmail || 'Owner',
      photoURL: activeMap.ownerPhotoURL || null,
    };
    
    // Filter out owner from members (we'll add them first)
    const otherMembers = members.filter(m => m.uid !== activeMap.ownerUid);
    
    // Owner first, then other members
    return [ownerMember, ...otherMembers];
  }, [activeMap]);

  const shouldShow = !activeMap.isDefault && displayMembers.length > 0;

  // Handle mount/unmount animations
  useEffect(() => {
    if (shouldShow) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready before animating in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`absolute bottom-24 left-4 z-10 flex flex-col-reverse gap-1 pointer-events-auto transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      {displayMembers.slice(0, 10).map((member, index) => {
        const isOwner = member.uid === activeMap.ownerUid;
        return (
          <div 
            key={member.uid} 
            className="relative transition-all duration-300 ease-out"
            style={{ 
              transitionDelay: isVisible ? `${index * 50}ms` : `${(displayMembers.length - index - 1) * 30}ms`,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0) scale(1)' : 'translateX(-10px) scale(0.8)'
            }}
          >
            <button
              onClick={() => {
                setClickedMemberUid(clickedMemberUid === member.uid ? null : member.uid);
                setTimeout(() => setClickedMemberUid(null), 3000);
              }}
              className={`w-10 h-10 rounded-full border-2 shadow-lg transition-all duration-200 overflow-hidden
                ${clickedMemberUid === member.uid
                  ? 'border-blue-400 scale-110 ring-2 ring-blue-400/50'
                  : isOwner 
                    ? 'border-purple-500 hover:border-purple-400 hover:scale-105' 
                    : 'border-gray-700 hover:border-gray-500 hover:scale-105'}
              `}
              style={{ zIndex: 10 - index }}
            >
              {member.photoURL ? (
                <>
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Hide failed image and show fallback
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const fallback = img.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-gray-700 items-center justify-center hidden" style={{ display: 'none' }}>
                    <UserIcon size={16} className="text-gray-400" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <UserIcon size={16} className="text-gray-400" />
                </div>
              )}
            </button>

            {/* Crown badge for owner */}
            {isOwner && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-md z-20">
                <Crown size={10} className="text-yellow-300" />
              </div>
            )}

            {/* Tooltip on click */}
            {clickedMemberUid === member.uid && (
              <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap animate-scale-in z-20">
                <div className="text-white text-sm font-medium flex items-center gap-1.5">
                  {isOwner && <Crown size={12} className="text-purple-400" />}
                  {member.displayName}
                </div>
                <div className={`text-xs ${isOwner ? 'text-purple-400' : 'text-gray-400'}`}>
                  {isOwner ? 'Owner' : 'Member'}
                </div>
                {/* Arrow */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 border-l border-b border-gray-600 rotate-45" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
