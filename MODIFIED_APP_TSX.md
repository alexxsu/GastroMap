# Modified Code for Persistent Guest User & Demo Map

## Changes Required in App.tsx

### Replace the `handleGuestLogin` function (around line 344-377)

**BEFORE (Current Code):**
```javascript
const handleGuestLogin = async () => {
  const guestProfile: UserProfile = {
    uid: 'guest-user',
    displayName: 'Guest',
    email: 'guest@tracebook.app',
    status: 'approved',
    role: 'user',
    createdAt: new Date().toISOString()
  };

  const guestUser = {
    uid: 'guest-user',
    displayName: 'Guest',
    photoURL: null,
    email: 'guest@tracebook.app',
    isAnonymous: true
  };

  setUser(guestUser);
  setUserProfile(guestProfile);
  
  // Set a demo map for guest users
  const demoMap: UserMap = {
    id: 'demo-map',
    ownerUid: 'guest-user',
    ownerDisplayName: 'Demo',
    name: 'Demo Map',
    visibility: 'public',
    isDefault: true,
    createdAt: new Date().toISOString()
  };
  setActiveMap(demoMap);
  setViewState(ViewState.MAP);
};
```

**AFTER (New Code):**
```javascript
const handleGuestLogin = async () => {
  const guestProfile: UserProfile = {
    uid: 'guest-user',
    displayName: 'Guest',
    email: 'guest@tracebook.app',
    status: 'approved',
    role: 'user',
    createdAt: new Date().toISOString()
  };

  const guestUser = {
    uid: 'guest-user',
    displayName: 'Guest',
    photoURL: null,
    email: 'guest@tracebook.app',
    isAnonymous: true
  };

  setUser(guestUser);
  setUserProfile(guestProfile);
  
  // Initialize demo map in Firebase if it doesn't exist
  const demoMapId = 'guest-demo-map';
  const demoMapRef = doc(db, 'maps', demoMapId);
  
  try {
    const demoMapDoc = await getDoc(demoMapRef);
    
    if (!demoMapDoc.exists()) {
      // Create the demo map in Firebase for the first time
      const demoMap: UserMap = {
        id: demoMapId,
        ownerUid: 'guest-user',
        ownerDisplayName: 'Guest User',
        name: 'Public Demo Map',
        visibility: 'public',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(demoMapRef, demoMap);
      setActiveMap(demoMap);
    } else {
      // Load existing demo map from Firebase
      const data = demoMapDoc.data();
      const demoMap: UserMap = {
        id: demoMapDoc.id,
        ownerUid: data.ownerUid,
        ownerDisplayName: data.ownerDisplayName,
        name: data.name,
        visibility: data.visibility,
        isDefault: data.isDefault,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
      setActiveMap(demoMap);
    }
  } catch (error) {
    console.error('Error initializing demo map:', error);
    // Fallback to in-memory map if Firebase fails
    const fallbackMap: UserMap = {
      id: demoMapId,
      ownerUid: 'guest-user',
      ownerDisplayName: 'Guest User',
      name: 'Public Demo Map',
      visibility: 'public',
      isDefault: true,
      createdAt: new Date().toISOString()
    };
    setActiveMap(fallbackMap);
  }
  
  setViewState(ViewState.MAP);
};
```

### Add Required Imports at the Top of App.tsx

Make sure these imports are present (around line 3-10):

```javascript
import { getDoc, setDoc, doc, collection, onSnapshot, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
```

If `getDoc` or `setDoc` are missing, add them to the import statement.

## What This Changes:

### Before:
```
Guest Login → Creates map in memory only → Lost on refresh
└── Map ID: 'demo-map'
└── Data Path: maps/demo-map/restaurants
```

### After:
```
Guest Login → Checks Firebase for demo map
             ├── Not found? → Create in Firebase
             └── Found? → Load from Firebase
                 └── Map ID: 'guest-demo-map'
                 └── Owner: 'guest-user'
                 └── Data Path: maps/guest-demo-map/restaurants
```

