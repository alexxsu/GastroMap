# Demo Map Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GUEST USER CLICKS                             │
│                   "Continue as Guest"                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  App.tsx (handleGuestLogin)           │
        │  Lines 354-376                        │
        └───────────────┬───────────────────────┘
                        │
                        │ Creates in Memory:
                        ▼
        ┌───────────────────────────────────────┐
        │   Demo Map Object (Temporary)         │
        │   ────────────────────────────        │
        │   id: 'demo-map'                      │
        │   name: 'Demo Map'                    │
        │   visibility: 'public'                │
        │   isDefault: true                     │
        │                                       │
        │   Storage: React State               │
        │   Lifetime: Current Session Only     │
        └───────────────┬───────────────────────┘
                        │
                        │ Passed to:
                        ▼
        ┌───────────────────────────────────────┐
        │   setActiveMap(demoMap)              │
        │   Component renders with mapId       │
        └───────────────┬───────────────────────┘
                        │
                        │ Subscribes to:
                        ▼
        ┌───────────────────────────────────────┐
        │   Firebase Firestore                  │
        │   Path: maps/demo-map/restaurants    │
        │                                       │
        │   ┌─────────────────────────────┐   │
        │   │  restaurant-abc123          │   │
        │   │  ├─ name: "Pizza Place"     │   │
        │   │  ├─ address: "123 Main St"  │   │
        │   │  └─ visits: [...]           │   │
        │   ├─────────────────────────────┤   │
        │   │  restaurant-def456          │   │
        │   │  ├─ name: "Sushi Bar"       │   │
        │   │  └─ visits: [...]           │   │
        │   └─────────────────────────────┘   │
        │                                       │
        │   Storage: Firebase Cloud            │
        │   Lifetime: Persistent               │
        │   Shared: Yes (all guests see same)  │
        └───────────────┬───────────────────────┘
                        │
                        │ Real-time Updates via
                        ▼
        ┌───────────────────────────────────────┐
        │   onSnapshot Listener                │
        │   (App.tsx line 250)                 │
        └───────────────┬───────────────────────┘
                        │
                        │ Updates:
                        ▼
        ┌───────────────────────────────────────┐
        │   restaurants state                   │
        │   setRestaurants(fetchedRestaurants)  │
        └───────────────┬───────────────────────┘
                        │
                        │ Renders in:
                        ▼
        ┌───────────────────────────────────────┐
        │   MapContainer Component              │
        │   Shows markers on map               │
        └───────────────────────────────────────┘
```

## When Guest Adds a Restaurant:

```
┌─────────────────────────────────────────────────────────────────┐
│  Guest clicks "Add Visit" button                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  handleAddVisit() called              │
        │  (App.tsx line ~640)                  │
        └───────────────┬───────────────────────┘
                        │
                        │ Creates reference:
                        ▼
        ┌───────────────────────────────────────┐
        │  doc(db, "maps", activeMap.id,        │
        │      "restaurants", restaurantId)     │
        │                                       │
        │  For demo map:                        │
        │  doc(db, "maps", "demo-map",          │
        │      "restaurants", "abc123")         │
        └───────────────┬───────────────────────┘
                        │
                        │ Writes to Firebase:
                        ▼
        ┌───────────────────────────────────────┐
        │  Firebase Firestore                   │
        │  maps/demo-map/restaurants/abc123    │
        │  {                                    │
        │    id: "abc123",                      │
        │    name: "New Restaurant",            │
        │    visits: [...],                     │
        │    ...                                │
        │  }                                    │
        └───────────────┬───────────────────────┘
                        │
                        │ Triggers:
                        ▼
        ┌───────────────────────────────────────┐
        │  onSnapshot listener fires            │
        │  (for ALL connected guests)           │
        └───────────────┬───────────────────────┘
                        │
                        │ All guests see:
                        ▼
        ┌───────────────────────────────────────┐
        │  New restaurant appears on their map  │
        │  (Real-time sync)                     │
        └───────────────────────────────────────┘
```

## Comparison: Guest vs Logged-in User

```
┌──────────────────────────────┬──────────────────────────────┐
│       GUEST USER             │      LOGGED-IN USER          │
├──────────────────────────────┼──────────────────────────────┤
│ Map Metadata:                │ Map Metadata:                │
│  ├─ Memory (temporary)       │  ├─ Firebase (persistent)    │
│  ├─ id: 'demo-map'           │  ├─ id: user.uid             │
│  └─ Lost on refresh          │  └─ Survives refresh         │
├──────────────────────────────┼──────────────────────────────┤
│ Restaurant Data:             │ Restaurant Data:             │
│  ├─ Firebase: maps/demo-map/ │  ├─ Firebase: maps/{uid}/    │
│  ├─ Shared with all guests   │  ├─ Private (only for user)  │
│  └─ Public read/write        │  └─ Auth required            │
├──────────────────────────────┼──────────────────────────────┤
│ Multiple Maps:               │ Multiple Maps:               │
│  ├─ Only sees demo map       │  ├─ Default map             │
│  └─ Cannot create/join       │  ├─ Created shared maps      │
│                              │  └─ Joined shared maps       │
└──────────────────────────────┴──────────────────────────────┘
```

## File Locations in Your Code:

```
GastroMap/
├── App.tsx
│   ├── Line 366-374: Demo map creation (in memory)
│   ├── Line 248: Restaurant collection reference
│   ├── Line 250: onSnapshot listener (real-time sync)
│   └── Line 644: Add visit to Firebase
│
├── MapManagementModal.tsx
│   ├── Line 196-209: Guest detection logic (shows "Public" label)
│   ├── Line 262: Displays the label
│   └── Line 517-518: Section header for guests
│
└── Firebase (Cloud)
    └── Firestore Database
        └── maps/
            └── demo-map/
                └── restaurants/
                    ├── {restaurantId1}/
                    ├── {restaurantId2}/
                    └── ...
```

## Key Insight:

```
┌─────────────────────────────────────────────────────────────┐
│  The "demo-map" ID is the bridge between:                   │
│  ─────────────────────────────────────────────────────────  │
│  • In-memory map object (temporary)                          │
│  • Firebase restaurant data (persistent)                     │
│                                                              │
│  When activeMap.id = 'demo-map':                            │
│  → App queries: collection(db, 'maps', 'demo-map', ...)    │
│  → All guests use the same path                             │
│  → Data is shared across all guest sessions                 │
└─────────────────────────────────────────────────────────────┘
```
