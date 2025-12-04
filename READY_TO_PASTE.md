# Ready-to-Paste Code Snippets

## 1️⃣ Complete handleGuestLogin Function

**Copy this entire function and replace the existing one in App.tsx (around line 344):**

```typescript
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
  
  // Initialize demo map in Firebase (persistent, shared by all guests)
  const demoMapId = 'guest-demo-map';
  const demoMapRef = doc(db, 'maps', demoMapId);
  
  try {
    const demoMapDoc = await getDoc(demoMapRef);
    
    if (!demoMapDoc.exists()) {
      // First time - create the demo map in Firebase
      console.log('Creating demo map in Firebase...');
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
      console.log('Demo map created successfully');
    } else {
      // Demo map exists - load it from Firebase
      console.log('Loading existing demo map from Firebase...');
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
      console.log('Demo map loaded successfully');
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

---

## 2️⃣ Firebase Imports (Add if Missing)

**If you get "getDoc is not defined" or "setDoc is not defined", add these to your imports:**

```typescript
import { 
  getDoc,      // ← Add this
  setDoc,      // ← Add this
  doc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  getDocs 
} from 'firebase/firestore';
```

---

## 3️⃣ Firebase Security Rules

**Copy to Firebase Console → Firestore → Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Guest demo map - public access
    match /maps/guest-demo-map {
      allow read, write: if true;
    }
    
    match /maps/guest-demo-map/restaurants/{restaurantId} {
      allow read, write: if true;
    }
    
    // User maps - authenticated only
    match /maps/{mapId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.uid == resource.data.ownerUid;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.ownerUid;
    }
    
    match /maps/{mapId}/restaurants/{restaurantId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (
        get(/databases/$(database)/documents/maps/$(mapId)).data.ownerUid == request.auth.uid ||
        request.auth.uid in get(/databases/$(database)/documents/maps/$(mapId)).data.members
      );
    }
    
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 4️⃣ Optional: Initialize Demo Data

**Add this function to App.tsx if you want sample restaurants:**

```typescript
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
      coordinates: { lat: 43.6532, lng: -79.3832 },
      category: 'Italian',
      visits: [
        {
          id: 'visit-1',
          date: new Date('2024-01-15').toISOString(),
          rating: 4.5,
          notes: 'Amazing margherita pizza! The crust was perfectly crispy.',
          images: [],
          userId: 'guest-user',
          userName: 'Guest User'
        }
      ]
    },
    {
      id: 'demo-restaurant-2',
      name: 'Demo Sushi Bar',
      address: '456 Sample Avenue, Toronto, ON',
      coordinates: { lat: 43.6629, lng: -79.3957 },
      category: 'Japanese',
      visits: [
        {
          id: 'visit-2',
          date: new Date('2024-02-20').toISOString(),
          rating: 5,
          notes: 'Fresh sashimi, highly recommended! Best salmon I\'ve had.',
          images: [],
          userId: 'guest-user',
          userName: 'Guest User'
        }
      ]
    },
    {
      id: 'demo-restaurant-3',
      name: 'Burger Joint',
      address: '789 Food Court, Toronto, ON',
      coordinates: { lat: 43.6426, lng: -79.3871 },
      category: 'American',
      visits: [
        {
          id: 'visit-3',
          date: new Date('2024-03-10').toISOString(),
          rating: 4,
          notes: 'Great burgers and fries. The bacon cheeseburger is a must-try!',
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
  
  console.log('Demo data initialized with', sampleRestaurants.length, 'restaurants');
};
```

**Then call it in handleGuestLogin after setActiveMap:**

```typescript
// Inside handleGuestLogin, after setActiveMap(demoMap)
// Initialize with sample data if empty
await initializeDemoData();
```

---

## 5️⃣ Testing Console Commands

**After implementation, test with these console commands:**

```javascript
// Check if demo map exists
const demoMapRef = doc(db, 'maps', 'guest-demo-map');
getDoc(demoMapRef).then(doc => {
  console.log('Demo map exists:', doc.exists());
  console.log('Demo map data:', doc.data());
});

// Check restaurants in demo map
const restaurantsRef = collection(db, 'maps', 'guest-demo-map', 'restaurants');
getDocs(restaurantsRef).then(snapshot => {
  console.log('Number of restaurants:', snapshot.size);
  snapshot.forEach(doc => {
    console.log('Restaurant:', doc.data().name);
  });
});
```

---

## 6️⃣ Build Commands

```bash
# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Run development server
npm run dev

# Check for TypeScript errors
npm run type-check
```

---

## 7️⃣ Git Commit Message

```bash
git add App.tsx
git commit -m "feat: persist guest demo map in Firebase

- Changed demo map from in-memory to Firebase storage
- All guests now share single persistent demo map (guest-demo-map)
- Added Firebase initialization with getDoc/setDoc
- Demo map data survives page refreshes
- Real-time sync between multiple guest sessions
- Updated Firebase security rules for public guest access"
```

---

## 📋 Copy-Paste Checklist

- [ ] Copy handleGuestLogin function → Replace in App.tsx
- [ ] Copy Firebase imports → Add to App.tsx imports section
- [ ] Copy Security Rules → Paste in Firebase Console
- [ ] Run `npm run build`
- [ ] Test as guest user
- [ ] Verify in Firebase Console

---

## 🎯 One-Command Test

```bash
# Build and test in one go
npm run build && npm run dev
```

Then open browser and click "Continue as Guest"

---

## ✅ Success Indicators

You'll know it worked when:

1. Browser console shows: "Creating demo map in Firebase..." (first time)
2. Browser console shows: "Loading existing demo map from Firebase..." (subsequent times)
3. Firebase Console shows document at: `maps/guest-demo-map`
4. Restaurants persist after page refresh
5. Multiple browser windows show same data
6. No "demo-map" errors in console

---

## 🐛 Quick Fixes

**Error: getDoc is not defined**
```typescript
import { getDoc, setDoc } from 'firebase/firestore';
```

**Error: Permission denied**
- Publish Firebase Security Rules from snippet #3

**Demo map not persisting**
- Check Firebase Console → maps → guest-demo-map exists
- Check browser console for errors
- Clear cache and try again

**Old demo-map still showing**
- Change mapId to 'guest-demo-map' consistently
- Delete old 'demo-map' document in Firebase
- Rebuild application
