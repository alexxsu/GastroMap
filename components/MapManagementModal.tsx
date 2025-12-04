import React, { useState } from 'react';
import { X, Plus, Users, Lock, Copy, Check, LogIn, Globe, User, Settings, Crown, UserMinus, LogOut as LeaveIcon } from 'lucide-react';
import { UserMap, MapMember } from '../types';

interface MapManagementModalProps {
  userMaps: UserMap[];           // User's default map
  sharedMaps: UserMap[];         // Shared maps user created
  joinedMaps: UserMap[];         // Shared maps user joined
  activeMap: UserMap | null;
  currentUserUid: string;
  isGuest?: boolean;
  onClose: () => void;
  onCreateSharedMap: (name: string) => Promise<void>;
  onJoinSharedMap: (code: string) => Promise<boolean>;
  onLeaveSharedMap: (mapId: string) => Promise<void>;
  onKickMember: (mapId: string, memberUid: string) => Promise<void>;
  onSelectMap: (map: UserMap) => void;
  maxSharedMaps?: number;
}

const MapManagementModal: React.FC<MapManagementModalProps> = ({
  userMaps,
  sharedMaps,
  joinedMaps,
  activeMap,
  currentUserUid,
  isGuest = false,
  onClose,
  onCreateSharedMap,
  onJoinSharedMap,
  onLeaveSharedMap,
  onKickMember,
  onSelectMap,
  maxSharedMaps = 3
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingClosing, setIsCreatingClosing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isJoiningClosing, setIsJoiningClosing] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [settingsOpenFor, setSettingsOpenFor] = useState<string | null>(null);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const [confirmKick, setConfirmKick] = useState<{ mapId: string; memberUid: string } | null>(null);

  const userSharedMapsCount = sharedMaps.length;
  const totalSharedMapsCount = sharedMaps.length + joinedMaps.length;
  const canCreateMore = !isGuest && userSharedMapsCount < maxSharedMaps;
  const canJoinMore = !isGuest && totalSharedMapsCount < maxSharedMaps;

  // Toggle settings with animation
  const toggleSettings = (mapId: string) => {
    if (settingsOpenFor === mapId) {
      // Close with animation
      setSettingsClosing(true);
      setTimeout(() => {
        setSettingsOpenFor(null);
        setSettingsClosing(false);
        setConfirmLeave(null);
        setConfirmKick(null);
      }, 200);
    } else {
      // Open (close any existing first)
      if (settingsOpenFor) {
        setSettingsClosing(true);
        setTimeout(() => {
          setSettingsClosing(false);
          setSettingsOpenFor(mapId);
        }, 200);
      } else {
        setSettingsOpenFor(mapId);
      }
    }
  };

  // Animation helpers
  const openCreateForm = () => {
    setIsCreatingClosing(false);
    setIsCreating(true);
  };

  const closeCreateForm = () => {
    setIsCreatingClosing(true);
    setTimeout(() => {
      setIsCreating(false);
      setIsCreatingClosing(false);
      setNewMapName('');
    }, 200);
  };

  const openJoinForm = () => {
    setIsJoiningClosing(false);
    setIsJoining(true);
  };

  const closeJoinForm = () => {
    setIsJoiningClosing(true);
    setTimeout(() => {
      setIsJoining(false);
      setIsJoiningClosing(false);
      setJoinCode('');
      setJoinError(null);
    }, 200);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const handleCreate = async () => {
    if (!newMapName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateSharedMap(newMapName.trim());
      closeCreateForm();
    } catch (error) {
      console.error('Failed to create shared map:', error);
      alert('Failed to create shared map. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.length !== 4 || isSubmitting) return;

    setIsSubmitting(true);
    setJoinError(null);
    try {
      const success = await onJoinSharedMap(joinCode);
      if (success) {
        closeJoinForm();
      } else {
        setJoinError('Map not found. Check the code and try again.');
      }
    } catch (error: any) {
      console.error('Failed to join shared map:', error);
      setJoinError(error.message || 'Failed to join map. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeave = async (mapId: string) => {
    setIsSubmitting(true);
    try {
      await onLeaveSharedMap(mapId);
      setConfirmLeave(null);
      setSettingsOpenFor(null);
    } catch (error) {
      console.error('Failed to leave map:', error);
      alert('Failed to leave map. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKick = async (mapId: string, memberUid: string) => {
    setIsSubmitting(true);
    try {
      await onKickMember(mapId, memberUid);
      setConfirmKick(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      alert('Failed to copy code');
    }
  };

  const renderMapItem = (map: UserMap, type: 'default' | 'created' | 'joined') => {
    const isActive = activeMap?.id === map.id;
    const isSettingsOpen = settingsOpenFor === map.id;
    
    const getTypeStyles = () => {
      switch (type) {
        case 'default':
          return {
            icon: <Lock size={18} className="text-blue-400" />,
            bgColor: 'bg-blue-500/20',
            label: 'Private'
          };
        case 'created':
          return {
            icon: <Users size={18} className="text-purple-400" />,
            bgColor: 'bg-purple-500/20',
            label: 'Shared (Owner)'
          };
        case 'joined':
          return {
            icon: <Globe size={18} className="text-green-400" />,
            bgColor: 'bg-green-500/20',
            label: 'Shared (Member)'
          };
      }
    };

    const styles = getTypeStyles();

    return (
      <div key={map.id} className="space-y-2">
        {/* Map item box - contains everything including gear */}
        <div
          className={`flex items-center gap-3 p-3 rounded-xl transition
            ${isActive
              ? 'bg-blue-600/20 border border-blue-500/50'
              : 'bg-gray-700/50 border border-transparent hover:bg-gray-700'}
          `}
        >
          {/* Clickable area for selecting map */}
          <button
            onClick={() => {
              onSelectMap(map);
              handleClose();
            }}
            className="flex-1 flex items-center gap-3 text-left"
          >
            <div className={`p-2 rounded-lg ${styles.bgColor}`}>
              {styles.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">{map.name}</span>
                {map.isDefault && (
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">Default</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{styles.label}</span>
                {map.shareCode && type === 'created' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(map.shareCode!);
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    <span className="font-mono bg-gray-600 px-1.5 py-0.5 rounded">{map.shareCode}</span>
                    {copiedCode === map.shareCode ? (
                      <Check size={12} className="text-green-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </span>
                )}
                {type === 'joined' && map.ownerDisplayName && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User size={10} />
                    {map.ownerDisplayName}
                  </span>
                )}
              </div>
            </div>
            {isActive && (
              <span className="inline-flex h-2 w-2 rounded-full bg-green-400" />
            )}
          </button>

          {/* Settings gear inside the box for created and joined maps */}
          {(type === 'created' || type === 'joined') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSettings(map.id);
              }}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isSettingsOpen 
                  ? 'bg-gray-600 text-white rotate-90' 
                  : 'bg-gray-600/50 text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        {/* Settings Panel with animation */}
        {isSettingsOpen && (
          <div className={`ml-2 bg-gray-800 rounded-xl border border-gray-600 overflow-hidden transition-all duration-200 ${
            settingsClosing 
              ? 'opacity-0 scale-95 max-h-0' 
              : 'opacity-100 scale-100 max-h-80 animate-scale-in'
          }`}>
            {type === 'created' ? (
              // Created map settings - show members list
              <div className="p-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Members ({map.memberInfo?.length || 1})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {/* Owner */}
                  <div className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Crown size={14} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm font-medium truncate block">
                        {map.ownerDisplayName || 'You'}
                      </span>
                      <span className="text-xs text-purple-400">Creator</span>
                    </div>
                  </div>

                  {/* Other members */}
                  {map.memberInfo?.filter(m => m.uid !== map.ownerUid).map((member) => (
                    <div key={member.uid} className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg group">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                          <User size={14} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-sm font-medium truncate block">
                          {member.displayName}
                        </span>
                        <span className="text-xs text-gray-400">Member</span>
                      </div>
                      {confirmKick?.mapId === map.id && confirmKick?.memberUid === member.uid ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleKick(map.id, member.uid)}
                            disabled={isSubmitting}
                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition"
                          >
                            {isSubmitting ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmKick(null)}
                            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmKick({ mapId: map.id, memberUid: member.uid })}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition"
                          title="Remove member"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  {(!map.memberInfo || map.memberInfo.filter(m => m.uid !== map.ownerUid).length === 0) && (
                    <p className="text-gray-500 text-xs text-center py-2">No other members yet</p>
                  )}
                </div>
              </div>
            ) : (
              // Joined map settings - show leave option
              <div className="p-3">
                {confirmLeave === map.id ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 text-center">
                      Leave "{map.name}"?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmLeave(null)}
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleLeave(map.id)}
                        disabled={isSubmitting}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
                      >
                        <LeaveIcon size={14} />
                        {isSubmitting ? 'Leaving...' : 'Leave'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmLeave(map.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                  >
                    <LeaveIcon size={16} />
                    <span>Leave this map</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'animate-fade-in'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className={`bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto transform transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'animate-scale-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div>
              <h2 className="text-lg font-bold text-white">Map Management</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isGuest ? 'View your demo map' : 'Manage your maps and collaborations'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Maps List */}
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
            
            {/* Section 1: Default Map */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Lock size={12} />
                {isGuest ? 'Demo Map' : 'Your Default Map'}
              </h3>
              <div className="space-y-2">
                {userMaps.length > 0 ? (
                  userMaps.map((map) => renderMapItem(map, 'default'))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-2">No default map</p>
                )}
              </div>
            </div>

            {/* Section 2: Shared Maps You Created - hide for guests */}
            {!isGuest && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users size={12} />
                  Shared Maps You Created ({sharedMaps.length}/{maxSharedMaps})
                </h3>
                <div className="space-y-2">
                  {sharedMaps.length > 0 ? (
                    sharedMaps.map((map) => renderMapItem(map, 'created'))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-2">No shared maps created yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Shared Maps You Joined - hide for guests */}
            {!isGuest && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Globe size={12} />
                  Shared Maps You Joined ({joinedMaps.length}/{maxSharedMaps})
                </h3>
                <div className="space-y-2">
                  {joinedMaps.length > 0 ? (
                    joinedMaps.map((map) => renderMapItem(map, 'joined'))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-2">No joined maps yet</p>
                  )}

                  {/* Join Map Button/Form */}
                  {isJoining ? (
                    <div className={`space-y-3 mt-3 p-3 bg-gray-700/50 rounded-xl border border-gray-600 transition-all duration-200 overflow-hidden ${
                      isJoiningClosing 
                        ? 'opacity-0 scale-95 max-h-0 mt-0 p-0 border-0' 
                        : 'opacity-100 scale-100 max-h-60 animate-scale-in'
                    }`}>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Enter 4-digit map code</label>
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setJoinCode(val);
                            setJoinError(null);
                          }}
                          placeholder="0000"
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-center font-mono text-xl tracking-widest placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                          maxLength={4}
                          autoFocus
                        />
                      </div>
                      {joinError && (
                        <p className="text-red-400 text-xs text-center">{joinError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={closeJoinForm}
                          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleJoin}
                          disabled={joinCode.length !== 4 || isSubmitting}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? 'Joining...' : (
                            <>
                              <LogIn size={16} />
                              Join
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => canJoinMore && openJoinForm()}
                      disabled={!canJoinMore}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl transition-all duration-200 border
                        ${canJoinMore
                          ? 'bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30'
                          : 'bg-gray-700/30 text-gray-500 border-gray-600 cursor-not-allowed'}
                      `}
                    >
                      <LogIn size={16} />
                      <span>Join a Shared Map</span>
                      {!canJoinMore && <span className="text-xs text-gray-500">(Limit reached)</span>}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Guest info message */}
            {isGuest && (
              <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600">
                <p className="text-gray-400 text-sm text-center">
                  Sign in to create or join shared maps with others.
                </p>
              </div>
            )}
          </div>

          {/* Create New Shared Map */}
          <div className="p-4 border-t border-gray-700">
            {isCreating && !isGuest ? (
              <div className={`space-y-3 transition-all duration-200 overflow-hidden ${
                isCreatingClosing 
                  ? 'opacity-0 scale-95 max-h-0' 
                  : 'opacity-100 scale-100 max-h-40 animate-scale-in'
              }`}>
                <input
                  type="text"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value.slice(0, 25))}
                  placeholder="Enter map name..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={25}
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{newMapName.length}/25 characters</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={closeCreateForm}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newMapName.trim() || isSubmitting}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => canCreateMore && openCreateForm()}
                disabled={!canCreateMore || isGuest}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 border
                  ${canCreateMore && !isGuest
                    ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border-gray-600'}
                `}
              >
                <Plus size={18} />
                <span>Create Shared Map</span>
                {isGuest ? (
                  <span className="text-xs text-gray-500">(Sign in required)</span>
                ) : !canCreateMore && (
                  <span className="text-xs text-gray-500">(Limit reached)</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MapManagementModal;
