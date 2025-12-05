import React, { useState, useRef } from 'react';
import { X, User as UserIcon, Clock, LogOut, Camera, Pencil, Loader2, Check, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { AppUser } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';

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
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.displayName || '');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen && !isClosing) return null;

  const isGuest = user.isAnonymous;
  const isAdmin = userProfile?.role === 'admin';

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
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
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-xs pointer-events-auto transform transition-all duration-200 overflow-hidden ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        >
          {/* Header with gradient background */}
          <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 pt-8 pb-16">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            {/* Admin badge */}
            {isAdmin && (
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
                <Shield size={12} />
                {t('admin')}
              </div>
            )}
          </div>

          {/* Profile Photo - overlapping header */}
          <div className="relative -mt-12 flex justify-center">
            <div className="relative">
              {displayPhoto ? (
                <img 
                  src={displayPhoto} 
                  alt="User" 
                  className="w-24 h-24 rounded-full border-4 border-gray-900 shadow-xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center border-4 border-gray-900 shadow-xl">
                  <UserIcon size={36} className="text-gray-500" />
                </div>
              )}

              {/* Edit photo button */}
              {isEditing && !isGuest && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-blue-500 hover:bg-blue-400 rounded-full text-white shadow-lg transition-colors"
                >
                  <Camera size={14} />
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
          </div>

          {/* User Info */}
          <div className="px-6 pt-4 pb-2 text-center">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('displayName')}
                  maxLength={30}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 px-4 text-white text-center placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white">
                  {user.displayName || userProfile?.displayName || 'Anonymous User'}
                </h2>
                {user.email && (
                  <p className="text-gray-500 text-sm mt-1">{user.email}</p>
                )}
              </>
            )}
          </div>

          {/* Divider */}
          <div className="mx-6 my-4 border-t border-gray-800" />

          {/* Action Buttons */}
          <div className="px-6 pb-6">
            {isEditing ? (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors text-sm font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || (!selectedPhoto && editName === user.displayName)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-colors text-sm font-medium"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {isSaving ? t('saving') : t('save')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Primary actions row */}
                <div className="flex gap-2">
                  {!isGuest && onUpdateProfile && (
                    <button
                      onClick={() => {
                        setEditName(user.displayName || '');
                        setIsEditing(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors text-sm font-medium"
                    >
                      <Pencil size={15} />
                      {t('edit')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      onViewHistory();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors text-sm font-medium"
                  >
                    <Clock size={15} />
                    {t('viewHistory')}
                  </button>
                </div>

                {/* Logout button - subtle, smaller, text-only style */}
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-gray-500 hover:text-red-400 transition-colors text-xs"
                >
                  <LogOut size={12} />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
