import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, MapPin, Map as MapIcon, Info, LogOut, User as UserIcon, BarChart2, Search, X, Crosshair, Minus, LocateFixed, Filter, Lock, Clock, RefreshCw, Layers, Menu, Building2, Settings, Users, Globe } from 'lucide-react';
import { Restaurant, ViewState, Coordinates, Visit, UserProfile, UserMap } from './types';
import MapContainer from './components/MapContainer';
import AddVisitModal from './components/AddVisitModal';
import RestaurantDetail from './components/RestaurantDetail';
import InfoModal from './components/InfoModal';
import UserHistoryModal from './components/UserHistoryModal';
import EditVisitModal from './components/EditVisitModal';
import StatsModal from './components/StatsModal';
import MapManagementModal from './components/MapManagementModal';
import { calculateAverageGrade, GRADES, getGradeColor } from './utils/rating';

// Firebase Imports
import { auth, googleProvider, db, GOOGLE_MAPS_API_KEY, signInAsGuest } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion, getDoc, deleteDoc, getDocs } from 'firebase/firestore';

import { ensureDefaultMapForUser } from './services/maps';

interface AppUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  isAnonymous?: boolean;
}

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Store full profile including role
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeMap, setActiveMap] = useState<UserMap | null>(null);
  const [allMaps, setAllMaps] = useState<UserMap[]>([]); // For admin map selector
  const [userOwnMaps, setUserOwnMaps] = useState<UserMap[]>([]); // User's own maps (default + shared they created)
  const [userSharedMaps, setUserSharedMaps] = useState<UserMap[]>([]); // Shared maps user created
  const [userJoinedMaps, setUserJoinedMaps] = useState<UserMap[]>([]); // Shared maps user joined

  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Grade Filter State
  const [selectedGrades, setSelectedGrades] = useState<string[]>(GRADES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  
  // UI State
  const [hideAddButton, setHideAddButton] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'roadmap' | 'dark'>('satellite');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [isMenuAnimatingIn, setIsMenuAnimatingIn] = useState(false);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [isUserDetailClosing, setIsUserDetailClosing] = useState(false);
  const [isCompactCardOpen, setIsCompactCardOpen] = useState(false);
  const [clickedMemberUid, setClickedMemberUid] = useState<string | null>(null);

  const [editingData, setEditingData] = useState<{ restaurant: Restaurant, visit: Visit } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<Coordinates>({ lat: 43.6532, lng: -79.3832 });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.isAnonymous ? 'Guest' : currentUser.displayName,
          photoURL: currentUser.photoURL,
          email: currentUser.email,
          isAnonymous: currentUser.isAnonymous
        });
        // We do NOT set ViewState.MAP here immediately for real users.
        // The checkUserStatus effect will handle it.
      } else {
        // If user logs out, or was never logged in
        setUser(null);
        setUserProfile(null);
        setViewState(ViewState.LOGIN);
      }
    });
    return () => unsubscribe();
  }, []);

  // Check User Approval Status (Real Users Only, skip anonymous/guest)
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || user.isAnonymous) return;
      
      setIsCheckingStatus(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          setUserProfile(userData); // Save profile to state
          
          if (userData.status === 'approved') {
            setViewState(ViewState.MAP);
          } else {
            setViewState(ViewState.PENDING);
          }
        } else {
          // Create new user doc
          const newProfile: UserProfile = {
            email: user.email || 'unknown',
            status: 'pending',
            role: 'user',
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
          setViewState(ViewState.PENDING);
        }
      } catch (err) {
        console.error("Error checking user status:", err);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    if (user && !user.isAnonymous) {
      checkStatus();
    } else if (user && user.isAnonymous) {
      // Anonymous/guest users go directly to map
      setViewState(ViewState.MAP);
    }
  }, [user]);

  // Ensure default map for approved users (including guest)
  useEffect(() => {
    const setupMap = async () => {
      if (!user) {
        setActiveMap(null);
        return;
      }
      if (!userProfile || userProfile.status !== 'approved') {
        return;
      }
      try {
        const map = await ensureDefaultMapForUser({
          uid: user.uid,
          displayName: user.displayName,
        });
        setActiveMap(map);
      } catch (err) {
        console.error('Failed to ensure default map:', err);
      }
    };

    setupMap();
  }, [user, userProfile]);


  // Admin: subscribe to all maps for selector
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
          createdAt: d.createdAt?.toDate?.().toISOString?.(),
          updatedAt: d.updatedAt?.toDate?.().toISOString?.(),
        };
      });
      setAllMaps(data);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  // Subscribe to user's own maps (default + shared they created) and joined maps
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    // Subscribe to all maps to find ones user owns or has joined
    const userMapsRef = collection(db, 'maps');
    const unsubscribe = onSnapshot(userMapsRef, (snapshot) => {
      const ownMaps: UserMap[] = [];
      const sharedMaps: UserMap[] = [];
      const joinedMaps: UserMap[] = [];

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

        if (d.ownerUid === user.uid) {
          // User owns this map
          ownMaps.push(mapData);
          if (d.visibility === 'shared') {
            sharedMaps.push(mapData);
          }
        } else if (d.members && d.members.includes(user.uid)) {
          // User is a member of this shared map (but not owner)
          joinedMaps.push(mapData);
        }
      });

      setUserOwnMaps(ownMaps);
      setUserSharedMaps(sharedMaps);
      setUserJoinedMaps(joinedMaps);
    });

    return () => unsubscribe();
  }, [user]);

  // Data Fetching (Only when Map is Active)
  useEffect(() => {
    if (!user || viewState === ViewState.PENDING || viewState === ViewState.LOGIN) return;
    if (!activeMap) return;

    // Guest users get an empty map - no Firebase access
    if (user.isAnonymous) {
      setRestaurants([]);
      return;
    }

    const restaurantsRef = collection(db, 'maps', activeMap.id, 'restaurants');

    const unsubscribe = onSnapshot(restaurantsRef, (snapshot) => {
      const fetchedRestaurants: Restaurant[] = [];
      const docsToDelete: any[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Restaurant;
        if (!data.visits || data.visits.length === 0) {
          // Fixed: Collect docs to delete instead of deleting in the listener
          // This prevents race conditions with the snapshot listener
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
          setViewState(ViewState.MAP);
          return null;
        }
      });
    }, (error) => {
      console.error("Error fetching data:", error);
    });

    return () => unsubscribe();
    // Fixed: Removed selectedRestaurant from dependencies to prevent re-subscription
  }, [user, viewState, activeMap]);


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

  const handleGuestLogin = async () => {
    // Set guest user state directly (view-only mode)
    const guestProfile: UserProfile = {
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

  const handleLogout = async () => {
    if (user?.isAnonymous) {
      // Guest user - just clear state
      setUser(null);
      setUserProfile(null);
      setActiveMap(null);
    } else {
      await signOut(auth);
    }
    setViewState(ViewState.LOGIN);
  };

  const handleRefreshStatus = async () => {
    if (!user || user.isAnonymous) return;
    setIsCheckingStatus(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        setUserProfile(userData);
        if (userData.status === 'approved') {
          setViewState(ViewState.MAP);
        } else {
          alert("Account is still pending approval.");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingStatus(false);
    }
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

  // Dark mode map styles
  const darkModeStyles: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64779e" }] },
    { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#334e87" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#023e58" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
    { featureType: "poi", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#023e58" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3C7680" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b0d5ce" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#023e58" }] },
    { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "transit", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "transit.line", elementType: "geometry.fill", stylers: [{ color: "#283d6a" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#3a4762" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] },
  ];

  const handleToggleMapType = () => {
    if (mapInstance) {
      if (mapType === 'satellite') {
        mapInstance.setMapTypeId('roadmap');
        mapInstance.setOptions({ styles: [] });
        setMapType('roadmap');
      } else if (mapType === 'roadmap') {
        mapInstance.setMapTypeId('roadmap');
        mapInstance.setOptions({ styles: darkModeStyles });
        setMapType('dark');
      } else {
        mapInstance.setMapTypeId('satellite');
        mapInstance.setOptions({ styles: [] });
        setMapType('satellite');
      }
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
      const bounds = new google.maps.LatLngBounds(
        { lat: 43.48, lng: -79.80 },
        { lat: 43.90, lng: -79.00 }
      );
      mapInstance.fitBounds(bounds);
    }
  };

  const handleZoomToMunicipality = () => {
    if (!navigator.geolocation || !mapInstance) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: userPos }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            // Find the locality (city/municipality) result
            let municipalityResult = results.find(r =>
              r.types.includes('locality') || r.types.includes('sublocality')
            );

            // Fallback to administrative_area_level_3 or level_2
            if (!municipalityResult) {
              municipalityResult = results.find(r =>
                r.types.includes('administrative_area_level_3') ||
                r.types.includes('administrative_area_level_2')
              );
            }

            if (municipalityResult && municipalityResult.geometry.bounds) {
              // Smooth pan to center first, then fit bounds
              const center = municipalityResult.geometry.location;
              mapInstance.panTo(center);

              // After a short delay, fit the bounds with smooth animation
              setTimeout(() => {
                mapInstance.fitBounds(municipalityResult!.geometry.bounds!);
              }, 300);
            } else if (municipalityResult && municipalityResult.geometry.viewport) {
              const center = municipalityResult.geometry.location;
              mapInstance.panTo(center);

              setTimeout(() => {
                mapInstance.fitBounds(municipalityResult!.geometry.viewport!);
              }, 300);
            } else {
              // Fallback: just zoom to user location at city level
              mapInstance.panTo(userPos);
              setTimeout(() => {
                mapInstance.setZoom(13);
              }, 300);
            }
          } else {
            // Geocoding failed, fallback to user location
            mapInstance.panTo(userPos);
            setTimeout(() => {
              mapInstance.setZoom(13);
            }, 300);
          }
        });
      },
      () => {
        alert("Could not access your location. Please check browser permissions.");
      }
    );
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
    }, 200);
  };

  const closeSearch = () => {
    if (!isSearchFocused && !searchQuery) return;
    setIsSearchClosing(true);
    setTimeout(() => {
      setSearchQuery('');
      setIsSearchFocused(false);
      setIsSearchClosing(false);
    }, 150);
  };

  const closeMenu = () => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsMenuClosing(false);
      setIsMenuAnimatingIn(false);
    }, 300);
  };

  const handleMenuToggle = () => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      setIsMenuOpen(true);
      // Trigger animation after render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsMenuAnimatingIn(true);
        });
      });
    }
  };

  const closeUserDetail = () => {
    setIsUserDetailClosing(true);
    setTimeout(() => {
      setIsUserDetailOpen(false);
      setIsUserDetailClosing(false);
    }, 200);
  };

  const handleSaveVisit = async (restaurantInfo: Restaurant, visit: Visit) => {
    if (!user) return;

    const fullVisit: Visit = {
      ...visit,
      createdBy: user.uid,
      creatorName: user.displayName || 'Anonymous',
      creatorPhotoURL: user.photoURL 
    };

    if (!activeMap) throw new Error("No active map");
    const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurantInfo.id);
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
      if (!user || !activeMap) return;
      const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurantId);
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
      if (!activeMap) throw new Error("No active map");
      const restaurantRef = doc(db, "maps", activeMap.id, "restaurants", restaurant.id);
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
      if (!activeMap) return;
      const deletePromises = restaurants.map(r => deleteDoc(doc(db, "maps", activeMap.id, "restaurants", r.id)));
      await Promise.all(deletePromises);
      alert("Database has been reset successfully.");
      setViewState(ViewState.MAP);
    } catch (e) {
      console.error("Error clearing database:", e);
      alert("Failed to clear database.");
    }
  };

  // Generate a unique 4-digit share code
  const generateShareCode = async (): Promise<string> => {
    const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

    // Try up to 10 times to find a unique code
    for (let i = 0; i < 10; i++) {
      const code = generateCode();
      // Check if code is already used
      const mapsRef = collection(db, 'maps');
      const snapshot = await getDocs(mapsRef);
      const existingCodes = snapshot.docs.map(d => d.data().shareCode).filter(Boolean);

      if (!existingCodes.includes(code)) {
        return code;
      }
    }

    // Fallback: use timestamp-based code
    return Date.now().toString().slice(-4);
  };

  const handleCreateSharedMap = async (name: string) => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in to create shared maps');
    }

    // Check if user already has 3 shared maps
    if (userSharedMaps.length >= 3) {
      throw new Error('Maximum of 3 shared maps allowed');
    }

    const shareCode = await generateShareCode();
    const mapId = `shared_${user.uid}_${Date.now()}`;

    const creatorMemberInfo = {
      uid: user.uid,
      displayName: user.displayName || 'Unknown',
      photoURL: user.photoURL,
      joinedAt: new Date().toISOString()
    };

    const newMap = {
      id: mapId,
      ownerUid: user.uid,
      ownerDisplayName: user.displayName || 'Unknown',
      name: name,
      visibility: 'shared',
      isDefault: false,
      shareCode: shareCode,
      members: [user.uid],
      memberInfo: [creatorMemberInfo],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create the map document
    await setDoc(doc(db, 'maps', mapId), newMap);
  };

  const handleJoinSharedMap = async (code: string): Promise<boolean> => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in to join shared maps');
    }

    // Check if user has reached the limit (3 total shared maps: created + joined)
    const totalSharedMaps = userSharedMaps.length + userJoinedMaps.length;
    if (totalSharedMaps >= 3) {
      throw new Error('You can only be part of 3 shared maps total');
    }

    // Search for map with this share code
    const mapsRef = collection(db, 'maps');
    const snapshot = await getDocs(mapsRef);
    
    let foundMap: any = null;
    let foundMapId: string | null = null;
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.shareCode === code && data.visibility === 'shared') {
        foundMap = data;
        foundMapId = docSnap.id;
      }
    });

    if (!foundMap || !foundMapId) {
      return false; // Map not found
    }

    // Check if user is already a member
    if (foundMap.members && foundMap.members.includes(user.uid)) {
      // Already a member, just return true
      return true;
    }

    // Check if map has reached member limit (10 members max)
    const currentMemberCount = foundMap.memberInfo?.length || 1;
    if (currentMemberCount >= 10) {
      throw new Error('This map has reached its member limit (10 members)');
    }

    // Add user to members array and memberInfo
    const mapRef = doc(db, 'maps', foundMapId);
    const newMemberInfo = {
      uid: user.uid,
      displayName: user.displayName || 'Unknown',
      photoURL: user.photoURL,
      joinedAt: new Date().toISOString()
    };

    await updateDoc(mapRef, {
      members: arrayUnion(user.uid),
      memberInfo: arrayUnion(newMemberInfo)
    });

    return true;
  };

  const handleLeaveSharedMap = async (mapId: string): Promise<void> => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in');
    }

    const mapRef = doc(db, 'maps', mapId);
    const mapDoc = await getDoc(mapRef);
    
    if (!mapDoc.exists()) {
      throw new Error('Map not found');
    }

    const mapData = mapDoc.data();
    
    // Remove user from members array
    const updatedMembers = (mapData.members || []).filter((uid: string) => uid !== user.uid);
    
    // Remove user from memberInfo array
    const updatedMemberInfo = (mapData.memberInfo || []).filter((m: any) => m.uid !== user.uid);

    await updateDoc(mapRef, {
      members: updatedMembers,
      memberInfo: updatedMemberInfo
    });

    // If this was the active map, switch to default
    if (activeMap?.id === mapId) {
      const defaultMap = userOwnMaps.find(m => m.isDefault);
      if (defaultMap) {
        setActiveMap(defaultMap);
      }
    }
  };

  const handleKickMember = async (mapId: string, memberUid: string): Promise<void> => {
    if (!user || user.isAnonymous) {
      throw new Error('Must be logged in');
    }

    const mapRef = doc(db, 'maps', mapId);
    const mapDoc = await getDoc(mapRef);
    
    if (!mapDoc.exists()) {
      throw new Error('Map not found');
    }

    const mapData = mapDoc.data();
    
    // Verify current user is the owner
    if (mapData.ownerUid !== user.uid) {
      throw new Error('Only the map owner can remove members');
    }

    // Remove member from members array
    const updatedMembers = (mapData.members || []).filter((uid: string) => uid !== memberUid);
    
    // Remove member from memberInfo array
    const updatedMemberInfo = (mapData.memberInfo || []).filter((m: any) => m.uid !== memberUid);

    await updateDoc(mapRef, {
      members: updatedMembers,
      memberInfo: updatedMemberInfo
    });
  };

  const openAddModal = () => setViewState(ViewState.ADD_ENTRY);

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

  // ---------------- RENDER ----------------

  if (viewState === ViewState.PENDING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6 relative overflow-hidden">
        <div className="bg-gray-800/80 backdrop-blur p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 z-10 text-center animate-scale-in">
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-500/20 p-4 rounded-full">
              <Lock size={40} className="text-yellow-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Pending</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Your account is waiting for administrator approval. Please contact the owner or check back later.
          </p>
          
          <div className="flex flex-col gap-3">
             <button 
               onClick={handleRefreshStatus}
               className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition"
             >
               {isCheckingStatus ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
               Check Status
             </button>
             <button 
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-xl transition"
             >
               <LogOut size={18} />
               Log Out
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === ViewState.LOGIN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[100px]"></div>
         </div>
        <div className="bg-gray-800/80 backdrop-blur p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 z-10 text-center animate-fade-in-up">
          {/* Logo Section */}
          <div className="flex justify-center mb-8">
            <img src="/logo.svg" alt="TraceBook Logo" className="w-40 h-40 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">TraceBook</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Trace your experiences. Share memories with your partner in real-time.
          </p>
          
          {/* Informational Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mx-auto w-fit">
             <span className="text-blue-200 text-sm font-medium tracking-wide">Log in to post and edit experiences</span>
          </div>

          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-black/20 transform hover:scale-[1.02] active:scale-95 mb-4"
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
            className="text-sm text-gray-500 hover:text-white transition underline decoration-transparent hover:decoration-white underline-offset-4"
          >
            or continue as a guest to view
          </button>
        </div>
      </div>
    );
  }

  const isAddModalOpen = viewState === ViewState.ADD_ENTRY;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">

      {/* Map & Add Button Container */}
      {(
        viewState === ViewState.MAP ||
        viewState === ViewState.RESTAURANT_DETAIL ||
        viewState === ViewState.ADD_ENTRY ||
        viewState === ViewState.EDIT_ENTRY ||
        viewState === ViewState.INFO ||
        viewState === ViewState.STATS ||
        viewState === ViewState.USER_HISTORY
      ) && (
        <>
          {/* Top Left Controls */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-[calc(100%-6rem)] max-w-sm pointer-events-none">
            {/* Header / Search Bar */}
            <div
              className="bg-gray-800/90 backdrop-blur border border-gray-700 p-2 rounded-xl shadow-lg pointer-events-auto transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500"
            >
              <div className="flex items-center gap-2 relative min-h-[40px]">
                {/* Hamburger Menu Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleMenuToggle(); }}
                  className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors duration-200 flex-shrink-0"
                >
                  <Menu size={20} />
                </button>

                {/* Logo/Title - clickable to trigger search */}
                {!(isSearchFocused || searchQuery || isSearchClosing) && (
                  <div
                    onClick={() => setIsSearchFocused(true)}
                    className="flex-1 flex items-center gap-2 px-1 text-white cursor-pointer hover:opacity-80 transition-opacity duration-200 animate-scale-in"
                  >
                    <img src="/logo.svg" className="w-7 h-7 object-contain" alt="Logo" />
                    <span className="font-bold truncate">TraceBook</span>
                  </div>
                )}

                {/* Search Input - appears when search is active */}
                {(isSearchFocused || searchQuery || isSearchClosing) && (
                  <div className={`flex-1 flex items-center bg-gray-700/50 rounded-lg px-2 h-[36px] ${isSearchClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
                    <Search size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search your experiences..."
                      className="bg-transparent border-none focus:outline-none text-sm text-white w-full placeholder-gray-500"
                      value={searchQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => { if (!searchQuery) closeSearch(); }, 150)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        closeSearch();
                      }} 
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Search and Filter Buttons */}
                {!(isSearchFocused || searchQuery || isSearchClosing) && (
                  <div className="flex items-center gap-1 animate-scale-in">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsSearchFocused(true); }}
                      className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                    >
                      <Search size={18} />
                    </button>
                    {/* Filter Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFilterToggle(); }}
                      className={`p-1.5 hover:bg-gray-700 rounded-lg transition-colors duration-200 relative ${
                        selectedGrades.length < GRADES.length || isFilterOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Filter size={18} />
                      {selectedGrades.length < GRADES.length && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  </div>
                )}
              </div>

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
                    <p className="text-gray-500 text-sm px-2 py-1">No places found.</p>
                  )}
                </div>
              )}

              {/* Filter Dropdown - appears inside header bar */}
              {(isFilterOpen || isFilterClosing) && (
                <>
                  <div className="fixed inset-0 z-10" onClick={closeFilter}></div>
                  <div className={`mt-2 border-t border-gray-700 pt-3 pb-1 relative z-20 ${isFilterClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
                    <div className="text-xs text-gray-400 font-bold uppercase mb-2 px-1">Filter by Grade</div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {GRADES.map(grade => (
                        <button
                          key={grade}
                          onClick={(e) => { e.stopPropagation(); toggleGradeFilter(grade); }}
                          className={`
                            text-sm font-bold py-2 rounded-lg transition border
                            ${selectedGrades.includes(grade) 
                              ? `${getGradeColor(grade)} bg-gray-700 border-gray-600` 
                              : 'text-gray-600 border-transparent hover:bg-gray-700/50'}
                          `}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between text-xs px-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedGrades(GRADES); }} className="text-blue-400 hover:text-blue-300">Select All</button>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedGrades([]); }} className="text-gray-500 hover:text-gray-400">Clear All</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Map Selector Pill */}
            {activeMap && (
              <button
                onClick={() => setIsCompactCardOpen(prev => !prev)}
                className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 mt-1 rounded-full backdrop-blur border shadow-lg transition-all duration-200 text-sm font-medium pointer-events-auto self-start
                  ${isCompactCardOpen
                    ? 'bg-blue-600/90 border-blue-400/50 text-white'
                    : activeMap.isDefault 
                      ? 'bg-gray-900/80 border-gray-700 text-gray-200 hover:bg-gray-800/90 hover:border-gray-600'
                      : activeMap.ownerUid === user?.uid
                        ? 'bg-purple-900/80 border-purple-700 text-purple-200 hover:bg-purple-800/90 hover:border-purple-600'
                        : 'bg-green-900/80 border-green-700 text-green-200 hover:bg-green-800/90 hover:border-green-600'}
                `}
              >
                {activeMap.isDefault ? (
                  <Lock size={16} className={isCompactCardOpen ? 'text-white' : 'text-blue-400'} />
                ) : activeMap.ownerUid === user?.uid ? (
                  <Users size={16} className={isCompactCardOpen ? 'text-white' : 'text-purple-400'} />
                ) : (
                  <Globe size={16} className={isCompactCardOpen ? 'text-white' : 'text-green-400'} />
                )}
                <span className="truncate max-w-[160px]">{activeMap.name}</span>
              </button>
            )}

            {/* Compact Viewing Card - shows active map info */}
            {isCompactCardOpen && activeMap && (
              <div className="bg-gray-900/90 backdrop-blur border border-gray-700 rounded-xl px-3 py-2 shadow-xl animate-scale-in pointer-events-auto self-start min-w-[220px]">
                <div className="flex items-center gap-2 text-xs text-gray-200">
                  <span className={`inline-flex h-2 w-2 rounded-full flex-shrink-0 ${
                    activeMap.isDefault ? 'bg-blue-400' : 
                    activeMap.ownerUid === user?.uid ? 'bg-purple-400' : 'bg-green-400'
                  }`} />
                  <span className="truncate">
                    Viewing: <span className="font-semibold">{activeMap.name}</span>
                  </span>
                </div>
                
                {/* Map type label */}
                <div className="mt-1 text-[10px]">
                  {activeMap.isDefault ? (
                    <span className="text-blue-400">Your Default Map</span>
                  ) : activeMap.ownerUid === user?.uid ? (
                    <span className="text-purple-400">Shared Map (Owner)</span>
                  ) : (
                    <span className="text-green-400">Shared Map by {activeMap.ownerDisplayName}</span>
                  )}
                </div>

                {/* Map selector dropdown - for non-guest users with maps */}
                {!user?.isAnonymous && (userOwnMaps.length > 0 || userSharedMaps.length > 0 || userJoinedMaps.length > 0) && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Switch Map</label>
                    <select
                      className="w-full bg-gray-800 text-gray-100 text-[11px] rounded-md px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={activeMap.id}
                      onChange={(e) => {
                        // Find map from all sources
                        const allUserMaps = [...userOwnMaps, ...userSharedMaps, ...userJoinedMaps];
                        const selected = allUserMaps.find((m) => m.id === e.target.value);
                        if (selected) setActiveMap(selected);
                      }}
                    >
                      {/* Default Maps Section */}
                      {userOwnMaps.filter(m => m.isDefault).length > 0 && (
                        <>
                          <optgroup label="Your Default Map">
                            {userOwnMaps.filter(m => m.isDefault).map((m) => (
                              <option key={m.id} value={m.id}>
                                🔒 {m.name}
                              </option>
                            ))}
                          </optgroup>
                          {(userSharedMaps.length > 0 || userJoinedMaps.length > 0) && (
                            <option disabled>────────────</option>
                          )}
                        </>
                      )}
                      
                      {/* Created Shared Maps Section */}
                      {userSharedMaps.length > 0 && (
                        <>
                          <optgroup label="Shared Maps (Owner)">
                            {userSharedMaps.map((m) => (
                              <option key={m.id} value={m.id}>
                                👥 {m.name}
                              </option>
                            ))}
                          </optgroup>
                          {userJoinedMaps.length > 0 && (
                            <option disabled>────────────</option>
                          )}
                        </>
                      )}
                      
                      {/* Joined Shared Maps Section */}
                      {userJoinedMaps.length > 0 && (
                        <optgroup label="Shared Maps (Joined)">
                          {userJoinedMaps.map((m) => (
                            <option key={m.id} value={m.id}>
                              🌐 {m.name} ({m.ownerDisplayName})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                {/* Admin all maps selector */}
                {userProfile?.role === 'admin' && allMaps.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Admin: All Maps</label>
                    <select
                      className="w-full bg-gray-800 text-gray-100 text-[11px] rounded-md px-2 py-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={activeMap.id}
                      onChange={(e) => {
                        const selected = allMaps.find((m) => m.id === e.target.value);
                        if (selected) setActiveMap(selected);
                      }}
                    >
                      {allMaps.map((m) => (
                        <option key={m.id} value={m.id}>
                          {(m.ownerDisplayName || m.ownerUid) + ' – ' + m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-4 mt-2 pt-2 border-t border-gray-700 text-xs">
                  <div className="flex gap-1">
                    <span className="text-gray-500">Pins:</span>
                    <span className="text-gray-200">{restaurants.length}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-gray-500">Visible:</span>
                    <span className="text-gray-200">{filteredMapRestaurants.length}</span>
                  </div>
                </div>

                {/* Manage Maps Button - only for non-anonymous users */}
                {!user?.isAnonymous && (
                  <button
                    onClick={() => setViewState(ViewState.MAP_MANAGEMENT)}
                    className="mt-2 pt-2 border-t border-gray-700 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-white transition"
                  >
                    <Settings size={12} />
                    <span>Manage Maps</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <MapContainer
            apiKey={GOOGLE_MAPS_API_KEY}
            restaurants={filteredMapRestaurants}
            onMapLoad={handleMapLoad}
            onMarkerClick={handleMarkerClick}
            onMapClick={() => {
              // Close filter dropdown when clicking on map
              if (isFilterOpen) {
                closeFilter();
              }
              // Close compact card
              setIsCompactCardOpen(false);
              // Close member tooltip
              setClickedMemberUid(null);
            }}
            mapType={mapType}
          />

          {/* Member Avatars - Bottom Left for Shared Maps */}
          {activeMap && !activeMap.isDefault && activeMap.memberInfo && activeMap.memberInfo.length > 0 && (
            <div className="absolute bottom-24 left-4 z-10 flex flex-col-reverse gap-1 pointer-events-auto">
              {activeMap.memberInfo.slice(0, 10).map((member, index) => (
                <div key={member.uid} className="relative">
                  <button
                    onClick={() => {
                      setClickedMemberUid(clickedMemberUid === member.uid ? null : member.uid);
                      // Auto-hide tooltip after 3 seconds
                      setTimeout(() => setClickedMemberUid(null), 3000);
                    }}
                    className={`w-10 h-10 rounded-full border-2 shadow-lg transition-all duration-200 overflow-hidden
                      ${clickedMemberUid === member.uid 
                        ? 'border-blue-400 scale-110 ring-2 ring-blue-400/50' 
                        : 'border-gray-700 hover:border-gray-500 hover:scale-105'}
                      ${member.uid === activeMap.ownerUid ? 'ring-2 ring-purple-500/50' : ''}
                    `}
                    style={{ zIndex: 10 - index }}
                  >
                    {member.photoURL ? (
                      <img 
                        src={member.photoURL} 
                        alt={member.displayName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <UserIcon size={16} className="text-gray-400" />
                      </div>
                    )}
                  </button>
                  
                  {/* Tooltip on click */}
                  {clickedMemberUid === member.uid && (
                    <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap animate-scale-in z-20">
                      <div className="text-white text-sm font-medium">
                        {member.displayName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {member.uid === activeMap.ownerUid ? 'Owner' : 'Member'}
                      </div>
                      {/* Arrow */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 border-l border-b border-gray-600 rotate-45" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Button */}
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
                {!isAddModalOpen && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/30 via-red-400/20 to-blue-500/30 blur-md group-hover:opacity-80 group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
                )}

                {isAddModalOpen ? (
                  <Plus
                    size={32}
                    className="text-white/90 drop-shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] rotate-[135deg]"
                  />
                ) : (
                  <MapPin
                    size={32}
                    className="text-white/90 drop-shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110"
                  />
                )}
              </button>
            </div>
          )}
        </>
      )}
      {/* Bottom Right Custom Map Controls */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
        <button
           onClick={handleZoomToMunicipality}
           className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group"
           title="Zoom to My City"
        >
           <Building2 size={24} className="group-hover:text-blue-400 transition" />
        </button>
        <button
           onClick={handleLocateMe}
           className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 transition group"
           title="Locate Me"
        >
           <Crosshair size={24} className="group-hover:text-blue-400 transition" />
        </button>
        <button
           onClick={handleToggleMapType}
           className={`bg-gray-800/90 backdrop-blur border p-3 rounded-full shadow-lg text-white transition group
             ${mapType !== 'roadmap' ? 'border-blue-500' : 'border-gray-700 hover:bg-gray-700'}
           `}
           title={mapType === 'satellite' ? 'Switch to Road View' : mapType === 'roadmap' ? 'Switch to Dark Mode' : 'Switch to Satellite View'}
        >
           <Layers size={24} className="group-hover:text-blue-400 transition" />
        </button>
      </div>

      {/* Slide-out Menu */}
      {(isMenuOpen || isMenuClosing) && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${isMenuAnimatingIn && !isMenuClosing ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeMenu}
          />

          {/* Menu Panel */}
          <div
            className={`fixed top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-700 z-[101] shadow-2xl transform transition-transform duration-300 ease-out ${isMenuAnimatingIn && !isMenuClosing ? 'translate-x-0' : '-translate-x-full'}`}
          >
            {/* Menu Header */}
            <div className="p-5 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" className="w-10 h-10 object-contain" alt="Logo" />
                <div>
                  <h2 className="text-white font-bold text-lg">TraceBook</h2>
                  <p className="text-gray-500 text-xs">Trace your experiences</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-3 space-y-1">
              {/* User Profile */}
              <button
                onClick={() => {
                  closeMenu();
                  setIsUserDetailOpen(true);
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-gray-700 group-hover:border-gray-600 transition-colors duration-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                    <UserIcon size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                  </div>
                )}
                <div className="text-left">
                  <span className="font-medium block">{user?.displayName || 'User'}</span>
                  <span className="text-xs text-gray-500">View your profile</span>
                </div>
              </button>

              {/* Map Management - available for all users including guests */}
              <button
                onClick={() => {
                  closeMenu();
                  setViewState(ViewState.MAP_MANAGEMENT);
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                  <Layers size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                </div>
                <div className="text-left">
                  <span className="font-medium block">Map Management</span>
                  <span className="text-xs text-gray-500">Manage your maps</span>
                </div>
              </button>

              {/* Stats */}
              <button
                onClick={() => {
                  closeMenu();
                  setViewState(ViewState.STATS);
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                  <BarChart2 size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                </div>
                <div className="text-left">
                  <span className="font-medium block">Statistics</span>
                  <span className="text-xs text-gray-500">View your stats</span>
                </div>
              </button>

              {/* About */}
              <button
                onClick={() => {
                  closeMenu();
                  setViewState(ViewState.INFO);
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors duration-200">
                  <Info size={20} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                </div>
                <div className="text-left">
                  <span className="font-medium block">About</span>
                  <span className="text-xs text-gray-500">How TraceBook works</span>
                </div>
              </button>
            </div>

            {/* Menu Footer - Logout and Close */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 space-y-2">
              {/* Logout Button */}
              <button
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all duration-200 border border-red-500/30"
              >
                <LogOut size={18} />
                <span className="font-medium">Log Out</span>
              </button>
              
              {/* Close Menu Button */}
              <button
                onClick={closeMenu}
                className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all duration-200"
              >
                <X size={18} />
                <span className="text-sm font-medium">Close Menu</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* User Detail Modal */}
      {(isUserDetailOpen || isUserDetailClosing) && user && (
        <>
          <div
            className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-200 ${isUserDetailClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={closeUserDetail}
          />
          <div className={`fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none`}>
            <div
              className={`bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto transform transition-all duration-200 ${isUserDetailClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
            >
              {/* Close button */}
              <button
                onClick={closeUserDetail}
                className="absolute top-24 right-6 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              {/* User Profile Section */}
              <div className="p-6 text-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-24 h-24 rounded-full mx-auto border-4 border-gray-700 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full mx-auto bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                    <UserIcon size={40} className="text-gray-400" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-white mt-4">{user.displayName || 'User'}</h2>
                {user.email && (
                  <p className="text-gray-400 text-sm mt-1">{user.email}</p>
                )}
                {userProfile?.role === 'admin' && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                    Admin
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-700 space-y-2">
                <button
                  onClick={() => {
                    closeUserDetail();
                    setViewState(ViewState.USER_HISTORY);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  <Clock size={18} />
                  <span className="font-medium">View History</span>
                </button>
                <button
                  onClick={() => {
                    closeUserDetail();
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-medium">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
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
          isAdmin={userProfile?.role === 'admin'}
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

      {viewState === ViewState.MAP_MANAGEMENT && user && (
        <MapManagementModal
          userMaps={user.isAnonymous ? [activeMap!].filter(Boolean) : userOwnMaps.filter(m => m.isDefault)}
          sharedMaps={user.isAnonymous ? [] : userSharedMaps}
          joinedMaps={user.isAnonymous ? [] : userJoinedMaps}
          activeMap={activeMap}
          currentUserUid={user.uid}
          isGuest={user.isAnonymous || false}
          onClose={() => setViewState(ViewState.MAP)}
          onCreateSharedMap={handleCreateSharedMap}
          onJoinSharedMap={handleJoinSharedMap}
          onLeaveSharedMap={handleLeaveSharedMap}
          onKickMember={handleKickMember}
          onSelectMap={(map) => {
            setActiveMap(map);
            // Don't close modal - user manually closes
          }}
        />
      )}
    </div>
  );
}

export default App;