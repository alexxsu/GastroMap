
import React, { useEffect, useRef, useState } from 'react';
import { Restaurant } from '../types';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

interface MapContainerProps {
  apiKey: string;
  restaurants: Restaurant[];
  onMarkerClick: (restaurant: Restaurant) => void;
  onMapLoad: (map: google.maps.Map) => void;
}

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 };

// SVG icon for pins - matches UI button style (gray-800 with gray-700 border)
const createPinSvg = () => {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 0C9.72 0 3 6.72 3 15c0 10.5 15 33 15 33s15-22.5 15-33c0-8.28-6.72-15-15-15z"
            fill="rgba(31, 41, 55, 0.95)"/>
      <path d="M18 1.5C10.56 1.5 4.5 7.56 4.5 15c0 9.5 13.5 30 13.5 30s13.5-20.5 13.5-30c0-7.44-6.06-13.5-13.5-13.5z"
            fill="none" stroke="rgba(75, 85, 99, 1)" stroke-width="1.5"/>
      <circle cx="18" cy="15" r="5" fill="rgba(255, 255, 255, 0.95)"/>
    </svg>
  `)}`;
};

// SVG icon for clusters
const createClusterSvg = (count: number) => {
  let size = 48;
  let fontSize = 16;

  if (count < 10) {
    size = 44;
    fontSize = 15;
  } else if (count < 30) {
    size = 50;
    fontSize = 17;
  } else if (count < 100) {
    size = 56;
    fontSize = 18;
  } else {
    size = 62;
    fontSize = 20;
  }

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="rgba(31, 41, 55, 0.95)"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="none" stroke="rgba(75, 85, 99, 1)" stroke-width="1.5"/>
      <text x="${size/2}" y="${size/2}" font-size="${fontSize}" font-weight="600" fill="rgba(255, 255, 255, 0.95)" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, sans-serif">${count}</text>
    </svg>
  `;

  return { svg, size };
};

const MapContainer: React.FC<MapContainerProps> = ({ apiKey, restaurants, onMarkerClick, onMapLoad }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Store clusterer instance
  const clustererRef = useRef<MarkerClusterer | null>(null);
  // Store marker instances to manage updates (using regular Marker)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // 1. Load Map
  useEffect(() => {
    if (!apiKey) return;

    // Define global error handler for Google Maps Auth Failures
    (window as any).gm_authFailure = () => {
      const message = "Google Maps API Blocked. Please check your API Key Restrictions in Google Cloud Console. You may need to add this preview domain to the allowed list.";
      setAuthError(message);
      console.error(message);
    };

    const loadMaps = async () => {
      // Check if script already exists
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
         initMap();
         return;
      }

      (function(g: any){
        var h: any, a: any, k: any, p: string = "The Google Maps JavaScript API", c: string = "google", l: string = "importLibrary", q: string = "__ib__", m: Document = document, b: any = window;
        b = b[c] || (b[c] = {});
        var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(), u = () => h || (h = new Promise(async (f, n) => {
            await (a = m.createElement("script"));
            e.set("libraries", [...r] + "");
            for (k in g) e.set(k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()), g[k]);
            e.set("callback", c + ".maps." + q);
            a.src = `https://maps.googleapis.com/maps/api/js?` + e;
            d[q] = f;
            a.onerror = () => h = n(Error(p + " could not load."));
            a.nonce = (m.querySelector("script[nonce]") as any)?.nonce || "";
            m.head.append(a);
        }));
        d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f: any, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n));
      })({
        key: apiKey,
        v: "weekly",
        loading: "async"
      });

      initMap();
    };

    loadMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const initMap = async () => {
    if (!mapRef.current) return;

    try {
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

      const map = new Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 13,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        rotateControl: false,
        scaleControl: false,
        gestureHandling: 'greedy',
      });

      // Custom cluster renderer using regular Marker
      const renderer = {
        render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
          const { svg, size } = createClusterSvg(count);

          return new google.maps.Marker({
            position,
            icon: {
              url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
              scaledSize: new google.maps.Size(size, size),
              anchor: new google.maps.Point(size / 2, size / 2),
            },
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          });
        }
      };

      // Initialize MarkerClusterer with custom renderer and click handler
      clustererRef.current = new MarkerClusterer({
        map,
        renderer,
        onClusterClick: (event, cluster, map) => {
          const bounds = new google.maps.LatLngBounds();
          if (cluster.markers) {
            cluster.markers.forEach(m => {
              if (m.position) {
                bounds.extend(m.position);
              }
            });
            map.fitBounds(bounds, 50);
          }
        }
      });

      setMapInstance(map);
      onMapLoad(map);
    } catch (error) {
      console.error("Failed to initialize Google Map:", error);
    }
  };

  // 2. Handle Markers & Clustering
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstance || !clustererRef.current) return;

      try {
        const currentIds = new Set(restaurants.map(r => r.id));
        const newMarkers: google.maps.Marker[] = [];

        // A. Add New Markers
        restaurants.forEach(restaurant => {
          if (!markersRef.current.has(restaurant.id)) {
            const marker = new google.maps.Marker({
              position: restaurant.location,
              title: restaurant.name,
              icon: {
                url: createPinSvg(),
                scaledSize: new google.maps.Size(36, 48),
                anchor: new google.maps.Point(18, 48),
              },
            });

            marker.addListener('click', () => {
              onMarkerClick(restaurant);
            });

            markersRef.current.set(restaurant.id, marker);
            newMarkers.push(marker);
          }
        });

        // Add new markers to clusterer
        if (newMarkers.length > 0) {
          clustererRef.current.addMarkers(newMarkers);
        }

        // B. Remove Deleted Markers
        const markersToRemove: google.maps.Marker[] = [];
        for (const [id, marker] of markersRef.current) {
          if (!currentIds.has(id)) {
            markersToRemove.push(marker);
            marker.setMap(null);
            markersRef.current.delete(id);
          }
        }

        if (markersToRemove.length > 0) {
          clustererRef.current.removeMarkers(markersToRemove);
        }

      } catch (e) {
        console.error("Error updating markers", e);
      }
    };

    updateMarkers();
  }, [mapInstance, restaurants, onMarkerClick]);

  if (authError) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl max-w-md text-center">
          <h3 className="text-red-400 font-bold text-lg mb-2">Map Loading Failed</h3>
          <p className="text-gray-300 mb-4">{authError}</p>
          <p className="text-xs text-gray-500">
             If you are in preview mode, go to Google Cloud Console and set restrictions to "None" temporarily.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full h-full bg-gray-900" />
  );
};

export default MapContainer;
