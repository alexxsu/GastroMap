import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Check, CheckCheck, Users, UserMinus, UserPlus, MapPin, Trash2, LogOut, Info, PartyPopper } from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'member_joined':
      return <UserPlus size={16} className="text-green-400" />;
    case 'member_left':
      return <LogOut size={16} className="text-yellow-400" />;
    case 'member_removed':
      return <UserMinus size={16} className="text-red-400" />;
    case 'join_approved':
      return <Check size={16} className="text-green-400" />;
    case 'post_added':
      return <MapPin size={16} className="text-blue-400" />;
    case 'post_deleted':
      return <Trash2 size={16} className="text-orange-400" />;
    case 'map_invite':
      return <Users size={16} className="text-purple-400" />;
    case 'welcome':
      return <PartyPopper size={16} className="text-yellow-400" />;
    case 'system':
    default:
      return <Info size={16} className="text-gray-400" />;
  }
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  unreadCount,
  isOpen,
  isClosing,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const { t, language } = useLanguage();

  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (language === 'zh') {
      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  if (!isOpen && !isClosing) return null;

  const handleBackdropClick = () => {
    if (!isClosing) {
      onClose();
    }
  };

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9990] bg-black/40 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Panel container - positioned under notification button */}
      {/* On mobile: right-4, On wider screens: aligned with centered header's right edge */}
      {/* Header is max-w-sm (24rem), panel is w-80 (20rem). To align right edges: left = 50%, translateX = -8rem */}
      <div 
        className="fixed top-20 z-[9991] w-80 max-h-[70vh] pointer-events-auto 
          right-4 
          sm:right-auto sm:left-1/2 sm:-translate-x-32"
      >
        <div
          className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
            isClosing
              ? 'opacity-0 -translate-y-2 scale-95'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
          style={{ transitionProperty: 'opacity, transform' }}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-400" />
              <span className="font-semibold text-white">{t('notifications')}</span>
              {unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAllAsRead();
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-500/10"
                >
                  <CheckCheck size={14} />
                  {language === 'zh' ? '全部已读' : 'Mark all'}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[60vh] overflow-y-auto bg-gray-900">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">{t('noNotifications')}</p>
                <p className="text-gray-600 text-xs mt-1">
                  {language === 'zh' ? '地图活动将在此处通知你' : "You'll be notified about map activity here"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notif.id);
                    }}
                    className={`w-full text-left p-3 flex items-start gap-2 hover:bg-gray-800/80 transition-colors ${
                      !notif.read ? 'bg-gray-900' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />
                        )}
                      </div>
                      <div className="text-sm text-gray-200">
                        {notif.message}
                      </div>
                      {notif.createdAt && (
                        <div className="mt-1 text-[11px] text-gray-500">
                          {formatTimeAgo(notif.createdAt)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
};

