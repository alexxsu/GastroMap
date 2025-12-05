import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AppNotification, NotificationType } from '../types';
import { AppUser } from './useAuth';

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (params: CreateNotificationParams) => Promise<void>;
  notifyMapMembers: (params: NotifyMapMembersParams) => Promise<void>;
}

interface CreateNotificationParams {
  recipientUid: string;
  type: NotificationType;
  message: string;
  mapId?: string;
  mapName?: string;
  actorUid?: string;
  actorName?: string;
}

interface NotifyMapMembersParams {
  memberUids: string[];
  excludeUid?: string; // Usually the actor
  type: NotificationType;
  message: string;
  mapId: string;
  mapName: string;
  actorUid: string;
  actorName: string;
}

export function useNotifications(user: AppUser | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to user's notifications
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          recipientUid: d.recipientUid,
          type: d.type as NotificationType,
          mapId: d.mapId,
          mapName: d.mapName,
          actorUid: d.actorUid,
          actorName: d.actorName,
          message: d.message,
          read: d.read || false,
          createdAt: d.createdAt instanceof Timestamp
            ? d.createdAt.toDate().toISOString()
            : d.createdAt || new Date().toISOString(),
        };
      });
      setNotifications(notifs);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user || user.isAnonymous) return;

    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user || user.isAnonymous) return;

    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    const batch = writeBatch(db);
    unreadNotifs.forEach((notif) => {
      const notifRef = doc(db, 'notifications', notif.id);
      batch.update(notifRef, { read: true });
    });
    await batch.commit();
  }, [user, notifications]);

  const createNotification = useCallback(async (params: CreateNotificationParams) => {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      ...params,
      read: false,
      createdAt: serverTimestamp(),
    });
  }, []);

  const notifyMapMembers = useCallback(async (params: NotifyMapMembersParams) => {
    const { memberUids, excludeUid, type, message, mapId, mapName, actorUid, actorName } = params;

    const recipients = excludeUid
      ? memberUids.filter(uid => uid !== excludeUid)
      : memberUids;

    if (recipients.length === 0) return;

    const notificationsRef = collection(db, 'notifications');
    const batch = writeBatch(db);

    recipients.forEach((recipientUid) => {
      const newNotifRef = doc(notificationsRef);
      batch.set(newNotifRef, {
        recipientUid,
        type,
        message,
        mapId,
        mapName,
        actorUid,
        actorName,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    createNotification,
    notifyMapMembers,
  };
}
