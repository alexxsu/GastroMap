import React, { useState } from 'react';
import { X, Plus, Users, Lock, Copy, Check, LogIn, Globe, User } from 'lucide-react';
import { UserMap } from '../types';

interface MapManagementModalProps {
  userMaps: UserMap[];           // User's default map
  sharedMaps: UserMap[];         // Shared maps user created
  joinedMaps: UserMap[];         // Shared maps user joined
  activeMap: UserMap | null;
  onClose: () => void;
  onCreateSharedMap: (name: string) => Promise<void>;
  onJoinSharedMap: (code: string) => Promise<boolean>;
  onSelectMap: (map: UserMap) => void;
  maxSharedMaps?: number;
}

const MapManagementModal: React.FC<MapManagementModalProps> = ({
  userMaps,
  sharedMaps,
  joinedMaps,
  activeMap,
  onClose,
  onCreateSharedMap,
  onJoinSharedMap,
  onSelectMap,
  maxSharedMaps = 3
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const userSharedMapsCount = sharedMaps.filter(m => m.visibility === 'shared').length;
  const canCreateMore = userSharedMapsCount < maxSharedMaps;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const handleCreate = async () => {
    if (!newMapName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateSharedMap(newMapName.trim());
      setNewMapName('');
      setIsCreating(false);
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
        setJoinCode('');
        setIsJoining(false);
      } else {
        setJoinError('Map not found. Check the code and try again.');
      }
    } catch (error) {
      console.error('Failed to join shared map:', error);
      setJoinError('Failed to join map. Please try again.');
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
    
    // Determine icon and colors based on type
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
      <button
        key={map.id}
        onClick={() => {
          onSelectMap(map);
          handleClose();
        }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left
          ${isActive
            ? 'bg-blue-600/20 border border-blue-500/50'
            : 'bg-gray-700/50 border border-transparent hover:bg-gray-700'}
        `}
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCode(map.shareCode!);
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
              >
                <span className="font-mono bg-gray-600 px-1.5 py-0.5 rounded">{map.shareCode}</span>
                {copiedCode === map.shareCode ? (
                  <Check size={12} className="text-green-400" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
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
                Manage your maps and collaborations
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
                Your Default Map
              </h3>
              <div className="space-y-2">
                {userMaps.length > 0 ? (
                  userMaps.map((map) => renderMapItem(map, 'default'))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-2">No default map</p>
                )}
              </div>
            </div>

            {/* Section 2: Shared Maps You Created */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users size={12} />
                Shared Maps You Created
              </h3>
              <div className="space-y-2">
                {sharedMaps.length > 0 ? (
                  sharedMaps.map((map) => renderMapItem(map, 'created'))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-2">No shared maps created yet</p>
                )}
              </div>
            </div>

            {/* Section 3: Shared Maps You Joined */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Globe size={12} />
                Shared Maps You Joined
              </h3>
              <div className="space-y-2">
                {joinedMaps.length > 0 ? (
                  joinedMaps.map((map) => renderMapItem(map, 'joined'))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-2">No joined maps yet</p>
                )}

                {/* Join Map Button/Form */}
                {isJoining ? (
                  <div className="space-y-3 mt-3 p-3 bg-gray-700/50 rounded-xl border border-gray-600">
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
                        onClick={() => {
                          setIsJoining(false);
                          setJoinCode('');
                          setJoinError(null);
                        }}
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
                    onClick={() => setIsJoining(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl transition bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
                  >
                    <LogIn size={16} />
                    <span>Join a Shared Map</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Create New Shared Map */}
          <div className="p-4 border-t border-gray-700">
            {isCreating ? (
              <div className="space-y-3">
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
                    onClick={() => {
                      setIsCreating(false);
                      setNewMapName('');
                    }}
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
                onClick={() => setIsCreating(true)}
                disabled={!canCreateMore}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl transition
                  ${canCreateMore
                    ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'}
                `}
              >
                <Plus size={18} />
                <span>Create Shared Map</span>
                {!canCreateMore && (
                  <span className="text-xs text-gray-500">({maxSharedMaps}/{maxSharedMaps})</span>
                )}
              </button>
            )}
            {canCreateMore && !isCreating && (
              <p className="text-xs text-gray-500 text-center mt-2">
                {userSharedMapsCount}/{maxSharedMaps} shared maps created
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MapManagementModal;
