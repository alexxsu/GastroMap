import React from 'react';
import { Bell, X, Check, CheckCheck, Users, UserMinus, UserPlus, MapPin, Trash2, LogOut, Info } from 'lucide-react';
import { AppNotification, NotificationType } from '../types';

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
    case 'system':
    default:
      return <Info size={16} className="text-gray-400" />;
  }
};

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute top-full right-0 mt-2 w-80 max-h-[70vh] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[91] transition-all duration-200 ${
          isClosing ? 'opacity-0 scale-95 translate-y-[-10px]' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-400" />
            <span className="font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                title="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No notifications yet</p>
              <p className="text-gray-600 text-xs mt-1">
                You'll be notified about map activity here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-gray-700/30 transition cursor-pointer ${
                    !notif.read ? 'bg-blue-500/5' : ''
                  }`}
                  onClick={() => !notif.read && onMarkAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        {getNotificationIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.read ? 'text-white' : 'text-gray-300'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {notif.mapName && (
                          <span className="text-xs text-gray-500 truncate">
                            {notif.mapName}
                          </span>
                        )}
                        <span className="text-xs text-gray-600">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!notif.read && (
                      <div className="flex-shrink-0">
                        <span className="w-2 h-2 bg-blue-500 rounded-full block" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
