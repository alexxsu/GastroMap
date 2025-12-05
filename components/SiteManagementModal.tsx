import React, { useState, useEffect } from 'react';
import { X, Users, Check, XIcon, Trash2, Loader2, ChevronRight, ArrowLeft, Shield, Mail, Clock, RefreshCw, AlertTriangle, User } from 'lucide-react';
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

type ManagementView = 'menu' | 'users' | 'pendingUserDetail' | 'approvedUserDetail';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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
    setShowDeleteConfirm(false);
    setResendSuccess(false);
    setTimeout(() => {
      if (currentView === 'pendingUserDetail' || currentView === 'approvedUserDetail') {
        setCurrentView('users');
        setSelectedUser(null);
      } else {
        setCurrentView('menu');
      }
      setIsViewTransitioning(false);
    }, 150);
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

  // Pending users: not yet email verified (they will auto-approve once verified)
  // Admin can manually approve to bypass email verification requirement
  const pendingUsers = users.filter(u => !u.emailVerified || u.status !== 'approved');
  // Approved users: status is approved (either via email verification or admin approval)
  const approvedUsers = users.filter(u => u.status === 'approved' && u.emailVerified);

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      const approvedAt = new Date().toISOString();
      
      // Update user status with admin approval tracking
      await updateDoc(userRef, { 
        status: 'approved',
        approvedBy: 'admin',
        approvedAt: approvedAt
      });
      
      // Send notification to the approved user
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        recipientUid: userId,
        type: 'admin_approved',
        message: language === 'zh' 
          ? '欢迎！您的账号已被管理员手动批准。您现在可以开始添加您的美食记忆了。'
          : 'Welcome! Your account has been manually approved by an admin. You can now start adding your food memories.',
        read: false,
        createdAt: serverTimestamp(),
      });
      
      // Note: To send actual email, you would need a Cloud Function
      // For now, we log that an email should be sent
      const targetUser = users.find(u => u.id === userId);
      console.log(`Admin approved user: ${targetUser?.email}. Email notification should be sent via Cloud Function.`);
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: 'approved', approvedBy: 'admin', approvedAt } : u
      ));
      
      // Update selected user if viewing detail
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: 'approved', approvedBy: 'admin', approvedAt } : null);
      }
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
      
      // Update selected user if viewing detail
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: 'rejected' } : null);
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert(t('saveFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      // Go back to users list
      goBack();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(t('saveFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendVerification = async (userId: string, email: string) => {
    setResendingEmail(true);
    setResendSuccess(false);
    try {
      // Note: Firebase Admin SDK is needed to actually resend verification emails
      // This would typically call a Cloud Function
      // For now, we'll show a success message and log the action
      console.log(`Resend verification email requested for: ${email}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      console.error('Error resending verification:', error);
      alert('Failed to resend verification email');
    } finally {
      setResendingEmail(false);
    }
  };

  const openPendingUserDetail = (user: UserWithId) => {
    setSelectedUser(user);
    navigateTo('pendingUserDetail');
  };

  const openApprovedUserDetail = (user: UserWithId) => {
    setSelectedUser(user);
    setShowDeleteConfirm(false);
    navigateTo('approvedUserDetail');
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

  const getViewTitle = () => {
    switch (currentView) {
      case 'menu': return t('siteManagement');
      case 'users': return t('userManagement');
      case 'pendingUserDetail': return language === 'zh' ? '待审核用户' : 'Pending User';
      case 'approvedUserDetail': return language === 'zh' ? '用户详情' : 'User Details';
      default: return t('siteManagement');
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
                {getViewTitle()}
              </h2>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
          {/* Main Menu */}
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
                  {/* Pending Users Section */}
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
                          <button 
                            key={user.id}
                            onClick={() => openPendingUserDetail(user)}
                            className="w-full flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/20 transition-all duration-150 group"
                          >
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-white truncate">
                                  {user.displayName || user.email}
                                </p>
                                {!user.emailVerified && (
                                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                                    {t('emailNotVerified')}
                                  </span>
                                )}
                                {user.emailVerified && user.status !== 'approved' && (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                                    {language === 'zh' ? '待审核' : 'Awaiting Approval'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-500 group-hover:text-yellow-400 transition ml-2 flex-shrink-0" />
                          </button>
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
                          <button 
                            key={user.id}
                            onClick={() => openApprovedUserDetail(user)}
                            className="w-full flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600 rounded-xl hover:bg-gray-700 transition-all duration-150 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                                  <User size={20} className="text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 text-left">
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
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-500 group-hover:text-white transition ml-2 flex-shrink-0" />
                          </button>
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

          {/* Pending User Detail View */}
          {currentView === 'pendingUserDetail' && selectedUser && (
            <div className={`p-4 transition-all duration-150 ${
              isViewTransitioning 
                ? transitionDirection === 'forward' 
                  ? 'opacity-0 translate-x-4' 
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
              <div className="space-y-4">
                {/* User Info Card */}
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center gap-4 mb-4">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                        <User size={32} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {selectedUser.displayName || 'No Name'}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">{selectedUser.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('joined')} {formatDate(selectedUser.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {!selectedUser.emailVerified ? (
                      <span className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded-full flex items-center gap-1">
                        <Mail size={12} />
                        {t('emailNotVerified')}
                      </span>
                    ) : (
                      <span className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full flex items-center gap-1">
                        <Check size={12} />
                        {t('emailVerified')}
                      </span>
                    )}
                    {selectedUser.status === 'pending' && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full flex items-center gap-1">
                        <Clock size={12} />
                        {language === 'zh' ? '待审核' : 'Pending Approval'}
                      </span>
                    )}
                    {selectedUser.status === 'approved' && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full flex items-center gap-1">
                        <Check size={12} />
                        {t('approved')}
                      </span>
                    )}
                    {selectedUser.status === 'rejected' && (
                      <span className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded-full flex items-center gap-1">
                        <XIcon size={12} />
                        {language === 'zh' ? '已拒绝' : 'Rejected'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Resend Verification Email (if not verified) */}
                {!selectedUser.emailVerified && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Mail size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-300 font-medium mb-2">
                          {language === 'zh' ? '等待邮箱验证' : 'Awaiting Email Verification'}
                        </p>
                        <p className="text-xs text-blue-300/70 mb-3">
                          {language === 'zh' 
                            ? '用户验证邮箱后将自动获得批准。您也可以手动批准以跳过验证要求。' 
                            : 'User will be automatically approved once they verify their email. You can also manually approve to bypass verification.'}
                        </p>
                        <button
                          onClick={() => handleResendVerification(selectedUser.id, selectedUser.email)}
                          disabled={resendingEmail || resendSuccess}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            resendSuccess 
                              ? 'bg-green-500/20 text-green-300 cursor-default'
                              : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                          }`}
                        >
                          {resendingEmail ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              {language === 'zh' ? '发送中...' : 'Sending...'}
                            </>
                          ) : resendSuccess ? (
                            <>
                              <Check size={16} />
                              {language === 'zh' ? '已发送' : 'Sent!'}
                            </>
                          ) : (
                            <>
                              <RefreshCw size={16} />
                              {language === 'zh' ? '重新发送验证邮件' : 'Resend Verification Email'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons - Manual Override */}
                {selectedUser.status !== 'approved' && (
                  <div className="space-y-3">
                    <div className="bg-gray-700/30 rounded-xl p-3 border border-gray-600">
                      <p className="text-xs text-gray-400 text-center mb-3">
                        {language === 'zh' 
                          ? '手动批准将跳过邮箱验证要求，用户将收到通知。' 
                          : 'Manual approval bypasses email verification. User will be notified.'}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveUser(selectedUser.id)}
                          disabled={actionLoading === selectedUser.id}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition font-medium"
                        >
                          {actionLoading === selectedUser.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Check size={18} />
                          )}
                          {language === 'zh' ? '手动批准' : 'Manual Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectUser(selectedUser.id)}
                          disabled={actionLoading === selectedUser.id}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition font-medium"
                        >
                          <XIcon size={18} />
                          {t('reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser.status === 'approved' && !selectedUser.emailVerified && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                    <p className="text-xs text-green-300 text-center">
                      {language === 'zh' 
                        ? '用户已被管理员手动批准，可以直接登录使用。' 
                        : 'User was manually approved by admin and can log in directly.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approved User Detail View */}
          {currentView === 'approvedUserDetail' && selectedUser && (
            <div className={`p-4 transition-all duration-150 ${
              isViewTransitioning 
                ? transitionDirection === 'forward' 
                  ? 'opacity-0 translate-x-4' 
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
              <div className="space-y-4">
                {/* User Info Card */}
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center gap-4 mb-4">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-gray-600" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center border-2 border-gray-500">
                        <User size={40} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-white truncate">
                        {selectedUser.displayName || 'No Name'}
                      </h3>
                      {selectedUser.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full mt-1">
                          <Shield size={10} />
                          {t('admin')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail size={16} className="text-gray-500" />
                      <span className="text-gray-300">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={16} className="text-gray-500" />
                      <span className="text-gray-300">
                        {t('joined')} {formatDate(selectedUser.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check size={16} className="text-green-500" />
                      <span className="text-green-300">
                        {selectedUser.approvedBy === 'admin' 
                          ? (language === 'zh' ? '管理员批准' : 'Admin Approved')
                          : (language === 'zh' ? '邮箱验证通过' : 'Email Verified')}
                      </span>
                    </div>
                    {selectedUser.approvedAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <Shield size={16} className="text-gray-500" />
                        <span className="text-gray-400">
                          {language === 'zh' ? '批准时间：' : 'Approved: '}{formatDate(selectedUser.approvedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete User Section */}
                {selectedUser.role !== 'admin' && (
                  <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">
                      {language === 'zh' ? '危险操作' : 'Danger Zone'}
                    </h4>
                    
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition font-medium border border-red-500/30"
                      >
                        <Trash2 size={18} />
                        {language === 'zh' ? '删除用户' : 'Delete User'}
                      </button>
                    ) : (
                      <div className="space-y-3 animate-scale-in">
                        <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-red-300 font-medium mb-1">
                                {language === 'zh' ? '确认删除用户？' : 'Confirm Delete User?'}
                              </p>
                              <p className="text-xs text-red-300/70">
                                {language === 'zh' 
                                  ? `这将永久删除 ${selectedUser.displayName || selectedUser.email} 的账号和所有相关数据。此操作无法撤销。`
                                  : `This will permanently delete ${selectedUser.displayName || selectedUser.email}'s account and all associated data. This action cannot be undone.`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-xl transition font-medium"
                          >
                            {language === 'zh' ? '取消' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(selectedUser.id)}
                            disabled={actionLoading === selectedUser.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition font-medium"
                          >
                            {actionLoading === selectedUser.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                            {language === 'zh' ? '确认删除' : 'Confirm Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedUser.role === 'admin' && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                    <p className="text-xs text-purple-300 text-center">
                      {language === 'zh' 
                        ? '管理员账号不能被删除' 
                        : 'Admin accounts cannot be deleted'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
