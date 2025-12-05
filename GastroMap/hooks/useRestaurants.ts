import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Restaurant, Visit, UserMap, ViewState, UserProfile } from '../types';
import { AppUser } from './useAuth';

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  saveVisit: (restaurantInfo: Restaurant, visit: Visit) => Promise<void>;
  updateVisit: (restaurantId: string, oldVisit: Visit, newVisit: Visit) => Promise<void>;
  deleteVisit: (restaurant: Restaurant, visitToDelete: Visit) => Promise<boolean>;
  clearDatabase: () => Promise<void>;
}

export function useRestaurants(
  user: AppUser | null,
  userProfile: UserProfile | null,
  activeMap: UserMap | null,
  viewState: ViewState,
  onViewStateChange: (state: ViewState) => void
): UseRestaurantsReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Data fetching subscription
  useEffect(() => {
    if (!user || viewState === ViewState.PENDING || viewState === ViewState.LOGIN) return;
    if (!activeMap) return;

    const restaurantsRef = collection(db, 'maps', activeMap.id, 'restaurants');

    const unsubscribe = onSnapshot(restaurantsRef, (snapshot) => {
      const fetchedRestaurants: Restaurant[] = [];
      const docsToDelete: any[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Restaurant;
        if (!data.visits || data.visits.length === 0) {
          docsToDelete.push(docSnapshot.ref);
        } else {
          fetchedRestaurants.push(data);
        }
      });

      // Delete empty restaurants after processing snapshot
      if (docsToDelete.length > 0) {
        Promise.all(docsToDelete.map(ref => deleteDoc(ref)))
          .catch(e => console.error("Auto-cleanup error:", e));
      }

      setRestaurants(fetchedRestaurants);

      // Update selected restaurant if it exists
      setSelectedRestaurant(prev => {
        if (!prev) return null;
        const updated = fetchedRestaurants.find(r => r.id === prev.id);
        if (updated) {
          return updated;
        } else {
          onViewStateChange(ViewState.MAP);
          return null;
        }
      });
    }, (error) => {
      console.error("Error fetching data:", error);
    });

    return () => unsubscribe();
  }, [user, viewState, activeMap, onViewStateChange]);

  const saveVisit = useCallback(async (restaurantInfo: Restaurant, visit: Visit) => {
    if (!user || !activeMap) throw new Error("No active user or map");

    // Build the best display name from all available sources
    // Priority: userProfile.displayName > user.displayName > user.email username > 'User'
    let creatorDisplayName = 'User';
    if (userProfile?.displayName && userProfile.displayName.trim()) {
      creatorDisplayName = userProfile.displayName;
    } else if (user.displayName && user.displayName.trim()) {
      creatorDisplayName = user.displayName;
    } else if (user.email) {
      // Use email username as fallback
      creatorDisplayName = user.email.split('@')[0];
    }
    
    // Build the best photo URL from all available sources
    const creatorPhotoURL = userProfile?.photoURL || user.photoURL || null;

    const fullVisit: Visit = {
      ...visit,
      createdBy: user.uid,
      creatorName: creatorDisplayName,
      creatorPhotoURL: creatorPhotoURL
    };

    const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurantInfo.id);
    const exists = restaurants.some(r => r.id === restaurantInfo.id);

    if (exists) {
      await updateDoc(restaurantRef, { visits: arrayUnion(fullVisit) });
    } else {
      const newRestaurant = { ...restaurantInfo, visits: [fullVisit] };
      await setDoc(restaurantRef, newRestaurant);
    }

    // Send notifications to other members if this is a shared map
    if (activeMap.visibility === 'shared' && activeMap.members && activeMap.members.length > 1) {
      const notificationsRef = collection(db, 'notifications');
      const batch = writeBatch(db);
      
      activeMap.members.forEach((memberUid: string) => {
        // Don't notify the person who added the post
        if (memberUid !== user.uid) {
          const newNotifRef = doc(notificationsRef);
          batch.set(newNotifRef, {
            recipientUid: memberUid,
            type: 'post_added',
            message: `${creatorDisplayName} added a memory at "${restaurantInfo.name}" to "${activeMap.name}"`,
            mapId: activeMap.id,
            mapName: activeMap.name,
            actorUid: user.uid,
            actorName: creatorDisplayName,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      });
      
      await batch.commit();
    }
  }, [user, userProfile, activeMap, restaurants]);

  const updateVisit = useCallback(async (restaurantId: string, oldVisit: Visit, newVisit: Visit) => {
    if (!user || !activeMap) return;

    const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurantId);
    const restaurantDoc = await getDoc(restaurantRef);

    if (restaurantDoc.exists()) {
      const currentData = restaurantDoc.data() as Restaurant;
      const updatedVisits = currentData.visits.map(v => v.id === oldVisit.id ? newVisit : v);
      await updateDoc(restaurantRef, { visits: updatedVisits });
    }
  }, [user, activeMap]);

  const deleteVisit = useCallback(async (restaurant: Restaurant, visitToDelete: Visit): Promise<boolean> => {
    if (!user || !activeMap) throw new Error("No active user or map");

    // Build the best display name from all available sources
    let creatorDisplayName = 'Someone';
    if (userProfile?.displayName && userProfile.displayName.trim()) {
      creatorDisplayName = userProfile.displayName;
    } else if (user.displayName && user.displayName.trim()) {
      creatorDisplayName = user.displayName;
    } else if (user.email) {
      creatorDisplayName = user.email.split('@')[0];
    }

    const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurant.id);
    const restaurantDoc = await getDoc(restaurantRef);

    if (restaurantDoc.exists()) {
      const currentData = restaurantDoc.data() as Restaurant;
      const updatedVisits = currentData.visits.filter(v => v.id !== visitToDelete.id);

      if (updatedVisits.length === 0) {
        await deleteDoc(restaurantRef);
        setSelectedRestaurant(null);
        
        // Send notifications for post deletion on shared map
        if (activeMap.visibility === 'shared' && activeMap.members && activeMap.members.length > 1) {
          const notificationsRef = collection(db, 'notifications');
          const batch = writeBatch(db);
          
          activeMap.members.forEach((memberUid: string) => {
            // Don't notify the person who deleted the post
            if (memberUid !== user.uid) {
              const newNotifRef = doc(notificationsRef);
              batch.set(newNotifRef, {
                recipientUid: memberUid,
                type: 'post_deleted',
                message: `${creatorDisplayName} removed a memory at "${restaurant.name}" from "${activeMap.name}"`,
                mapId: activeMap.id,
                mapName: activeMap.name,
                actorUid: user.uid,
                actorName: creatorDisplayName,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          });
          
          await batch.commit();
        }
        
        return true; // Restaurant was deleted
      } else {
        await updateDoc(restaurantRef, { visits: updatedVisits });
        
        // Send notifications for post deletion on shared map
        if (activeMap.visibility === 'shared' && activeMap.members && activeMap.members.length > 1) {
          const notificationsRef = collection(db, 'notifications');
          const batch = writeBatch(db);
          
          activeMap.members.forEach((memberUid: string) => {
            // Don't notify the person who deleted the post
            if (memberUid !== user.uid) {
              const newNotifRef = doc(notificationsRef);
              batch.set(newNotifRef, {
                recipientUid: memberUid,
                type: 'post_deleted',
                message: `${creatorDisplayName} removed a memory at "${restaurant.name}" from "${activeMap.name}"`,
                mapId: activeMap.id,
                mapName: activeMap.name,
                actorUid: user.uid,
                actorName: creatorDisplayName,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          });
          
          await batch.commit();
        }
        
        return false; // Restaurant still exists
      }
    }
    return false;
  }, [user, userProfile, activeMap]);

  const clearDatabase = useCallback(async () => {
    if (!activeMap) return;

    const deletePromises = restaurants.map(r =>
      deleteDoc(doc(db, "maps", activeMap.id, "restaurants", r.id))
    );
    await Promise.all(deletePromises);
  }, [activeMap, restaurants]);

  return {
    restaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    saveVisit,
    updateVisit,
    deleteVisit,
    clearDatabase
  };
}
