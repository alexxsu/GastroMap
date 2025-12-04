import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, updateDoc, arrayUnion, query, where, or } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserMap, UserProfile } from '../types';
import { ensureDefaultMapForUser } from '../services/maps';
import { AppUser } from './useAuth';

interface UseMapsReturn {
  activeMap: UserMap | null;
  setActiveMap: (map: UserMap | null) => void;
  allMaps: UserMap[];
  userOwnMaps: UserMap[];
  userSharedMaps: UserMap[];
  userJoinedMaps: UserMap[];
  createSharedMap: (name: string) => Promise<void>;
  joinSharedMap: (code: string) => Promise<boolean>;
  leaveSharedMap: (mapId: string) => Promise<void>;
  kickMember: (mapId: string, memberUid: string) => Promise<void>;
}

export function useMaps(user: AppUser | null, userProfile: UserProfile | null): UseMapsReturn {
  const [activeMap, setActiveMap] = useState<UserMap | null>(null);
  const [allMaps, setAllMaps] = useState<UserMap[]>([]);
  const [userOwnMaps, setUserOwnMaps] = useState<UserMap[]>([]);
  const [userSharedMaps, setUserSharedMaps] = useState<UserMap[]>([]);
  const [userJoinedMaps, setUserJoinedMaps] = useState<UserMap[]>([]);

  // Ensure default map for approved non-guest users
  useEffect(() => {
    const setupMap = async () => {
      if (!user) {
        setActiveMap(null);
        setUserOwnMaps([]);
        setUserSharedMaps([]);
        setUserJoinedMaps([]);
        return;
      }

      if (user.uid === 'guest-user' || user.isAnonymous) {
        return;
      }

      if (!userProfile || userProfile.status !== 'approved') {
        return;
      }

      try {
        const map = await ensureDefaultMapForUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        });
        setActiveMap(map);
      } catch (err) {
        console.error('Failed to ensure default map:', err);
      }
    };

    setupMap();
  }, [user, userProfile]);

  // Admin: subscribe to all maps (for admin panel only)
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    if (!userProfile || userProfile.role !== 'admin') return;

    const mapsRef = collection(db, 'maps');
    const unsubscribe = onSnapshot(mapsRef, (snapshot) => {
      const data: UserMap[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          ownerUid: d.ownerUid,
          ownerDisplayName: d.ownerDisplayName,
          name: d.name,
          visibility: d.visibility,
          isDefault: d.isDefault,
          shareCode: d.shareCode,
          members: d.members,
          memberInfo: d.memberInfo,
          createdAt: d.createdAt?.toDate?.().toISOString?.() || d.createdAt,
          updatedAt: d.updatedAt?.toDate?.().toISOString?.() || d.updatedAt,
        };
      });
      setAllMaps(data);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  // Subscribe to user's OWN maps only (maps where user is owner)
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    if (!userProfile || userProfile.status !== 'approved') {
      setUserOwnMaps([]);
      setUserSharedMaps([]);
      return;
    }

    const mapsRef = collection(db, 'maps');
    // Query only maps owned by this user
    const ownMapsQuery = query(mapsRef, where('ownerUid', '==', user.uid));
    
    const unsubscribe = onSnapshot(ownMapsQuery, (snapshot) => {
      const ownMaps: UserMap[] = [];
      const sharedMaps: UserMap[] = [];

      snapshot.docs.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const mapData: UserMap = {
          id: docSnap.id,
          ownerUid: d.ownerUid,
          ownerDisplayName: d.ownerDisplayName,
          name: d.name,
          visibility: d.visibility,
          isDefault: d.isDefault,
          shareCode: d.shareCode,
          members: d.members,
          memberInfo: d.memberInfo,
          createdAt: d.createdAt?.toDate?.().toISOString?.() || d.createdAt,
          updatedAt: d.updatedAt?.toDate?.().toISOString?.() || d.updatedAt,
        };

        ownMaps.push(mapData);
        if (d.visibility === 'shared') {
          sharedMaps.push(mapData);
        }
      });

      setUserOwnMaps(ownMaps);
      setUserSharedMaps(sharedMaps);
    }, (error) => {
      console.error('Error fetching own maps:', error);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  // Subscribe to maps the user has JOINED (not owned, but is a member)
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    if (!userProfile || userProfile.status !== 'approved') {
      setUserJoinedMaps([]);
      return;
    }

    const mapsRef = collection(db, 'maps');
    // Query maps where user is in the members array
    const joinedMapsQuery = query(mapsRef, where('members', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(joinedMapsQuery, (snapshot) => {
      const joinedMaps: UserMap[] = [];

      snapshot.docs.forEach((docSnap) => {
        const d = docSnap.data() as any;
        // Exclude maps the user owns (those are in userOwnMaps)
        if (d.ownerUid === user.uid) return;

        const mapData: UserMap = {
          id: docSnap.id,
          ownerUid: d.ownerUid,
          ownerDisplayName: d.ownerDisplayName,
          name: d.name,
          visibility: d.visibility,
          isDefault: d.isDefault,
          shareCode: d.shareCode,
          members: d.members,
          memberInfo: d.memberInfo,
          createdAt: d.createdAt?.toDate?.().toISOString?.() || d.createdAt,
          updatedAt: d.updatedAt?.toDate?.().toISOString?.() || d.updatedAt,
        };

        joinedMaps.push(mapData);
      });

      setUserJoinedMaps(joinedMaps);
    }, (error) => {
      console.error('Error fetching joined maps:', error);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  const generateShareCode = async (): Promise<string> => {
    const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

    for (let i = 0; i < 10; i++) {
      const code = generateCode();
      const mapsRef = collection(db, 'maps');
      const snapshot = await getDocs(mapsRef);
      const existingCodes = snapshot.docs.map(d => d.data().shareCode).filter(Boolean);

      if (!existingCodes.includes(code)) {
        return code;
      }
    }

    return Date.now().toString().slice(-4);
  };

  const createSharedMap = useCallback(async (name: string) => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in to create shared maps');
    }

    if (userSharedMaps.length >= 3) {
      throw new Error('Maximum of 3 shared maps allowed');
    }

    const shareCode = await generateShareCode();
    const mapId = `shared_${user.uid}_${Date.now()}`;

    const creatorMemberInfo = {
      uid: user.uid,
      displayName: user.displayName || user.email || user.uid,
      photoURL: user.photoURL,
      joinedAt: new Date().toISOString()
    };

    const newMap = {
      id: mapId,
      ownerUid: user.uid,
      ownerDisplayName: user.displayName || user.email || user.uid,
      name: name,
      visibility: 'shared',
      isDefault: false,
      shareCode: shareCode,
      members: [user.uid],
      memberInfo: [creatorMemberInfo],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'maps', mapId), newMap);
  }, [user, userSharedMaps.length]);

  const joinSharedMap = useCallback(async (code: string): Promise<boolean> => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in to join shared maps');
    }

    const totalSharedMaps = userSharedMaps.length + userJoinedMaps.length;
    if (totalSharedMaps >= 3) {
      throw new Error('You can only be part of 3 shared maps total');
    }

    // Query for the shared map with this code
    const mapsRef = collection(db, 'maps');
    const sharedMapQuery = query(
      mapsRef, 
      where('shareCode', '==', code),
      where('visibility', '==', 'shared')
    );
    const snapshot = await getDocs(sharedMapQuery);

    if (snapshot.empty) {
      return false;
    }

    const docSnap = snapshot.docs[0];
    const foundMap = docSnap.data();
    const foundMapId = docSnap.id;

    if (foundMap.members && foundMap.members.includes(user.uid)) {
      return true;
    }

    const currentMemberCount = foundMap.memberInfo?.length || 1;
    if (currentMemberCount >= 10) {
      throw new Error('This map has reached its member limit (10 members)');
    }

    const mapRef = doc(db, 'maps', foundMapId);
    const newMemberInfo = {
      uid: user.uid,
      displayName: user.displayName || user.email || user.uid,
      photoURL: user.photoURL,
      joinedAt: new Date().toISOString()
    };

    await updateDoc(mapRef, {
      members: arrayUnion(user.uid),
      memberInfo: arrayUnion(newMemberInfo)
    });

    return true;
  }, [user, userSharedMaps.length, userJoinedMaps.length]);

  const leaveSharedMap = useCallback(async (mapId: string): Promise<void> => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in');
    }

    const mapRef = doc(db, 'maps', mapId);
    const mapDoc = await getDoc(mapRef);

    if (!mapDoc.exists()) {
      throw new Error('Map not found');
    }

    const mapData = mapDoc.data();
    const updatedMembers = (mapData.members || []).filter((uid: string) => uid !== user.uid);
    const updatedMemberInfo = (mapData.memberInfo || []).filter((m: any) => m.uid !== user.uid);

    await updateDoc(mapRef, {
      members: updatedMembers,
      memberInfo: updatedMemberInfo
    });

    if (activeMap?.id === mapId) {
      const defaultMap = userOwnMaps.find(m => m.isDefault);
      if (defaultMap) {
        setActiveMap(defaultMap);
      }
    }
  }, [user, activeMap, userOwnMaps]);

  const kickMember = useCallback(async (mapId: string, memberUid: string): Promise<void> => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in');
    }

    const mapRef = doc(db, 'maps', mapId);
    const mapDoc = await getDoc(mapRef);

    if (!mapDoc.exists()) {
      throw new Error('Map not found');
    }

    const mapData = mapDoc.data();

    if (mapData.ownerUid !== user.uid) {
      throw new Error('Only the map owner can remove members');
    }

    const updatedMembers = (mapData.members || []).filter((uid: string) => uid !== memberUid);
    const updatedMemberInfo = (mapData.memberInfo || []).filter((m: any) => m.uid !== memberUid);

    await updateDoc(mapRef, {
      members: updatedMembers,
      memberInfo: updatedMemberInfo
    });
  }, [user]);

  return {
    activeMap,
    setActiveMap,
    allMaps,
    userOwnMaps,
    userSharedMaps,
    userJoinedMaps,
    createSharedMap,
    joinSharedMap,
    leaveSharedMap,
    kickMember
  };
}
