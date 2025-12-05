import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Restaurant, Visit, ViewState, UserMap } from './types';
import { GOOGLE_MAPS_API_KEY } from './firebaseConfig';

// Hooks
import {
  useAuth,
  useMaps,
  useRestaurants,
  useSearch,
  useFilter,
  useMapControls,
  useNotifications
} from './hooks';

// Components
import MapContainer from './components/MapContainer';
import AddVisitModal from './components/AddVisitModal';
import RestaurantDetail from './components/RestaurantDetail';
import InfoModal from './components/InfoModal';
import UserHistoryModal from './components/UserHistoryModal';
import EditVisitModal from './components/EditVisitModal';
import StatsModal from './components/StatsModal';
import MapManagementModal from './components/MapManagementModal';
import { SiteManagementModal } from './components/SiteManagementModal';
import { Tutorial, TutorialButton } from './components/Tutorial';

// New extracted components
import { LoginScreen } from './components/LoginScreen';
import { PendingScreen } from './components/PendingScreen';
import { HeaderBar } from './components/HeaderBar';
import { MapSelectorPill } from './components/MapSelectorPill';
import { SideMenu } from './components/SideMenu';
import { UserDetailModal } from './components/UserDetailModal';
import { MemberAvatars } from './components/MemberAvatars';
import { AddButton } from './components/AddButton';
import { MapControls, MapControlsRef } from './components/MapControls';

