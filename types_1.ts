
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Visit {
  id: string;
  date: string;
  photoDataUrl: string; // Primary thumbnail (backward compatibility)
  photos?: string[]; // Array of all photo URLs
  rating: string; // Grade: S, A, B, C, D, E
  comment: string;
  createdBy?: string; // User UID
  creatorName?: string; // User Display Name
  creatorPhotoURL?: string | null; // User Profile Picture
}

export interface Restaurant {
  id: string; // Google Place ID or internal ID
  name: string;
  address: string;
  location: Coordinates;
  visits: Visit[];
}

export const GUEST_ID = 'guest-user';

export interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  emailVerified?: boolean;
  role: 'user' | 'admin';
  createdAt: string;
  joinedMaps?: string[]; // Array of map IDs user has joined
  provider?: string; // Login provider: 'google.com', 'password', etc.
}

// Global declaration for Google Maps
declare global {
  namespace google {
    namespace maps {
      // Core Map Class
      class Map {
        constructor(mapDiv: Element | null, opts?: MapOptions);
        setCenter(latLng: LatLng | LatLngLiteral): void;
        getCenter(): LatLng;
        setZoom(zoom: number): void;
        getZoom(): number;
        panTo(latLng: LatLng | LatLngLiteral): void;
        fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral, padding?: number | Padding): void;
        addListener(eventName: string, handler: Function): MapsEventListener;
      }

      class LatLngBounds {
        constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
        extend(point: LatLng | LatLngLiteral): LatLngBounds;
      }

      // Modern Library Import
      function importLibrary(libraryName: string): Promise<any>;

      // Options
      interface MapOptions {
        center?: LatLngLiteral;
        zoom?: number;
        mapId?: string; // Required for AdvancedMarkerElement
        mapTypeId?: string;
        disableDefaultUI?: boolean;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        zoomControl?: boolean;
        fullscreenControl?: boolean;
        rotateControl?: boolean;
        scaleControl?: boolean;
        styles?: any[];
        gestureHandling?: string;
      }

      // Coordinates
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      interface LatLng {
        lat(): number;
        lng(): number;
      }
      interface LatLngBoundsLiteral {
          east: number;
          north: number;
          south: number;
          west: number;
      }
      interface Padding {
          bottom: number;
          left: number;
          right: number;
          top: number;
      }

      // Events
      interface MapsEventListener {
        remove(): void;
      }

      // Marker Library (AdvancedMarkerElement)
      namespace marker {
        class AdvancedMarkerElement {
          constructor(options: AdvancedMarkerElementOptions);
          map: google.maps.Map | null;
          position: LatLngLiteral | LatLng | null;
          content: Element | null;
          title: string;
          addListener(eventName: string, handler: Function): MapsEventListener;
        }
        
        class PinElement {
          constructor(options: PinElementOptions);
          element: Element;
        }

        interface AdvancedMarkerElementOptions {
          map?: google.maps.Map | null;
          position?: LatLngLiteral | LatLng | null;
          content?: Element | null;
          title?: string;
          gmpClickable?: boolean;
        }

        interface PinElementOptions {
          background?: string;
          borderColor?: string;
          glyph?: string | Element;
          scale?: number;
        }
      }

      // Legacy & Utilities
      namespace Animation {
        const DROP: any;
        const BOUNCE: any;
      }

      // Places Library
      namespace places {
        class PlacesService {
          constructor(attrContainer: any);
          nearbySearch(request: any, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void;
          getDetails(request: any, callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void): void;
        }
        class AutocompleteService {
          getPlacePredictions(request: any, callback: (predictions: any[] | null, status: PlacesServiceStatus) => void): void;
        }
        interface PlaceResult {
          place_id?: string;
          name?: string;
          vicinity?: string;
          geometry?: {
            location: LatLng;
          };
        }
        enum PlacesServiceStatus {
          OK = 'OK',
          ZERO_RESULTS = 'ZERO_RESULTS',
        }
      }
      
      // Interface for Library Returns (to handle casting)
      interface MapsLibrary {
        Map: typeof google.maps.Map;
        LatLngBounds: typeof google.maps.LatLngBounds;
      }
      interface MarkerLibrary {
        AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
        PinElement: typeof google.maps.marker.PinElement;
      }
      interface PlacesLibrary {
        PlacesService: typeof google.maps.places.PlacesService;
        AutocompleteService: typeof google.maps.places.AutocompleteService;
        PlacesServiceStatus: typeof google.maps.places.PlacesServiceStatus;
      }
    }
  }

  interface Window {
    google: typeof google;
  }
}

export type GoogleMap = google.maps.Map;
export type PlacesService = google.maps.places.PlacesService;
export type AutocompleteService = google.maps.places.AutocompleteService;
export type PlaceResult = google.maps.places.PlaceResult;



export interface MapMember {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  joinedAt?: string;
}

export interface UserMap {
  id: string;
  ownerUid: string;
  ownerDisplayName?: string;
  ownerEmail?: string; // Owner's email for fallback display
  ownerPhotoURL?: string | null; // Owner's profile picture URL
  name: string; // e.g. "Default Map"
  visibility: 'private' | 'public' | 'shared';
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
  shareCode?: string; // 4-digit unique code for shared maps
  members?: string[]; // Array of user UIDs who have access to this shared map
  memberInfo?: MapMember[]; // Detailed member information
}

// Notification system
export type NotificationType =
  | 'member_joined'      // Someone joined a shared map you're in
  | 'member_left'        // Someone left a shared map you're in
  | 'member_removed'     // You were removed from a shared map
  | 'join_approved'      // Your account was approved
  | 'post_added'         // Someone added a post to your shared map
  | 'post_deleted'       // Someone deleted a post from your shared map
  | 'map_invite'         // You were invited to a map (future feature)
  | 'welcome'            // Welcome notification when user first joins
  | 'system';            // System announcements

export interface AppNotification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  mapId?: string;
  mapName?: string;
  actorUid?: string;
  actorName?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export enum ViewState {
  LOGIN = 'LOGIN',
  PENDING = 'PENDING',
  MAP = 'MAP',
  ADD_ENTRY = 'ADD_ENTRY',
  RESTAURANT_DETAIL = 'RESTAURANT_DETAIL',
  INFO = 'INFO',
  USER_HISTORY = 'USER_HISTORY',
  EDIT_ENTRY = 'EDIT_ENTRY',
  STATS = 'STATS',
  MAP_MANAGEMENT = 'MAP_MANAGEMENT',
  SITE_MANAGEMENT = 'SITE_MANAGEMENT',
}
