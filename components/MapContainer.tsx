
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

const MapContainer: React.FC<MapContainerProps> = ({ apiKey, restaurants, onMarkerClick, onMapLoad }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Store clusterer instance
  const clustererRef = useRef<MarkerClusterer | null>(null);
  // Store marker instances to manage updates
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

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
      await google.maps.importLibrary("marker"); // Ensure Marker is loaded for Clusterer if needed

      const map = new Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 13,
        mapTypeId: 'satellite',
        mapId: "DEMO_MAP_ID",
        disableDefaultUI: true, // Explicitly disable all default controls
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        rotateControl: false,
        scaleControl: false,
        gestureHandling: 'greedy', 
      });

      // Custom cluster renderer with blue gradient
      const renderer = {
        render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
          // Logical color gradient: cyan → blue → dark blue → navy (cool gradient)
          let backgroundColor: string;
          let textColor = 'white';

          if (count < 10) {
            // Small clusters: Cyan
            backgroundColor = '#06B6D4'; // cyan-500
          } else if (count < 30) {
            // Medium clusters: Sky blue
            backgroundColor = '#0EA5E9'; // sky-500
          } else if (count < 100) {
            // Large clusters: Blue
            backgroundColor = '#2563EB'; // blue-600
          } else {
            // Very large clusters: Dark blue
            backgroundColor = '#1E40AF'; // blue-700
          }

          // Create cluster marker element
          const svg = `
            <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="22" fill="${backgroundColor}" stroke="white" stroke-width="3" opacity="0.9"/>
              <text x="25" y="25" font-size="14" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${count}</text>
            </svg>
          `;

          const icon = document.createElement('div');
          icon.innerHTML = svg;
          icon.style.width = '50px';
          icon.style.height = '50px';

          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: icon,
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          });
        }
      };

      // Initialize MarkerClusterer with custom renderer and click handler
      clustererRef.current = new MarkerClusterer({
        map,
        renderer,
        onClusterClick: (event, cluster, map) => {
          // Explicit fitBounds ensures consistent zoom animation
          const bounds = new google.maps.LatLngBounds();
          if (cluster.markers) {
            cluster.markers.forEach(m => {
              if (m.position) {
                bounds.extend(m.position);
              }
            });
            // Padding ensures markers aren't right on the edge
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
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        const currentIds = new Set(restaurants.map(r => r.id));
        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

        // A. Add New Markers
        restaurants.forEach(restaurant => {
          if (!markersRef.current.has(restaurant.id)) {
            // Create View
            const pinView = document.createElement("div");
            pinView.className = "marker-pin group relative flex items-center justify-center cursor-pointer";
            pinView.innerHTML = `
              <div class="w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-lg transform transition-transform duration-200 group-hover:scale-125"></div>
              <div class="absolute -bottom-1 w-2 h-2 bg-black/20 rounded-full blur-[2px]"></div>
            `;

            const marker = new AdvancedMarkerElement({
              position: restaurant.location,
              title: restaurant.name,
              content: pinView,
              gmpClickable: true,
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
        const markersToRemove: google.maps.marker.AdvancedMarkerElement[] = [];
        for (const [id, marker] of markersRef.current) {
          if (!currentIds.has(id)) {
            markersToRemove.push(marker);
            marker.map = null; // Detach from map just in case
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