function App() {
  // Auth hook
  const {
    user,
    userProfile,
    isCheckingStatus,
    login,
    loginWithEmail,
    signUpWithEmail,
    resendVerificationEmail,
    loginAsGuest,
    logout,
    refreshStatus,
    updateUserProfile
  } = useAuth();

  // View state
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);

  // Maps hook
  const {
    activeMap,
    setActiveMap,
    allMaps,
    userOwnMaps,
    userSharedMaps,
    userJoinedMaps,
    createSharedMap,
    joinSharedMap,
    leaveSharedMap,
    kickMember
  } = useMaps(user, userProfile);

  // Notifications hook
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    notifyMapMembers
  } = useNotifications(user);

  // Restaurants hook
  const {
    restaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    saveVisit,
    updateVisit,
    deleteVisit,
    clearDatabase
  } = useRestaurants(user, userProfile, activeMap, viewState, setViewState);

  // Search hook
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchFocused,
    setIsSearchFocused,
    isSearchClosing,
    searchInputRef,
    closeSearch,
    handleSearchSelect
  } = useSearch(restaurants);

  // Filter hook
  const {
    selectedGrades,
    isFilterOpen,
    isFilterClosing,
    filteredRestaurants,
    toggleGradeFilter,
    selectAllGrades,
    clearAllGrades,
    handleFilterToggle,
    closeFilter
  } = useFilter(restaurants);

  // Map controls hook
  const {
    mapInstance,
    currentMapCenter,
    mapType,
    handleMapLoad,
    handleToggleMapType,
    handleLocateMe,
    handleResetView,
    handleZoomToMunicipality
  } = useMapControls();

  // Ref for MapControls to reset click state
  const mapControlsRef = useRef<MapControlsRef>(null);

  // UI State
  const [hideAddButton, setHideAddButton] = useState(false);
  const [isAddModalClosing, setIsAddModalClosing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [isMenuAnimatingIn, setIsMenuAnimatingIn] = useState(false);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [isUserDetailClosing, setIsUserDetailClosing] = useState(false);
  const [isCompactCardOpen, setIsCompactCardOpen] = useState(false);
  const [editingData, setEditingData] = useState<{ restaurant: Restaurant; visit: Visit } | null>(null);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  // Tutorial handlers
  const handleStartTutorial = useCallback(() => {
    // Close any open menus/modals
    setIsMenuOpen(false);
    setIsCompactCardOpen(false);
    setIsUserDetailOpen(false);
    closeSearch();
    closeFilter();
    // Close map management if it's open
    if (viewState === ViewState.MAP_MANAGEMENT) {
      setViewState(ViewState.MAP);
    }
    setIsTutorialActive(true);
  }, [closeSearch, closeFilter, viewState]);

  const handleTutorialComplete = useCallback(() => {
    setIsTutorialActive(false);
    // Close map management modal after tutorial ends
    if (viewState === ViewState.MAP_MANAGEMENT) {
      setViewState(ViewState.MAP);
    }
    // Close compact card
    setIsCompactCardOpen(false);
    // Close side menu
    setIsMenuOpen(false);
    setIsMenuClosing(false);
    setIsMenuAnimatingIn(false);
    // Close filter and search
    closeFilter();
    closeSearch();
  }, [viewState, closeFilter, closeSearch]);

  const handleTutorialSkip = useCallback(() => {
    setIsTutorialActive(false);
    // Close map management modal after tutorial skip
    if (viewState === ViewState.MAP_MANAGEMENT) {
      setViewState(ViewState.MAP);
    }
    // Close compact card
    setIsCompactCardOpen(false);
    // Close side menu
    setIsMenuOpen(false);
    setIsMenuClosing(false);
    setIsMenuAnimatingIn(false);
    // Close filter and search
    closeFilter();
    closeSearch();
  }, [viewState, closeFilter, closeSearch]);

  // Open map management for tutorial
  const handleOpenMapManagementForTutorial = useCallback(() => {
    setViewState(ViewState.MAP_MANAGEMENT);
  }, []);

  // Derive view state from user/profile status
  React.useEffect(() => {
    if (!user) {
      setViewState(ViewState.LOGIN);
    } else if (user.isAnonymous) {
      setViewState(ViewState.MAP);
    } else if (userProfile) {
      // Check if email is verified AND admin approved
      const emailVerified = user.emailVerified ?? userProfile.emailVerified ?? false;
      const isApproved = userProfile.status === 'approved';
      
      if (emailVerified && isApproved) {
        if (viewState === ViewState.LOGIN || viewState === ViewState.PENDING) {
          setViewState(ViewState.MAP);
        }
      } else {
        setViewState(ViewState.PENDING);
      }
    }
  }, [user, userProfile]);

  // Time-based greeting notification - send once per part of day (morning/afternoon/evening/night)
  const [hasShownGreeting, setHasShownGreeting] = React.useState(false);
  React.useEffect(() => {
    const sendGreetingNotification = async () => {
      if (!user || user.isAnonymous || hasShownGreeting) return;
      if (!userProfile || userProfile.status !== 'approved') return;

      // Get current time info
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // Determine time period
      let timePeriod: 'morning' | 'afternoon' | 'evening' | 'night';
      let greeting: string;
      let greetingZh: string;

      if (hour >= 5 && hour < 12) {
        timePeriod = 'morning';
        greeting = `Good morning`;
        greetingZh = '早上好';
      } else if (hour >= 12 && hour < 17) {
        timePeriod = 'afternoon';
        greeting = `Good afternoon`;
        greetingZh = '下午好';
      } else if (hour >= 17 && hour < 21) {
        timePeriod = 'evening';
        greeting = `Good evening`;
        greetingZh = '晚上好';
      } else {
        timePeriod = 'night';
        greeting = `Good night`;
        greetingZh = '晚安';
      }

      // Check if we've already sent a greeting for this time period today
      const greetingKey = `greeting_${user.uid}_${dateKey}_${timePeriod}`;
      const alreadySent = localStorage.getItem(greetingKey);

      if (!alreadySent) {
        try {
          const userName = user.displayName || userProfile?.displayName || 'friend';
          const isWeekend = now.getDay() === 0 || now.getDay() === 6;

          // Create personalized message with day context
          let message: string;
          if (isWeekend) {
            message = `${greeting}, ${userName}! Happy ${dayOfWeek}! Perfect time to explore and add new memories to your map. 🗺️`;
          } else {
            message = `${greeting}, ${userName}! It's ${dayOfWeek}. Ready to discover some new places today? 🌟`;
          }

          await createNotification({
            recipientUid: user.uid,
            type: 'welcome',
            message
          });

          localStorage.setItem(greetingKey, 'true');
          setHasShownGreeting(true);
        } catch (error) {
          console.error('Failed to send greeting notification:', error);
        }
      } else {
        setHasShownGreeting(true);
      }
    };

    sendGreetingNotification();
  }, [user, userProfile, hasShownGreeting, createNotification]);

  // Menu handlers
  const closeMenu = useCallback(() => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsMenuClosing(false);
      setIsMenuAnimatingIn(false);
    }, 300);
  }, []);

  const handleMenuToggle = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      setIsMenuOpen(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsMenuAnimatingIn(true);
        });
      });
    }
  }, [isMenuOpen, closeMenu]);

  // User detail handlers
  const closeUserDetail = useCallback(() => {
    setIsUserDetailClosing(true);
    setTimeout(() => {
      setIsUserDetailOpen(false);
      setIsUserDetailClosing(false);
    }, 200);
  }, []);

  // Login handlers
  const handleLogin = useCallback(async () => {
    try {
      await login();
    } catch (error) {
      alert("Login failed. Please try again.");
    }
  }, [login]);

  const handleGuestLogin = useCallback(async () => {
    try {
      const demoMap = await loginAsGuest();
      setActiveMap(demoMap);
      setViewState(ViewState.MAP);
    } catch (error) {
      console.error("Guest login failed:", error);
    }
  }, [loginAsGuest, setActiveMap]);

  const handleLogout = useCallback(async () => {
    await logout();
    setViewState(ViewState.LOGIN);
  }, [logout]);

  const handleRefreshStatus = useCallback(async () => {
    const result = await refreshStatus();
    if (result.emailVerified && result.approved) {
      setViewState(ViewState.MAP);
    }
  }, [refreshStatus]);

  // Restaurant handlers
  const handleSaveVisit = useCallback(async (restaurantInfo: Restaurant, visit: Visit) => {
    try {
      await saveVisit(restaurantInfo, visit);
      setViewState(ViewState.MAP);
      setHideAddButton(false);
    } catch (e) {
      console.error("Error saving to Firestore:", e);
      alert("Failed to save memory. Check your internet connection.");
    }
  }, [saveVisit]);

  const handleUpdateVisit = useCallback(async (restaurantId: string, oldVisit: Visit, newVisit: Visit) => {
    try {
      await updateVisit(restaurantId, oldVisit, newVisit);
      setEditingData(null);
      setViewState(ViewState.RESTAURANT_DETAIL);
    } catch (e) {
      console.error("Error updating visit:", e);
      alert("Failed to update memory.");
    }
  }, [updateVisit]);

  const handleDeleteVisit = useCallback(async (restaurant: Restaurant, visitToDelete: Visit) => {
    try {
      const wasDeleted = await deleteVisit(restaurant, visitToDelete);
      if (wasDeleted) {
        setViewState(ViewState.MAP);
      }
    } catch (e) {
      console.error("Error deleting visit:", e);
      alert("Failed to delete memory.");
    }
  }, [deleteVisit]);

  const handleClearDatabase = useCallback(async () => {
    if (!window.confirm("WARNING: This will delete ALL experiences from the database. This action cannot be undone. Are you sure?")) {
      return;
    }
    try {
      await clearDatabase();
      alert("Database has been reset successfully.");
      setViewState(ViewState.MAP);
    } catch (e) {
      console.error("Error clearing database:", e);
      alert("Failed to clear database.");
    }
  }, [clearDatabase]);

  const handleEditTrigger = useCallback((r: Restaurant, v: Visit) => {
    setEditingData({ restaurant: r, visit: v });
    setViewState(ViewState.EDIT_ENTRY);
  }, []);

  const handleMarkerClick = useCallback((r: Restaurant) => {
    setSelectedRestaurant(r);
    setViewState(ViewState.RESTAURANT_DETAIL);
  }, [setSelectedRestaurant]);

  const handleToggleAdd = useCallback(() => {
    if (viewState === ViewState.ADD_ENTRY) {
      // Trigger closing animation
      setIsAddModalClosing(true);
      setTimeout(() => {
        setViewState(ViewState.MAP);
        setHideAddButton(false);
        setIsAddModalClosing(false);
      }, 200);
    } else {
      setViewState(ViewState.ADD_ENTRY);
    }
  }, [viewState]);

  // Handler for when modal closes itself (via X button in modal header)
  const handleAddModalClose = useCallback(() => {
    setViewState(ViewState.MAP);
    setHideAddButton(false);
    setIsAddModalClosing(false);
  }, []);

  // Search select handler
  const onSearchSelect = useCallback((restaurant: Restaurant) => {
    handleSearchSelect(restaurant, mapInstance, (r) => {
      setSelectedRestaurant(r);
      setViewState(ViewState.RESTAURANT_DETAIL);
    });
  }, [handleSearchSelect, mapInstance, setSelectedRestaurant]);

  // Map click handler
  const handleMapClick = useCallback(() => {
    if (isFilterOpen) {
      closeFilter();
    }
    setIsCompactCardOpen(false);
    // Reset map controls click state
    mapControlsRef.current?.resetClickState();
  }, [isFilterOpen, closeFilter]);

  // Check if we should show the map view
  const showMapView = useMemo(() => {
    return [
      ViewState.MAP,
      ViewState.RESTAURANT_DETAIL,
      ViewState.ADD_ENTRY,
      ViewState.EDIT_ENTRY,
      ViewState.INFO,
      ViewState.STATS,
      ViewState.USER_HISTORY,
      ViewState.SITE_MANAGEMENT
    ].includes(viewState);
  }, [viewState]);

  const isAddModalOpen = viewState === ViewState.ADD_ENTRY;

  // RENDER

  if (viewState === ViewState.PENDING) {
    const emailVerified = user?.emailVerified ?? userProfile?.emailVerified ?? false;
    const adminApproved = userProfile?.status === 'approved';
    
    return (
      <PendingScreen
        isCheckingStatus={isCheckingStatus}
        emailVerified={emailVerified}
        adminApproved={adminApproved}
        onRefreshStatus={handleRefreshStatus}
        onResendVerification={resendVerificationEmail}
        onLogout={handleLogout}
      />
    );
  }

  if (viewState === ViewState.LOGIN) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGuestLogin={handleGuestLogin}
        onEmailLogin={loginWithEmail}
        onEmailSignUp={signUpWithEmail}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
      {showMapView && (
        <>
          {/* Top Center Controls */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
            <HeaderBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearchFocused={isSearchFocused}
              setIsSearchFocused={setIsSearchFocused}
              isSearchClosing={isSearchClosing}
              searchInputRef={searchInputRef}
              closeSearch={closeSearch}
              onSearchSelect={onSearchSelect}
              selectedGrades={selectedGrades}
              isFilterOpen={isFilterOpen}
              isFilterClosing={isFilterClosing}
              onToggleGradeFilter={toggleGradeFilter}
              onSelectAllGrades={selectAllGrades}
              onClearAllGrades={clearAllGrades}
              onFilterToggle={handleFilterToggle}
              closeFilter={closeFilter}
              onMenuToggle={handleMenuToggle}
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              showNotifications={!user?.isAnonymous}
            />

            {/* Map Selector Pill */}
            {activeMap && user && (
              <MapSelectorPill
                activeMap={activeMap}
                user={user}
                userProfile={userProfile}
                userOwnMaps={userOwnMaps}
                userSharedMaps={userSharedMaps}
                userJoinedMaps={userJoinedMaps}
                allMaps={allMaps}
                isCompactCardOpen={isCompactCardOpen}
                setIsCompactCardOpen={setIsCompactCardOpen}
                onSelectMap={setActiveMap}
                onManageMaps={() => setViewState(ViewState.MAP_MANAGEMENT)}
                restaurantsCount={restaurants.length}
                filteredCount={filteredRestaurants.length}
              />
            )}
          </div>

          <MapContainer
            apiKey={GOOGLE_MAPS_API_KEY}
            restaurants={filteredRestaurants}
            onMapLoad={handleMapLoad}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
            mapType={mapType}
          />

          {/* Bottom Right Map Controls */}
          <MapControls
            ref={mapControlsRef}
            mapType={mapType}
            onZoomToMunicipality={handleZoomToMunicipality}
            onToggleMapType={handleToggleMapType}
          />

          {/* Member Avatars */}
          {activeMap && <MemberAvatars activeMap={activeMap} />}

          {/* Add Button */}
          <AddButton
            isAddModalOpen={isAddModalOpen}
            hideAddButton={hideAddButton}
            isModalActive={viewState === ViewState.RESTAURANT_DETAIL || viewState === ViewState.INFO || viewState === ViewState.STATS || viewState === ViewState.USER_HISTORY || viewState === ViewState.MAP_MANAGEMENT || viewState === ViewState.EDIT_ENTRY || viewState === ViewState.SITE_MANAGEMENT}
            onToggle={handleToggleAdd}
          />
        </>
      )}

      {/* Side Menu */}
      {user && (
        <SideMenu
          user={user}
          userProfile={userProfile}
          isMenuOpen={isMenuOpen}
          isMenuClosing={isMenuClosing}
          isMenuAnimatingIn={isMenuAnimatingIn}
          onClose={closeMenu}
          onOpenUserDetail={() => setIsUserDetailOpen(true)}
          onViewStats={() => setViewState(ViewState.STATS)}
          onManageMaps={() => {
            setIsCompactCardOpen(false);
            setViewState(ViewState.MAP_MANAGEMENT);
          }}
          onViewInfo={() => setViewState(ViewState.INFO)}
          onSiteManagement={() => setViewState(ViewState.SITE_MANAGEMENT)}
          onStartTutorial={handleStartTutorial}
        />
      )}

      {/* User Detail Modal */}
      {user && (
        <UserDetailModal
          user={user}
          userProfile={userProfile}
          isOpen={isUserDetailOpen}
          isClosing={isUserDetailClosing}
          onClose={closeUserDetail}
          onViewHistory={() => setViewState(ViewState.USER_HISTORY)}
          onLogout={handleLogout}
          onUpdateProfile={updateUserProfile}
        />
      )}

      {/* Modals */}
      {(viewState === ViewState.ADD_ENTRY || isAddModalClosing) && (
        <AddVisitModal
          mapInstance={mapInstance}
          currentLocation={currentMapCenter}
          existingRestaurants={restaurants}
          onClose={handleAddModalClose}
          onSave={handleSaveVisit}
          onPhotosUploaded={(hasPhotos) => setHideAddButton(hasPhotos)}
          isGuest={user?.uid === 'guest-user' || user?.isAnonymous || false}
          externalIsClosing={isAddModalClosing}
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
          isAdmin={userProfile?.role === 'admin'}
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
          onCreateSharedMap={createSharedMap}
          onJoinSharedMap={joinSharedMap}
          onLeaveSharedMap={leaveSharedMap}
          onKickMember={kickMember}
          onSelectMap={(map) => {
            setActiveMap(map);
          }}
        />
      )}

      {viewState === ViewState.SITE_MANAGEMENT && userProfile?.role === 'admin' && (
        <SiteManagementModal
          onClose={() => setViewState(ViewState.MAP)}
        />
      )}

      {/* Floating Tutorial Button for Guest Users - Above map controls, right aligned */}
      {user?.isAnonymous && !isTutorialActive && showMapView && (
        <div className="fixed bottom-52 right-4 z-30">
          <TutorialButton onClick={handleStartTutorial} isGuestUser={true} />
        </div>
      )}

      {/* Tutorial Overlay */}
      <Tutorial
        isActive={isTutorialActive}
        onClose={handleTutorialComplete}
        onOpenMapManagement={handleOpenMapManagementForTutorial}
        onCloseMapManagement={() => {
          if (viewState === ViewState.MAP_MANAGEMENT) {
            setViewState(ViewState.MAP);
          }
          // Close the compact card if open
          setIsCompactCardOpen(false);
          // Close side menu if open
          if (isMenuOpen) {
            setIsMenuClosing(true);
            setTimeout(() => {
              setIsMenuOpen(false);
              setIsMenuClosing(false);
              setIsMenuAnimatingIn(false);
            }, 300);
          } else {
            setIsMenuAnimatingIn(false);
          }
          // Close filter and search
          closeFilter();
          closeSearch();
        }}
        isGuestUser={user?.isAnonymous || false}
      />
    </div>
  );
}

export default App;
