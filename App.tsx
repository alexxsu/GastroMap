
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Map as MapIcon, Info, LogOut, UtensilsCrossed, User as UserIcon } from 'lucide-react';
import { Restaurant, ViewState, Coordinates, Visit, GUEST_ID } from './types';
import MapContainer from './components/MapContainer';
import AddVisitModal from './components/AddVisitModal';
import RestaurantDetail from './components/RestaurantDetail';
import InfoModal from './components/InfoModal';
import UserHistoryModal from './components/UserHistoryModal';

// Firebase Imports
import { auth, googleProvider, db } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';

// Interface to support both Firebase User and our Mock Guest User
interface AppUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

function App() {
  // Hardcoded key as requested
  const GOOGLE_MAPS_KEY = "AIzaSyB-2EeKGbY78jVlp3gFWbiLuXm0dZQAyhA";
  
  const [user, setUser] = useState<AppUser | null>(null);
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  
  // Default fallback location (Toronto)
  const [currentMapCenter, setCurrentMapCenter] = useState<Coordinates>({ lat: 43.6532, lng: -79.3832 });

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setViewState(ViewState.MAP);
      } else {
        // Only reset to login if we aren't already in guest mode
        setUser((prev) => (prev?.uid === GUEST_ID ? prev : null));
        setViewState((prev) => (prev === ViewState.MAP && user?.uid === GUEST_ID ? ViewState.MAP : ViewState.LOGIN));
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // 2. Firestore Real-time Sync (Only when logged in or guest)
  useEffect(() => {
    if (!user) return;

    // Subscribe to 'restaurants' collection
    const unsubscribe = onSnapshot(collection(db, "restaurants"), (snapshot) => {
      const fetchedRestaurants: Restaurant[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Restaurant;
        
        // Auto-cleanup: If a restaurant has no visits, it shouldn't exist.
        // This removes "ghost" spots from the map and cleans the DB.
        if (!data.visits || data.visits.length === 0) {
          deleteDoc(docSnapshot.ref).catch(e => console.error("Auto-cleanup error:", e));
        } else {
          fetchedRestaurants.push(data);
        }
      });
      setRestaurants(fetchedRestaurants);
      
      // Update selectedRestaurant if it exists to reflect real-time changes (e.g. deletions)
      if (selectedRestaurant) {
        const updated = fetchedRestaurants.find(r => r.id === selectedRestaurant.id);
        if (updated) {
          setSelectedRestaurant(updated);
        } else {
          // If the selected restaurant is no longer in the fetched list (it was deleted), close the view
          setSelectedRestaurant(null);
          setViewState(ViewState.MAP);
        }
      }
    }, (error) => {
      console.error("Error fetching data:", error);
    });

    return () => unsubscribe();
  }, [user, selectedRestaurant]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleGuestLogin = () => {
    setUser({
      uid: GUEST_ID,
      displayName: 'Guest',
      photoURL: null
    });
    setViewState(ViewState.MAP);
  };

  const handleLogout = async () => {
    if (user?.uid === GUEST_ID) {
      setUser(null);
    } else {
      await signOut(auth);
    }
    setViewState(ViewState.LOGIN);
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    map.addListener('center_changed', () => {
      const center = map.getCenter();
      if (center) {
        setCurrentMapCenter({ lat: center.lat(), lng: center.lng() });
      }
    });
  }, []);

  // 3. Save to Firestore
  const handleSaveVisit = async (restaurantInfo: Restaurant, visit: Visit) => {
    if (!user) return;

    // Add creator info
    const fullVisit: Visit = {
      ...visit,
      createdBy: user.uid,
      creatorName: user.displayName || 'Anonymous',
      creatorPhotoURL: user.photoURL // Pass photo URL here
    };

    const restaurantRef = doc(db, "restaurants", restaurantInfo.id);
    
    // Check if restaurant already exists in our local state (which reflects DB)
    const exists = restaurants.some(r => r.id === restaurantInfo.id);

    try {
      if (exists) {
        // Update existing doc
        await updateDoc(restaurantRef, {
          visits: arrayUnion(fullVisit)
        });
      } else {
        // Create new doc
        const newRestaurant = {
          ...restaurantInfo,
          visits: [fullVisit]
        };
        await setDoc(restaurantRef, newRestaurant);
      }
      setViewState(ViewState.MAP);
    } catch (e) {
      console.error("Error saving to Firestore:", e);
      alert("Failed to save memory. Check your internet connection.");
    }
  };

  // 4. Delete Visit
  const handleDeleteVisit = async (restaurant: Restaurant, visitToDelete: Visit) => {
    try {
      const restaurantRef = doc(db, "restaurants", restaurant.id);
      const restaurantDoc = await getDoc(restaurantRef);
      
      if (restaurantDoc.exists()) {
        const currentData = restaurantDoc.data() as Restaurant;
        // Filter out the visit by ID
        const updatedVisits = currentData.visits.filter(v => v.id !== visitToDelete.id);
        
        if (updatedVisits.length === 0) {
          // If no visits remain, delete the entire restaurant document
          await deleteDoc(restaurantRef);
          // Close the detail view immediately
          setSelectedRestaurant(null);
          setViewState(ViewState.MAP);
        } else {
          // Otherwise, just update the visits array
          await updateDoc(restaurantRef, {
            visits: updatedVisits
          });
        }
      }
    } catch (e) {
      console.error("Error deleting visit:", e);
      alert("Failed to delete memory.");
    }
  };

  // 5. Clear Entire Database
  const handleClearDatabase = async () => {
    if (!window.confirm("WARNING: This will delete ALL experiences from the database. This action cannot be undone. Are you sure?")) {
      return;
    }

    try {
      // Loop through all restaurants and delete them
      const deletePromises = restaurants.map(r => deleteDoc(doc(db, "restaurants", r.id)));
      await Promise.all(deletePromises);
      alert("Database has been reset successfully.");
      setViewState(ViewState.MAP);
    } catch (e) {
      console.error("Error clearing database:", e);
      alert("Failed to clear database. Please check permissions.");
    }
  };

  const openAddModal = () => {
    setViewState(ViewState.ADD_ENTRY);
  };

  const handleMarkerClick = useCallback((r: Restaurant) => {
    setSelectedRestaurant(r);
    setViewState(ViewState.RESTAURANT_DETAIL);
  }, []);

  // --- Login Screen ---
  if (viewState === ViewState.LOGIN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[100px]"></div>
         </div>

        <div className="bg-gray-800/80 backdrop-blur p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 z-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
              <UtensilsCrossed size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">宝宝少爷寻味地图</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Map your culinary journey. Share food memories with your partner in real-time.
          </p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-xl transition shadow-lg transform hover:scale-[1.02] mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <button 
            onClick={handleGuestLogin}
            className="text-sm text-gray-400 hover:text-white transition underline decoration-gray-600 hover:decoration-white"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  // --- Main App ---
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
      {/* Map Layer */}
      <MapContainer 
        apiKey={GOOGLE_MAPS_KEY} 
        restaurants={restaurants}
        onMapLoad={handleMapLoad}
        onMarkerClick={handleMarkerClick}
      />

      {/* Top Left Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-start">
        <div className="flex gap-2">
          <div className="bg-gray-800/90 backdrop-blur border border-gray-700 p-2 rounded-lg shadow-lg">
             <h1 className="font-bold text-white px-2 flex items-center gap-2">
               <MapIcon size={18} className="text-blue-500"/> 宝宝少爷寻味地图
             </h1>
          </div>
          <button 
            onClick={() => setViewState(ViewState.INFO)}
            className="bg-gray-800/90 backdrop-blur border border-gray-700 p-2 rounded-lg shadow-lg text-white hover:bg-gray-700 transition"
          >
            <Info size={18} />
          </button>
        </div>
        
        {/* User Info & Logout */}
        {user && (
          <div className="bg-gray-800/90 backdrop-blur border border-gray-700 p-1.5 pl-3 pr-1.5 rounded-full shadow-lg flex items-center gap-2">
             <div 
               className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
               onClick={() => setViewState(ViewState.USER_HISTORY)}
             >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full border border-gray-600" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                    <UserIcon size={14} className="text-gray-300"/>
                  </div>
                )}
                <span className="text-xs text-gray-300 font-medium max-w-[100px] truncate">{user.displayName}</span>
             </div>
             <button onClick={handleLogout} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-gray-400 transition" title="Log Out">
               <LogOut size={14} />
             </button>
          </div>
        )}
      </div>

      {/* Add Button */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
        <button 
          onClick={openAddModal}
          className="group flex items-center bg-blue-600 hover:bg-blue-500 h-16 rounded-full overflow-hidden shadow-lg shadow-blue-900/50 transition-all duration-300 ease-in-out"
        >
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
             <Plus size={28} className="text-white" />
          </div>
          <span className="max-w-0 group-hover:max-w-[10rem] overflow-hidden transition-all duration-500 ease-in-out whitespace-nowrap text-white font-medium pr-0 group-hover:pr-6">
            Add Memory
          </span>
        </button>
      </div>

      {/* Modals */}
      {viewState === ViewState.ADD_ENTRY && (
        <AddVisitModal 
          mapInstance={mapInstance}
          currentLocation={currentMapCenter}
          existingRestaurants={restaurants}
          onClose={() => setViewState(ViewState.MAP)}
          onSave={handleSaveVisit}
        />
      )}

      {viewState === ViewState.RESTAURANT_DETAIL && selectedRestaurant && (
        <RestaurantDetail 
          restaurant={selectedRestaurant}
          currentUserUid={user?.uid}
          onClose={() => {
            setSelectedRestaurant(null);
            setViewState(ViewState.MAP);
          }}
          onAddAnotherVisit={() => {
            setViewState(ViewState.ADD_ENTRY);
          }}
          onDeleteVisit={handleDeleteVisit}
        />
      )}

      {viewState === ViewState.INFO && (
        <InfoModal 
          onClose={() => setViewState(ViewState.MAP)} 
          onClearDatabase={handleClearDatabase}
        />
      )}

      {viewState === ViewState.USER_HISTORY && user && (
        <UserHistoryModal 
          restaurants={restaurants}
          currentUserUid={user.uid}
          onClose={() => setViewState(ViewState.MAP)}
          onSelectVisit={(r) => {
            setSelectedRestaurant(r);
            setViewState(ViewState.RESTAURANT_DETAIL);
          }}
        />
      )}
    </div>
  );
}

export default App;
