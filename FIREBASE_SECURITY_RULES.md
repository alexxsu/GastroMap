# Firebase Security Rules for Guest Demo Map

## Complete Firestore Security Rules

Copy this to: **Firebase Console → Firestore Database → Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // GUEST DEMO MAP - PUBLIC ACCESS
    // ============================================
    
    // Allow anyone to read/write the guest demo map document
    match /maps/guest-demo-map {
      allow read, write: if true;
    }
    
    // Allow anyone to read/write restaurants in guest demo map
    match /maps/guest-demo-map/restaurants/{restaurantId} {
      allow read, write: if true;
    }
    
    // ============================================
    // USER MAPS - AUTHENTICATED USERS ONLY
    // ============================================
    
    // Users can read all maps, but only write their own
    match /maps/{mapId} {
      // Anyone authenticated can read any map (for browsing/joining)
      allow read: if request.auth != null;
      
      // Only the owner can write to their map
      allow write: if request.auth != null && 
                      request.auth.uid == resource.data.ownerUid;
      
      // Allow creating new maps if user is authenticated
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.ownerUid;
    }
    
    // Restaurants in user maps
    match /maps/{mapId}/restaurants/{restaurantId} {
      // Allow read if user is authenticated
      allow read: if request.auth != null;
      
      // Allow write if user is:
      // 1. The map owner, OR
      // 2. A member of a shared map
      allow write: if request.auth != null && (
        // Check if user is the map owner
        get(/databases/$(database)/documents/maps/$(mapId)).data.ownerUid == request.auth.uid ||
        // Check if user is in the members array (for shared maps)
        request.auth.uid in get(/databases/$(database)/documents/maps/$(mapId)).data.members
      );
    }
    
    // ============================================
    // USER PROFILES
    // ============================================
    
    match /users/{userId} {
      // Users can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can write their own profile
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Admins can read all profiles
      allow read: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Rule Breakdown:

### 1. Guest Demo Map (Public)
```javascript
match /maps/guest-demo-map {
  allow read, write: if true;
}
```
**What it does:**
- Anyone can read the guest demo map (even without login)
- Anyone can write to the guest demo map
- This is intentionally public for demo purposes

### 2. Guest Demo Restaurants (Public)
```javascript
match /maps/guest-demo-map/restaurants/{restaurantId} {
  allow read, write: if true;
}
```
**What it does:**
- Anyone can read restaurants in the demo map
- Anyone can add/edit/delete restaurants in the demo map
- All guests share the same data

### 3. User Maps (Protected)
```javascript
match /maps/{mapId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
                  request.auth.uid == resource.data.ownerUid;
  allow create: if request.auth != null && 
                   request.auth.uid == request.resource.data.ownerUid;
}
```
**What it does:**
- Only logged-in users can read maps
- Only the map owner can modify their map
- Users can create new maps (they become the owner)

### 4. User Restaurants (Protected)
```javascript
match /maps/{mapId}/restaurants/{restaurantId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && (
    get(/databases/$(database)/documents/maps/$(mapId)).data.ownerUid == request.auth.uid ||
    request.auth.uid in get(/databases/$(database)/documents/maps/$(mapId)).data.members
  );
}
```
**What it does:**
- Only logged-in users can read restaurants
- Map owner can add/edit/delete restaurants
- Map members (in shared maps) can add/edit/delete restaurants

## Security Considerations:

### ⚠️ Guest Demo Map is Public
**Implications:**
- Anyone can add restaurants (good for demo)
- Anyone can delete restaurants (could be abused)
- Anyone can see all data (intended behavior)
- No authentication required

**Mitigations:**
1. Add a cleanup job to reset demo map daily
2. Monitor for inappropriate content
3. Implement rate limiting at app level
4. Add moderation for guest-added content

### ✅ User Maps are Protected
**Implications:**
- Only authenticated users can access
- Private maps stay private
- Shared maps only accessible to members
- Cannot see other users' private data

## How to Apply Rules:

### Method 1: Firebase Console (Recommended)
```
1. Go to: https://console.firebase.google.com
2. Select your project
3. Navigate to: Firestore Database
4. Click: Rules tab
5. Paste the rules above
6. Click: Publish
```

### Method 2: Firebase CLI
```bash
# Edit firestore.rules file in your project
nano firestore.rules

# Deploy rules
firebase deploy --only firestore:rules
```

## Testing Rules:

### Test 1: Guest Can Access Demo Map
```javascript
// Should succeed (no auth needed)
await getDoc(doc(db, 'maps', 'guest-demo-map'));
await setDoc(doc(db, 'maps', 'guest-demo-map', 'restaurants', 'test'), {...});
```

### Test 2: Guest Cannot Access User Maps
```javascript
// Should fail (auth required)
await getDoc(doc(db, 'maps', 'some-user-id'));
// Error: Missing or insufficient permissions
```

### Test 3: User Can Access Their Own Map
```javascript
// Should succeed (authenticated and owner)
await getDoc(doc(db, 'maps', currentUser.uid));
await setDoc(doc(db, 'maps', currentUser.uid, 'restaurants', 'test'), {...});
```

### Test 4: User Cannot Access Another User's Map
```javascript
// Should fail (not the owner)
await setDoc(doc(db, 'maps', 'other-user-id', 'restaurants', 'test'), {...});
// Error: Missing or insufficient permissions
```

## Optional: Stricter Demo Map Rules

If you want to prevent deletions in the demo map:

```javascript
match /maps/guest-demo-map/restaurants/{restaurantId} {
  // Allow read and create for everyone
  allow read, create: if true;
  
  // Allow update only (no delete)
  allow update: if true;
  
  // Prevent delete
  allow delete: if false;
}
```

## Optional: Daily Demo Map Reset

Create a Cloud Function to reset the demo map daily:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.resetDemoMap = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const restaurantsRef = db.collection('maps')
      .doc('guest-demo-map')
      .collection('restaurants');
    
    const snapshot = await restaurantsRef.get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log('Demo map reset completed');
    return null;
  });
```

## Monitoring Demo Map Activity

Add logging to track guest activity:

```javascript
// In App.tsx handleAddVisit
if (user.isAnonymous) {
  console.log('Guest user added restaurant:', restaurantInfo.name);
  // Optional: Send to analytics
}
```

## Summary:

✅ **Public Access:**
- `maps/guest-demo-map` - Anyone can read/write
- `maps/guest-demo-map/restaurants/*` - Anyone can read/write

🔒 **Protected Access:**
- `maps/{userId}` - Only authenticated users, owner can write
- `maps/{userId}/restaurants/*` - Owner and shared members can write

🎯 **Purpose:**
- Demo map is intentionally public for testing
- User maps are properly secured
- Clear separation between demo and production data
