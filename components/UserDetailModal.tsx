import React, { useState, useRef } from 'react';
import { X, User as UserIcon, Clock, LogOut, Camera, Pencil, Loader2, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { AppUser } from '../hooks/useAuth';

interface UserDetailModalProps {
  user: AppUser;
  userProfile: UserProfile | null;
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onViewHistory: () => void;
  onLogout: () => void;
  onUpdateProfile?: (displayName?: string, photoFile?: File) => Promise<void>;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  userProfile,
  isOpen,
  isClosing,
  onClose,
  onViewHistory,
  onLogout,
  onUpdateProfile
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.displayName || '');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen && !isClosing) return null;

  const isGuest = user.isAnonymous;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSave = async () => {
    if (!onUpdateProfile) return;

    setIsSaving(true);
    setError('');

    try {
      await onUpdateProfile(
        editName !== user.displayName ? editName : undefined,
        selectedPhoto || undefined
      );
      setIsEditing(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(user.displayName || '');
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setError('');
  };

  const displayPhoto = photoPreview || user.photoURL;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto transform transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors z-10"
          >
            <X size={20} />
          </button>

          {/* User Profile Section */}
          <div className="p-6 text-center">
            {/* Profile Photo */}
            <div className="relative inline-block">
              {displayPhoto ? (
                <img src={displayPhoto} alt="User" className="w-24 h-24 rounded-full mx-auto border-4 border-gray-700 shadow-lg object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                  <UserIcon size={40} className="text-gray-400" />
                </div>
              )}

              {/* Edit photo button (only in edit mode) */}
              {isEditing && !isGuest && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white shadow-lg transition-colors"
                >
                  <Camera size={16} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Username and Role */}
            {isEditing ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  maxLength={30}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl py-2 px-4 text-white text-center placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mt-4">{user.displayName || 'Anonymous User'}</h2>
                {user.email && (
                  <p className="text-gray-400 text-sm mt-1">{user.email}</p>
                )}
                {/* Role badge - less prominent */}
                <span className="inline-block mt-2 px-3 py-1 bg-gray-700/50 text-gray-400 text-xs font-medium rounded-full capitalize">
                  {userProfile?.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-700 space-y-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving || (!selectedPhoto && editName === user.displayName)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-xl transition-colors"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  <span className="font-medium">{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  <span className="font-medium">Cancel</span>
                </button>
              </>
            ) : (
              <>
                {/* Edit Profile button - only for non-guests */}
                {!isGuest && onUpdateProfile && (
                  <button
                    onClick={() => {
                      setEditName(user.displayName || '');
                      setIsEditing(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                  >
                    <Pencil size={18} />
                    <span className="font-medium">Edit Profile</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onClose();
                    onViewHistory();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  <Clock size={18} />
                  <span className="font-medium">View History</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-medium">Log Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
