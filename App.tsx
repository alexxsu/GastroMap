
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Map as MapIcon, Info, LogOut, UtensilsCrossed, User as UserIcon, BarChart2, Search, X, Crosshair, Minus, LocateFixed, Filter } from 'lucide-react';
import { Restaurant, ViewState, Coordinates, Visit, GUEST_ID } from './types';
import MapContainer from './components/MapContainer';
import AddVisitModal from './components/AddVisitModal';
import RestaurantDetail from './components/RestaurantDetail';
import InfoModal from './components/InfoModal';
import UserHistoryModal from './components/UserHistoryModal';
import EditVisitModal from './components/EditVisitModal';
import StatsModal from './components/StatsModal';
import { calculateAverageGrade, GRADES, getGradeColor } from './utils/rating';

// Firebase Imports
import { auth, googleProvider, db } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';

interface AppUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

function App() {
  const GOOGLE_MAPS_KEY = "AIzaSyCHoA2Vegt3SaybflKyedD7Y33o6kUPZr0";
  
  const [user, setUser] = useState<AppUser | null>(null);
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Grade Filter State
  const [selectedGrades, setSelectedGrades] = useState<string[]>(GRADES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  
  // UI State
  const [hideAddButton, setHideAddButton] = useState(false);
  
  const [editingData, setEditingData] = useState<{ restaurant: Restaurant, visit: Visit } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<Coordinates>({ lat: 43.6532, lng: -79.3832 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setViewState(ViewState.MAP);
      } else {
        setUser((prev) => (prev?.uid === GUEST_ID ? prev : null));
        setViewState((prev) => (prev === ViewState.MAP && user?.uid === GUEST_ID ? ViewState.MAP : ViewState.LOGIN));
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "restaurants"), (snapshot) => {
      const fetchedRestaurants: Restaurant[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Restaurant;
        if (!data.visits || data.visits.length === 0) {
          deleteDoc(docSnapshot.ref).catch(e => console.error("Auto-cleanup error:", e));
        } else {
          fetchedRestaurants.push(data);
        }
      });
      setRestaurants(fetchedRestaurants);
      
      if (selectedRestaurant) {
        const updated = fetchedRestaurants.find(r => r.id === selectedRestaurant.id);
        if (updated) {
          setSelectedRestaurant(updated);
        } else {
          setSelectedRestaurant(null);
          setViewState(ViewState.MAP);
        }
      }
    }, (error) => {
      console.error("Error fetching data:", error);
    });

    return () => unsubscribe();
  }, [user, selectedRestaurant]);

  // Handle Search Filtering
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const results = restaurants.filter(r => 
        r.name.toLowerCase().includes(lowerQuery) || 
        r.address.toLowerCase().includes(lowerQuery)
      );
      setSearchResults(results);
    }
  }, [searchQuery, restaurants]);

  // Auto-focus search input when activated
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchFocused]);

  // Calculate Filtered Restaurants for Map
  const filteredMapRestaurants = restaurants.filter(r => {
     const avgGrade = calculateAverageGrade(r.visits);
     return selectedGrades.includes(avgGrade);
  });

  const handleSearchSelect = (restaurant: Restaurant) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
    
    // Pan map to location
    if (mapInstance) {
      mapInstance.setCenter(restaurant.location);
      mapInstance.setZoom(16);
    }
    
    // Open Detail
    setSelectedRestaurant(restaurant);
    setViewState(ViewState.RESTAURANT_DETAIL);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleGuestLogin = () => {
    setUser({ uid: GUEST_ID, displayName: 'Guest', photoURL: null });
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

  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.setZoom((mapInstance.getZoom() || 13) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.setZoom((mapInstance.getZoom() || 13) - 1);
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation && mapInstance) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          mapInstance.panTo(pos);
          mapInstance.setZoom(16);
        },
        () => {
          alert("Could not access your location. Please check browser permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleResetView = () => {
    if (mapInstance) {
      // Bounds for Greater Toronto Area (approximate)
      // SW: Mississauga/Oakville border, NE: Scarborough/Pickering border
      const bounds = new google.maps.LatLngBounds(
        { lat: 43.48, lng: -79.80 }, 
        { lat: 43.90, lng: -79.00 }
      );
      mapInstance.fitBounds(bounds);
    }
  };

  const toggleGradeFilter = (grade: string) => {
    setSelectedGrades(prev => 
      prev.includes(grade) 
        ? prev.filter(g => g !== grade) 
        : [...prev, grade]
    );
  };

  const handleFilterToggle = () => {
    if (isFilterOpen) {
      closeFilter();
    } else {
      setIsFilterOpen(true);
    }
  };

  const closeFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 200); // Wait for animation
  };

  const handleSaveVisit = async (restaurantInfo: Restaurant, visit: Visit) => {
    if (!user) return;

    const fullVisit: Visit = {
      ...visit,
      createdBy: user.uid,
      creatorName: user.displayName || 'Anonymous',
      creatorPhotoURL: user.photoURL 
    };

    const restaurantRef = doc(db, "restaurants", restaurantInfo.id);
    const exists = restaurants.some(r => r.id === restaurantInfo.id);

    try {
      if (exists) {
        await updateDoc(restaurantRef, { visits: arrayUnion(fullVisit) });
      } else {
        const newRestaurant = { ...restaurantInfo, visits: [fullVisit] };
        await setDoc(restaurantRef, newRestaurant);
      }
      setViewState(ViewState.MAP);
      setHideAddButton(false);
    } catch (e) {
      console.error("Error saving to Firestore:", e);
      alert("Failed to save memory. Check your internet connection.");
    }
  };

  const handleUpdateVisit = async (restaurantId: string, oldVisit: Visit, newVisit: Visit) => {
    if (!user) return;
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      const restaurantDoc = await getDoc(restaurantRef);
      if (restaurantDoc.exists()) {
        const currentData = restaurantDoc.data() as Restaurant;
        const updatedVisits = currentData.visits.map(v => v.id === oldVisit.id ? newVisit : v);
        await updateDoc(restaurantRef, { visits: updatedVisits });
        setEditingData(null);
        setViewState(ViewState.RESTAURANT_DETAIL);
      }
    } catch (e) {
       console.error("Error updating visit:", e);
       alert("Failed to update memory.");
    }
  };

  const handleDeleteVisit = async (restaurant: Restaurant, visitToDelete: Visit) => {
    try {
      const restaurantRef = doc(db, "restaurants", restaurant.id);
      const restaurantDoc = await getDoc(restaurantRef);
      if (restaurantDoc.exists()) {
        const currentData = restaurantDoc.data() as Restaurant;
        const updatedVisits = currentData.visits.filter(v => v.id !== visitToDelete.id);
        if (updatedVisits.length === 0) {
          await deleteDoc(restaurantRef);
          setSelectedRestaurant(null);
          setViewState(ViewState.MAP);
        } else {
          await updateDoc(restaurantRef, { visits: updatedVisits });
        }
      }
    } catch (e) {
      console.error("Error deleting visit:", e);
      alert("Failed to delete memory.");
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm("WARNING: This will delete ALL experiences from the database. This action cannot be undone. Are you sure?")) {
      return;
    }
    try {
      const deletePromises = restaurants.map(r => deleteDoc(doc(db, "restaurants", r.id)));
      await Promise.all(deletePromises);
      alert("Database has been reset successfully.");
      setViewState(ViewState.MAP);
    } catch (e) {
      console.error("Error clearing database:", e);
      alert("Failed to clear database.");
    }
  };

  const openAddModal = () => setViewState(ViewState.ADD_ENTRY);

  // Toggle function for the main action button
  const handleToggleAdd = () => {
    if (viewState === ViewState.ADD_ENTRY) {
      setViewState(ViewState.MAP);
      setHideAddButton(false);
    } else {
      setViewState(ViewState.ADD_ENTRY);
    }
  };

  const handleMarkerClick = useCallback((r: Restaurant) => {
    setSelectedRestaurant(r);
    setViewState(ViewState.RESTAURANT_DETAIL);
  }, []);

  const handleEditTrigger = (r: Restaurant, v: Visit) => {
    setEditingData({ restaurant: r, visit: v });
    setViewState(ViewState.EDIT_ENTRY);
  };

  if (viewState === ViewState.LOGIN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[100px]"></div>
         </div>
        <div className="bg-gray-800/80 backdrop-blur p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 z-10 text-center animate-fade-in-up">
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

  const isAddModalOpen = viewState === ViewState.ADD_ENTRY;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
      {/* 
        Pass filtered restaurants to map. 
        Note: We keep existingRestaurants=restaurants in AddVisitModal so users can add visits to hidden places too if they search there.
      */}
      <MapContainer 
        apiKey={GOOGLE_MAPS_KEY} 
        restaurants={filteredMapRestaurants}
        onMapLoad={handleMapLoad}
        onMarkerClick={handleMarkerClick}
      />

      {/* Top Left Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-[calc(100%-6rem)] max-w-sm pointer-events-none">
        {/* Header / Search Bar */}
        <div 
          className="bg-gray-800/90 backdrop-blur border border-gray-700 p-2 rounded-xl shadow-lg pointer-events-auto transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 cursor-text"
          onClick={() => setIsSearchFocused(true)}
        >
          <div className="flex items-center gap-2">
            {!isSearchFocused && !searchQuery ? (
               <div className="flex items-center gap-2 px-2 py-1 text-white">
                 <MapIcon size={18} className="text-blue-500 flex-shrink-0"/> 
                 <span className="font-bold truncate">宝宝少爷寻味地图</span>
               </div>
            ) : null}
            
            <div className={`flex-1 flex items-center bg-gray-700/50 rounded-lg px-2 py-1 ${!isSearchFocused && !searchQuery ? 'hidden' : 'flex'}`}>
              <Search size={14} className="text-gray-400 mr-2" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search your memories..." 
                className="bg-transparent border-none focus:outline-none text-sm text-white w-full placeholder-gray-500"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }} className="text-gray-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {(!isSearchFocused && !searchQuery) && (
               <button onClick={(e) => { e.stopPropagation(); setIsSearchFocused(true); }} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white ml-auto">
                 <Search size={18} />
               </button>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {searchQuery && (
             <div className="mt-2 border-t border-gray-700 pt-2 max-h-60 overflow-y-auto">
               {searchResults.length > 0 ? (
                 searchResults.map(r => (
                   <button 
                     key={r.id} 
                     onClick={(e) => { e.stopPropagation(); handleSearchSelect(r); }}
                     className="w-full text-left px-2 py-2 hover:bg-gray-700 rounded text-sm text-gray-300 hover:text-white flex flex-col"
                   >
                     <span className="font-semibold">{r.name}</span>
                     <span className="text-xs text-gray-500 truncate">{r.address}</span>
                   </button>
                 ))
               ) : (
                 <p className="text-gray-500 text-sm px-2 py-1">No restaurants found.</p>
               )}
             </div>
          )}
        </div>
        
        {/* User Profile */}
        {user && (
          <div className="bg-gray-800/90 backdrop-blur border border-gray-700 p-1.5 pl-3 pr-1.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-auto self-start">
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

      {/* Top Right Buttons */}
      <div className="absolute top-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto items-end">
        {/* Filter Button & Popover */}
        <div className="relative">
           <button 
             onClick={handleFilterToggle}
             className={`p-3 rounded-full shadow-lg transition group backdrop-blur border flex items-center justify-center w-12 h-12
               ${(isFilterOpen || isFilterClosing) || selectedGrades.length < GRADES.length ? 'bg-blue-600 text-white border-blue-400' : 'bg-gray-800/90 text-white border-gray-700 hover:bg-gray-700'}
             `}
             title="Filter Grades"
           >
              {selectedGrades.length === GRADES.length ? (
                <Filter size={24} />
              ) : (
                 <span className="text-xs font-bold leading-none text-center">
                   {selectedGrades.length <= 2 ? selectedGrades.join(' ') : selectedGrades.length}
                 </span>
              )}
           </button>
           
           {(isFilterOpen || isFilterClosing) && (
             <>
               {/* Transparent Backdrop to close on outside click */}
               <div className="fixed inset-0 z-10" onClick={closeFilter}></div>

               <div className={`absolute right-14 top-0 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-3 flex flex-col gap-2 z-20 w-32 origin-top-right ${isFilterClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
                  <div className="text-xs text-gray-400 font-bold uppercase mb-1">Filter Map</div>
                  <div className="grid grid-cols-2 gap-2">
                     {GRADES.map(grade => (
                       <button
                         key={grade}
                         onClick={() => toggleGradeFilter(grade)}
                         className={`
                           text-sm font-bold py-1.5 rounded transition border
                           ${selectedGrades.includes(grade) 
                              ? `${getGradeColor(grade)} bg-gray-700 border-gray-600` 
                              : 'text-gray-600 border-transparent hover:bg-gray-700/50'}
                         `}
                       >
                         {grade}
                       </button>
                     ))}
                  </div>
                  <div className="border-t border-gray-700 mt-1 pt-2 flex justify-between text-[10px]">
                     <button onClick={() => setSelectedGrades(GRADES)} className="text-blue-400 hover:text-blue-300">All</button>
                     <button onClick={() => setSelectedGrades([])} className="text-gray-500 hover:text-gray-400">None</button>
                  </div>
               </div>
             </>
           )}
        </div>

        <button 
          onClick={() => setViewState(ViewState.STATS)}
          className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group w-12 h-12 flex items-center justify-center"
          title="Rankings"
        >
          <BarChart2 size={24} className="group-hover:text-blue-400 transition" />
        </button>

        <button 
            onClick={() => setViewState(ViewState.INFO)}
            className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group w-12 h-12 flex items-center justify-center"
            title="Info"
          >
            <Info size={24} className="group-hover:text-blue-400 transition" />
        </button>
      </div>

      {/* Bottom Right Custom Map Controls */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
        <button 
           onClick={handleResetView}
           className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group"
           title="Reset View to GTA"
        >
           <MapIcon size={24} className="group-hover:text-blue-400 transition" />
        </button>
        <button 
           onClick={handleLocateMe}
           className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group"
           title="Locate Me"
        >
           <Crosshair size={24} className="group-hover:text-blue-400 transition" />
        </button>
        <button 
           onClick={handleZoomIn}
           className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group"
           title="Zoom In"
        >
           <Plus size={24} className="group-hover:text-blue-400 transition" />
        </button>
        <button 
           onClick={handleZoomOut}
           className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group"
           title="Zoom Out"
        >
           <Minus size={24} className="group-hover:text-blue-400 transition" />
        </button>
      </div>

      {/* Add Button - Bottom Center - New Glassmorphism Design with Rotate Animation */}
      {!hideAddButton && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-auto">
          <button 
            onClick={handleToggleAdd}
            className={`group relative flex items-center justify-center w-16 h-16 rounded-full border backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out active:scale-95
               ${isAddModalOpen 
                 ? 'bg-red-500/80 border-red-400/50 shadow-red-500/20' 
                 : 'bg-gray-900/40 border-white/20 hover:bg-gray-900/60 hover:shadow-blue-500/20 hover:scale-105'
               }
            `}
            title={isAddModalOpen ? "Close" : "Add Memory"}
          >
             {/* Inner ring for idle animation */}
             {!isAddModalOpen && <div className="absolute inset-0 rounded-full border border-white/5 group-hover:scale-110 transition-transform duration-500 opacity-50"></div>}
             
             <Plus 
               size={32} 
               className={`text-white/90 drop-shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                 ${isAddModalOpen ? 'rotate-[135deg]' : 'group-hover:rotate-90'}
               `} 
             />
          </button>
        </div>
      )}

      {/* Modals */}
      {viewState === ViewState.ADD_ENTRY && (
        <AddVisitModal 
          mapInstance={mapInstance}
          currentLocation={currentMapCenter}
          existingRestaurants={restaurants}
          onClose={() => {
            setViewState(ViewState.MAP);
            setHideAddButton(false);
          }}
          onSave={handleSaveVisit}
          onPhotosUploaded={(hasPhotos) => setHideAddButton(hasPhotos)}
        />
      )}

      {viewState === ViewState.EDIT_ENTRY && editingData && (
        <EditVisitModal
          restaurant={editingData.restaurant}
          visit={editingData.visit}
          onClose={() => {
            setEditingData(null);
            setViewState(ViewState.RESTAURANT_DETAIL);
          }}
          onSave={handleUpdateVisit}
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
          onAddAnotherVisit={() => setViewState(ViewState.ADD_ENTRY)}
          onDeleteVisit={handleDeleteVisit}
          onEditVisit={handleEditTrigger}
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

      {viewState === ViewState.STATS && (
        <StatsModal 
          restaurants={restaurants}
          onClose={() => setViewState(ViewState.MAP)}
        />
      )}
    </div>
  );
}

export default App;
