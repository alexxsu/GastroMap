# Exact Code Changes - Before & After

## File: App.tsx

### Step 1: Update Imports (Lines 1-15)

**Check if you have these imports:**

```javascript
import { 
  getDoc,      // ← Add if missing
  setDoc,      // ← Add if missing
  doc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
```

### Step 2: Replace handleGuestLogin Function (Lines 344-377)

**BEFORE:**
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

**AFTER:**
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

## Key Changes Summary:

| Aspect | Before | After |
|--------|--------|-------|
| Map ID | `'demo-map'` | `'guest-demo-map'` |
| Storage | Memory only | Firebase + Memory |
| Persistence | Session only | Permanent |
| Creation | Every login | Once (first guest) |
| Loading | Create new | Load existing |
| Shared | Yes (same ID) | Yes (same document) |

## What Happens Now:

### First Guest User:
```
1. Guest clicks "Continue as Guest"
2. Code checks Firebase: maps/guest-demo-map
3. Not found → Creates document in Firebase
4. Sets activeMap to the new demo map
5. User sees empty map
```

### Second Guest User (and all future guests):
```
1. Guest clicks "Continue as Guest"
2. Code checks Firebase: maps/guest-demo-map
3. Found → Loads existing document from Firebase
4. Sets activeMap to the loaded demo map
5. User sees all restaurants from previous guests
```

### When Guest Adds Restaurant:
```
1. Guest adds visit
2. Writes to: maps/guest-demo-map/restaurants/{restaurantId}
3. All connected guests get real-time update via onSnapshot
4. Restaurant appears on all guest maps immediately
```

## Database Path Comparison:

**Before:**
```
Firestore:
└── maps/
    └── demo-map/
        └── restaurants/
            └── [restaurant data]

Note: 'demo-map' document doesn't exist, only subcollection
```

**After:**
```
Firestore:
└── maps/
    └── guest-demo-map/              ← Document exists!
    │   ├── id: "guest-demo-map"
    │   ├── ownerUid: "guest-user"
    │   ├── name: "Public Demo Map"
    │   ├── visibility: "public"
    │   └── isDefault: true
    │
    └── guest-demo-map/              ← Subcollection
        └── restaurants/
            └── [restaurant data]
```

## Testing the Changes:

### Test 1: First Guest
```bash
1. Clear Firebase (delete guest-demo-map if exists)
2. Open browser console
3. Click "Continue as Guest"
4. Should see: "Creating demo map in Firebase..."
5. Check Firebase Console → maps → guest-demo-map exists ✓
```

### Test 2: Second Guest
```bash
1. Open incognito window
2. Click "Continue as Guest"
3. Should see: "Loading existing demo map from Firebase..."
4. Both windows show the same map ID
```

### Test 3: Data Persistence
```bash
1. Guest #1 adds a restaurant
2. Refresh browser
3. Restaurant still there ✓
4. Guest #2 (new incognito) sees same restaurant ✓
```

### Test 4: Real-time Sync
```bash
1. Open 2 browser windows as guests
2. In Window #1: Add restaurant A
3. In Window #2: See restaurant A appear instantly ✓
4. In Window #2: Add restaurant B
5. In Window #1: See restaurant B appear instantly ✓
```

## After Making Changes:

```bash
# 1. Save the file
# 2. Rebuild
npm run build

# 3. Restart dev server if running
npm run dev

# 4. Clear browser cache
# 5. Test as described above
```

## Verify in Firebase Console:

1. Go to: https://console.firebase.google.com
2. Select your project
3. Navigate to: Firestore Database
4. Look for: `maps` → `guest-demo-map`
5. Should see the document with:
   - id: guest-demo-map
   - ownerUid: guest-user
   - name: Public Demo Map
   - visibility: public
   - isDefault: true

## If You Get Errors:

**Error: "getDoc is not defined"**
```javascript
// Add to imports at top of App.tsx:
import { getDoc } from 'firebase/firestore';
```

**Error: "setDoc is not defined"**
```javascript
// Add to imports at top of App.tsx:
import { setDoc } from 'firebase/firestore';
```

**Error: "Permission denied"**
```javascript
// Update Firebase Security Rules to allow guest access
// See MODIFIED_APP_TSX.md for security rules
```
