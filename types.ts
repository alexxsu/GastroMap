
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Visit {
  id: string;
  date: string;
  photoDataUrl: string; // Firebase Storage URL
  rating: string; // Grade: S, A, B, C, D, E
  comment: string;
  aiDescription?: string;
  createdBy?: string; // User UID
  creatorName?: string; // User Display Name
}

export interface Restaurant {
  id: string; // Google Place ID or internal ID
  name: string;
  address: string;
  location: Coordinates;
  visits: Visit[];
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
        addListener(eventName: string, handler: Function): MapsEventListener;
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
        styles?: any[];
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

export enum ViewState {
  LOGIN = 'LOGIN',
  MAP = 'MAP',
  ADD_ENTRY = 'ADD_ENTRY',
  RESTAURANT_DETAIL = 'RESTAURANT_DETAIL',
  INFO = 'INFO',
  USER_HISTORY = 'USER_HISTORY',
}
