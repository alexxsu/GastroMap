import React, { useEffect, useRef, useState } from 'react';
import { Restaurant } from '../types';

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
  // Use a Map to track markers by Restaurant ID for diffing
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

  // 1. Robust Google Maps Loading using the Official Inline Loader
  useEffect(() => {
    if (!apiKey) return;

    const loadMaps = async () => {
      // Define the bootstrap loader strictly as per Google documentation
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
        loading: "async" // Explicitly requested
      });

      // Initialize Map
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
        mapId: "DEMO_MAP_ID",
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
        // 'greedy' allows 1-finger panning on mobile and scroll-to-zoom on desktop
        // without the "Use two fingers to move the map" overlay.
        gestureHandling: 'greedy', 
      });

      setMapInstance(map);
      onMapLoad(map);
    } catch (error) {
      console.error("Failed to initialize Google Map:", error);
    }
  };

  // 2. Handle Advanced Markers with Diffing logic to prevent flashing
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstance) return;

      try {
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        const currentIds = new Set(restaurants.map(r => r.id));

        // A. Add or Update Markers
        restaurants.forEach(restaurant => {
          if (markersRef.current.has(restaurant.id)) {
            // Marker exists. We do NOT recreate it to avoid flashing.
            // If we needed to update position dynamically, we could do:
            // markersRef.current.get(restaurant.id)!.position = restaurant.location;
          } else {
            // Create New Marker
            const pinView = document.createElement("div");
            pinView.className = "marker-pin group relative flex items-center justify-center cursor-pointer";
            pinView.innerHTML = `
              <div class="w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-lg transform transition-transform duration-200 group-hover:scale-125"></div>
              <div class="absolute -bottom-1 w-2 h-2 bg-black/20 rounded-full blur-[2px]"></div>
            `;

            const marker = new AdvancedMarkerElement({
              map: mapInstance,
              position: restaurant.location,
              title: restaurant.name,
              content: pinView,
              gmpClickable: true,
            });

            // Note: We need to be careful with closures here. 
            // If onMarkerClick changes, the listener invokes the old one.
            // However, since onMarkerClick is stable via useCallback in parent, this is fine.
            marker.addListener('click', () => {
              onMarkerClick(restaurant);
            });

            markersRef.current.set(restaurant.id, marker);
          }
        });

        // B. Remove Markers that are no longer in the list
        for (const [id, marker] of markersRef.current) {
          if (!currentIds.has(id)) {
            marker.map = null; // Remove from map
            markersRef.current.delete(id);
          }
        }

      } catch (e) {
        console.error("Error updating markers", e);
      }
    };

    updateMarkers();
  }, [mapInstance, restaurants, onMarkerClick]);

  return (
    <div ref={mapRef} className="w-full h-full bg-gray-900" />
  );
};

export default MapContainer;