## Benefits:

1. ✅ **Persistent Map**: Demo map survives page refresh
2. ✅ **Shared Guest Account**: All guests use 'guest-user' account
3. ✅ **Single Database**: All guest data writes to `maps/guest-demo-map/`
4. ✅ **Real-time Sync**: All guests see the same data instantly
5. ✅ **Proper Structure**: Map follows same structure as regular user maps

## Firebase Structure:

```
Firestore Database:
└── maps/
    ├── guest-demo-map/              ← Demo map document
    │   ├── id: "guest-demo-map"
    │   ├── ownerUid: "guest-user"
    │   ├── name: "Public Demo Map"
    │   ├── visibility: "public"
    │   ├── isDefault: true
    │   └── ...
    │
    └── guest-demo-map/              ← Subcollection
        └── restaurants/
            ├── restaurant-abc123/
            ├── restaurant-def456/
            └── ...
```

## Firebase Security Rules:

Add these rules to allow guest access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow anyone to read/write the guest demo map
    match /maps/guest-demo-map {
      allow read, write: if true;
    }
    
    // Allow anyone to read/write restaurants in guest demo map
    match /maps/guest-demo-map/restaurants/{restaurantId} {
      allow read, write: if true;
    }
    
    // Regular user maps - require authentication
    match /maps/{mapId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerUid;
    }
    
    match /maps/{mapId}/restaurants/{restaurantId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Testing Steps:

1. Apply the code changes above
2. Rebuild: `npm run build`
3. Open app as Guest User #1
4. Add a restaurant
5. Open app in another browser/incognito window as Guest User #2
6. Both should see the same restaurant immediately
7. Refresh both browsers - data persists!

## Optional: Initialize Demo Map with Sample Data

If you want to pre-populate the demo map with sample restaurants, add this function:

```javascript
const initializeDemoData = async () => {
  const demoMapId = 'guest-demo-map';
  const restaurantsRef = collection(db, 'maps', demoMapId, 'restaurants');
  
  // Check if already has data
  const snapshot = await getDocs(restaurantsRef);
  if (!snapshot.empty) {
    return; // Already has data
  }
  
  // Add sample restaurants
  const sampleRestaurants = [
    {
      id: 'demo-restaurant-1',
      name: 'Sample Pizza Place',
      address: '123 Demo Street, Toronto, ON',
      coordinates: { lat: 43.65, lng: -79.38 },
      category: 'Italian',
      visits: [
        {
          id: 'visit-1',
          date: new Date('2024-01-15').toISOString(),
          rating: 4.5,
          notes: 'Amazing margherita pizza!',
          images: [],
          userId: 'guest-user',
          userName: 'Guest User'
        }
      ]
    },
    {
      id: 'demo-restaurant-2',
      name: 'Demo Sushi Bar',
      address: '456 Sample Ave, Toronto, ON',
      coordinates: { lat: 43.66, lng: -79.39 },
      category: 'Japanese',
      visits: [
        {
          id: 'visit-2',
          date: new Date('2024-02-20').toISOString(),
          rating: 5,
          notes: 'Fresh sashimi, highly recommended!',
          images: [],
          userId: 'guest-user',
          userName: 'Guest User'
        }
      ]
    }
  ];
  
  for (const restaurant of sampleRestaurants) {
    await setDoc(doc(restaurantsRef, restaurant.id), restaurant);
  }
  
  console.log('Demo data initialized!');
};

// Call this after creating the demo map
// Add to handleGuestLogin after setActiveMap:
await initializeDemoData();
```

## Summary:

This change makes the demo map a **real, persistent database entry** that all guest users share. Instead of being created in memory each time, it:

1. Exists in Firebase at `maps/guest-demo-map`
2. Belongs to the shared `guest-user` account
3. All data writes to this single location
4. Survives page refreshes and is shared across all guest sessions
