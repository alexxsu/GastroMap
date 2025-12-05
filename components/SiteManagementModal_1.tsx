import React, { useState, useEffect } from 'react';
import { X, Users, Check, XIcon, Trash2, Loader2, ChevronRight, ArrowLeft, Shield, Mail, Clock, Map, Globe, UserPlus, LogIn, MapPin, Calendar, CheckCircle, XCircle, Send } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface UserWithId extends UserProfile {
  id: string;
}

interface UserStats {
  sharedMapsCreated: number;
  joinedMaps: number;
  totalExperiences: number;
}

interface SiteManagementModalProps {
  onClose: () => void;
}

type ManagementView = 'menu' | 'users' | 'userDetail';

export const SiteManagementModal: React.FC<SiteManagementModalProps> = ({
  onClose
}) => {
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [currentView, setCurrentView] = useState<ManagementView>('menu');
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'back'>('forward');
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const navigateTo = (view: ManagementView) => {
    setTransitionDirection('forward');
    setIsViewTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsViewTransitioning(false);
    }, 150);
  };

  const goBack = () => {
    setTransitionDirection('back');
    setIsViewTransitioning(true);
    setTimeout(() => {
      if (currentView === 'userDetail') {
        setCurrentView('users');
        setSelectedUser(null);
        setUserStats(null);
        setReminderSent(false);
      } else {
        setCurrentView('menu');
      }
      setIsViewTransitioning(false);
    }, 150);
  };

  // Send verification reminder notification to user
  const sendVerificationReminder = async (userId: string, userEmail: string) => {
    setIsSendingReminder(true);
    try {
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        recipientUid: userId,
        type: 'system',
        message: language === 'zh' 
          ? '请验证您的邮箱地址。登录后，前往设置重新发送验证邮件。'
          : 'Please verify your email address. After logging in, go to Settings to resend the verification email.',
        read: false,
        createdAt: serverTimestamp(),
      });
      setReminderSent(true);
    } catch (error) {
      console.error('Error sending verification reminder:', error);
      alert(language === 'zh' ? '发送提醒失败' : 'Failed to send reminder');
    } finally {
      setIsSendingReminder(false);
    }
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

  // Fetch user stats (maps created, joined, experiences)
  const fetchUserStats = async (userId: string) => {
    setIsLoadingStats(true);
    try {
      // Fetch all maps to count shared maps created and joined
      const mapsRef = collection(db, 'maps');
      const mapsSnapshot = await getDocs(mapsRef);
      
      let sharedMapsCreated = 0;
      let joinedMaps = 0;
      
      mapsSnapshot.forEach((doc) => {
        const mapData = doc.data();
        // Count shared maps created by this user
        if (mapData.createdBy === userId && mapData.isShared) {
          sharedMapsCreated++;
        }
        // Count maps joined (where user is a member but not the creator)
        if (mapData.members && Array.isArray(mapData.members)) {
          if (mapData.members.includes(userId) && mapData.createdBy !== userId) {
            joinedMaps++;
          }
        }
      });
      
      // Fetch total experiences logged by this user
      const restaurantsRef = collection(db, 'restaurants');
      const restaurantsSnapshot = await getDocs(restaurantsRef);
      
      let totalExperiences = 0;
      
      restaurantsSnapshot.forEach((doc) => {
        const restaurantData = doc.data();
        if (restaurantData.visits && Array.isArray(restaurantData.visits)) {
          restaurantData.visits.forEach((visit: any) => {
            if (visit.addedBy === userId) {
              totalExperiences++;
            }
          });
        }
      });
      
      setUserStats({
        sharedMapsCreated,
        joinedMaps,
        totalExperiences
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setUserStats({
        sharedMapsCreated: 0,
        joinedMaps: 0,
        totalExperiences: 0
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // View user detail
  const viewUserDetail = (user: UserWithId) => {
    setSelectedUser(user);
    setUserStats(null);
    setReminderSent(false);
    setTransitionDirection('forward');
    setIsViewTransitioning(true);
    setTimeout(() => {
      setCurrentView('userDetail');
      setIsViewTransitioning(false);
      fetchUserStats(user.id);
    }, 150);
  };

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

  const getLoginMethod = (user: UserWithId): { method: string; icon: React.ReactNode; color: string } => {
    // Check provider from the user profile
    if (user.provider === 'google.com' || user.email?.endsWith('@gmail.com') && !user.provider) {
      return { 
        method: 'Google', 
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        ),
        color: 'bg-white text-gray-800'
      };
    }
    // Default to email/password
    return { 
      method: language === 'zh' ? '邮箱密码' : 'Email/Password', 
      icon: <Mail size={14} />,
      color: 'bg-blue-500/20 text-blue-300'
    };
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
                {currentView === 'userDetail' && (language === 'zh' ? '用户详情' : 'User Details')}
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
            <div className={`p-4 space-y-2 transition-all duration-150 ${
              isViewTransitioning 
                ? transitionDirection === 'back' 
                  ? 'opacity-0 translate-x-4' 
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
              <button
                onClick={() => navigateTo('users')}
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
            </div>
          )}

          {/* User Management View */}
          {currentView === 'users' && (
            <div className={`p-4 transition-all duration-150 ${
              isViewTransitioning 
                ? transitionDirection === 'forward' 
                  ? 'opacity-0 translate-x-4' 
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
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
                    <p className="text-xs text-gray-500 mb-2">
                      {language === 'zh' ? '点击查看用户详情' : 'Click to view user details'}
                    </p>
                    {approvedUsers.length === 0 ? (
                      <div className="text-gray-500 text-center py-4 bg-gray-700/30 rounded-xl border border-dashed border-gray-600">
                        {t('noApprovedUsers')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {approvedUsers.map((user) => (
                          <div 
                            key={user.id}
                            onClick={() => viewUserDetail(user)}
                            className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600 rounded-xl cursor-pointer hover:bg-gray-700 hover:border-gray-500 transition group"
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
                              <ChevronRight size={18} className="text-gray-500 group-hover:text-white transition" />
                              {actionLoading === user.id ? (
                                <Loader2 size={18} className="animate-spin text-gray-400" />
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(user.id, user.email);
                                  }}
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

          {/* User Detail View */}
          {currentView === 'userDetail' && selectedUser && (
            <div className={`p-4 transition-all duration-150 ${
              isViewTransitioning 
                ? transitionDirection === 'forward' 
                  ? 'opacity-0 translate-x-4' 
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
              {/* User Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {(selectedUser.displayName || selectedUser.email || '?').charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {selectedUser.displayName || selectedUser.email}
                </h3>
                <p className="text-sm text-gray-400">{selectedUser.email}</p>
                {selectedUser.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                    <Shield size={12} />
                    {t('admin')}
                  </span>
                )}
              </div>

              {/* Account Info */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  {language === 'zh' ? '账户信息' : 'Account Info'}
                </h4>
                
                {/* Email Verification Status */}
                <div className="p-3 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {language === 'zh' ? '邮箱验证' : 'Email Verified'}
                      </span>
                    </div>
                    {selectedUser.emailVerified ? (
                      <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2.5 py-1 rounded-full">
                        <CheckCircle size={12} />
                        {language === 'zh' ? '已验证' : 'Verified'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-300 px-2.5 py-1 rounded-full">
                        <XCircle size={12} />
                        {language === 'zh' ? '未验证' : 'Not Verified'}
                      </span>
                    )}
                  </div>
                  
                  {/* Send Verification Reminder Button - only show if not verified */}
                  {!selectedUser.emailVerified && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      {reminderSent ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle size={16} />
                          {language === 'zh' ? '提醒已发送！用户下次登录时会看到通知。' : 'Reminder sent! User will see notification on next login.'}
                        </div>
                      ) : (
                        <button
                          onClick={() => sendVerificationReminder(selectedUser.id, selectedUser.email)}
                          disabled={isSendingReminder}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition text-sm disabled:opacity-50"
                        >
                          {isSendingReminder ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                          {language === 'zh' ? '发送验证提醒' : 'Send Verification Reminder'}
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {language === 'zh' 
                          ? '这将向用户发送一条通知，提醒他们验证邮箱。' 
                          : 'This will send a notification reminding the user to verify their email.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Login Method */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <LogIn size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {language === 'zh' ? '登录方式' : 'Login Method'}
                    </span>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${getLoginMethod(selectedUser).color}`}>
                    {getLoginMethod(selectedUser).icon}
                    {getLoginMethod(selectedUser).method}
                  </span>
                </div>

                {/* Join Date */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {language === 'zh' ? '加入日期' : 'Joined Date'}
                    </span>
                  </div>
                  <span className="text-sm text-white">
                    {formatDate(selectedUser.createdAt)}
                  </span>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  {language === 'zh' ? '活动统计' : 'Activity Stats'}
                </h4>
                
                {isLoadingStats ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-blue-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      {language === 'zh' ? '加载统计数据...' : 'Loading stats...'}
                    </p>
                  </div>
                ) : userStats ? (
                  <div className="grid grid-cols-3 gap-3">
                    {/* Shared Maps Created */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Globe size={14} className="text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">{userStats.sharedMapsCreated}</p>
                      <p className="text-xs text-gray-400">
                        {language === 'zh' ? '创建共享地图' : 'Shared Maps'}
                      </p>
                    </div>

                    {/* Joined Maps */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <UserPlus size={14} className="text-green-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">{userStats.joinedMaps}</p>
                      <p className="text-xs text-gray-400">
                        {language === 'zh' ? '加入的地图' : 'Joined Maps'}
                      </p>
                    </div>

                    {/* Total Experiences */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <MapPin size={14} className="text-purple-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">{userStats.totalExperiences}</p>
                      <p className="text-xs text-gray-400">
                        {language === 'zh' ? '体验记录' : 'Experiences'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {language === 'zh' ? '无法加载统计数据' : 'Failed to load stats'}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    handleDeleteUser(selectedUser.id, selectedUser.email);
                    goBack();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition"
                >
                  <Trash2 size={18} />
                  {language === 'zh' ? '删除用户' : 'Delete User'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
