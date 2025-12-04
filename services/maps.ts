import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserMap } from '../types';

interface SimpleUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}

/**
 * Ensures a default private map exists for the given user.
 * Returns the UserMap object (existing or newly created).
 */
export async function ensureDefaultMapForUser(user: SimpleUser): Promise<UserMap> {
  const mapsRef = collection(db, 'maps');
  const q = query(
    mapsRef,
    where('ownerUid', '==', user.uid),
    where('isDefault', '==', true)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    const docSnap = snap.docs[0];
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      ownerUid: data.ownerUid,
      ownerDisplayName: data.ownerDisplayName,
      name: data.name,
      visibility: data.visibility,
      isDefault: data.isDefault,
      createdAt: data.createdAt?.toDate?.().toISOString?.(),
      updatedAt: data.updatedAt?.toDate?.().toISOString?.(),
    };
  }

  const ownerDisplayName = user.displayName || user.email || user.uid;

  const result = await addDoc(mapsRef, {
    ownerUid: user.uid,
    ownerDisplayName,
    name: 'Default Map',
    visibility: 'private',
    isDefault: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: result.id,
    ownerUid: user.uid,
    ownerDisplayName,
    name: 'Default Map',
    visibility: 'private',
    isDefault: true,
  };
}
