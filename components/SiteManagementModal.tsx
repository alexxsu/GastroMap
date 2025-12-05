import React, { useState, useEffect } from 'react';
import { X, Users, Check, XIcon, Trash2, Loader2, ChevronRight, ArrowLeft, Shield, Mail, Clock } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface UserWithId extends UserProfile {
  id: string;
}

interface SiteManagementModalProps {
  onClose: () => void;
}

type ManagementView = 'menu' | 'users';

export const SiteManagementModal: React.FC<SiteManagementModalProps> = ({
  onClose
}) => {
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [currentView, setCurrentView] = useState<ManagementView>('menu');
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const goBack = () => {
    setCurrentView('menu');
  };

  // Fetch all users
  const fetchUsers = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList: UserWithId[] = [];
      snapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          ...doc.data() as UserProfile
        });
      });
      // Sort by createdAt, newest first
      usersList.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setUsers(usersList);
      
      if (usersList.length === 0) {
        console.log('No users found in collection');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setFetchError(error.message || 'Failed to fetch users. Check Firestore rules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'users') {
      fetchUsers();
    }
  }, [currentView]);

  const approvedUsers = users.filter(u => u.status === 'approved');
  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: 'approved' });
      
      // Send notification to the approved user
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        recipientUid: userId,
        type: 'join_approved',
        message: 'Welcome! Your account has been approved. You can now start adding your food memories.',
        read: false,
        createdAt: serverTimestamp(),
      });
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: 'approved' } : u
      ));
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!window.confirm(t('confirmRejectUser'))) {
      return;
    }
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: 'rejected' });
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: 'rejected' } : u
      ));
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert(t('saveFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(t('confirmDeleteUser'))) {
      return;
    }
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(t('saveFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`bg-gray-800 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-3">
            {currentView !== 'menu' && (
              <button 
                onClick={goBack}
                className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-purple-400" />
              <h2 className="text-lg font-semibold text-white">
                {currentView === 'menu' && t('siteManagement')}
                {currentView === 'users' && t('userManagement')}
              </h2>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Menu View */}
          {currentView === 'menu' && (
            <div className="p-4 space-y-2">
              <button
                onClick={() => setCurrentView('users')}
                className="w-full flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users size={20} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">{t('userManagement')}</p>
                    <p className="text-sm text-gray-400">{t('approveRejectUsers')}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition" />
              </button>
              
              {/* Placeholder for future options */}
              <div className="pt-4 border-t border-gray-700 mt-4">
                <p className="text-xs text-gray-500 text-center">{t('moreOptionsSoon')}</p>
              </div>
            </div>
          )}

          {/* User Management View */}
          {currentView === 'users' && (
            <div className="p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-blue-400 mb-3" />
                  <p className="text-gray-400">{t('loadingUsers')}</p>
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-center">
                    <p className="text-red-300 font-medium mb-2">{t('failedToLoad')}</p>
                    <p className="text-red-400/70 text-sm mb-4">{fetchError}</p>
                    <button
                      onClick={fetchUsers}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition text-sm"
                    >
                      {t('tryAgain')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Users Section - Always show */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={16} className="text-yellow-400" />
                      <h3 className="text-sm font-medium text-yellow-400 uppercase tracking-wide">
                        {t('pendingUsers')} ({pendingUsers.length})
                      </h3>
                    </div>
                    {pendingUsers.length === 0 ? (
                      <div className="text-gray-500 text-center py-4 bg-gray-700/30 rounded-xl border border-dashed border-gray-600">
                        {t('noPendingUsers')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingUsers.map((user) => (
                          <div 
                            key={user.id}
                            className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-white truncate">
                                  {user.displayName || user.email}
                                </p>
                                {!user.emailVerified && (
                                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                                    {t('emailNotVerified')}
                                  </span>
                                )}
                                {user.emailVerified && (
                                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                                    {t('emailVerified')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                              <p className="text-xs text-gray-500">{t('joined')} {formatDate(user.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {actionLoading === user.id ? (
                                <Loader2 size={18} className="animate-spin text-gray-400" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleApproveUser(user.id)}
                                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition"
                                    title={t('approve')}
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectUser(user.id)}
                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                                    title={t('reject')}
                                  >
                                    <XIcon size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Approved Users Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Check size={16} className="text-green-400" />
                      <h3 className="text-sm font-medium text-green-400 uppercase tracking-wide">
                        {t('approvedUsers')} ({approvedUsers.length})
                      </h3>
                    </div>
                    {approvedUsers.length === 0 ? (
                      <div className="text-gray-500 text-center py-4 bg-gray-700/30 rounded-xl border border-dashed border-gray-600">
                        {t('noApprovedUsers')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {approvedUsers.map((user) => (
                          <div 
                            key={user.id}
                            className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600 rounded-xl"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white truncate">
                                  {user.displayName || user.email}
                                </p>
                                {user.role === 'admin' && (
                                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                    {t('admin')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                              <p className="text-xs text-gray-500">{t('joined')} {formatDate(user.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {actionLoading === user.id ? (
                                <Loader2 size={18} className="animate-spin text-gray-400" />
                              ) : (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                                  title={t('delete')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500 text-center">
                      {t('totalUsers')}: {users.length} • {t('pending')}: {pendingUsers.length} • {t('approved')}: {approvedUsers.length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
