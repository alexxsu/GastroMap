import { useState, useCallback } from 'react';
import { Coordinates } from '../types';

type MapType = 'satellite' | 'roadmap' | 'dark';

// Dark mode map styles - moved outside component to avoid recreating
const DARK_MODE_STYLES: google.maps.MapTypeStyle[] = [
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

// Default bounds for Toronto area
const DEFAULT_BOUNDS = {
  sw: { lat: 43.48, lng: -79.80 },
  ne: { lat: 43.90, lng: -79.00 }
};

interface UseMapControlsReturn {
  mapInstance: google.maps.Map | null;
  currentMapCenter: Coordinates;
  mapType: MapType;
  handleMapLoad: (map: google.maps.Map) => void;
  handleToggleMapType: () => void;
  handleLocateMe: () => void;
  handleResetView: () => void;
  handleZoomToMunicipality: () => void;
}

export function useMapControls(): UseMapControlsReturn {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<Coordinates>({ lat: 43.6532, lng: -79.3832 });
  const [mapType, setMapType] = useState<MapType>('satellite');

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    map.addListener('center_changed', () => {
      const center = map.getCenter();
      if (center) {
        setCurrentMapCenter({ lat: center.lat(), lng: center.lng() });
      }
    });
  }, []);

  const handleToggleMapType = useCallback(() => {
    if (!mapInstance) return;

    if (mapType === 'satellite') {
      mapInstance.setMapTypeId('roadmap');
      mapInstance.setOptions({ styles: [] });
      setMapType('roadmap');
    } else if (mapType === 'roadmap') {
      mapInstance.setMapTypeId('roadmap');
      mapInstance.setOptions({ styles: DARK_MODE_STYLES });
      setMapType('dark');
    } else {
      mapInstance.setMapTypeId('satellite');
      mapInstance.setOptions({ styles: [] });
      setMapType('satellite');
    }
  }, [mapInstance, mapType]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation || !mapInstance) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

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
  }, [mapInstance]);

  const handleResetView = useCallback(() => {
    if (!mapInstance) return;

    const bounds = new google.maps.LatLngBounds(DEFAULT_BOUNDS.sw, DEFAULT_BOUNDS.ne);
    mapInstance.fitBounds(bounds);
  }, [mapInstance]);

  const handleZoomToMunicipality = useCallback(() => {
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

        // Try geocoding, but fallback to simple zoom if it fails
        try {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: userPos }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              let municipalityResult = results.find(r =>
                r.types.includes('locality') || r.types.includes('sublocality')
              );

              if (!municipalityResult) {
                municipalityResult = results.find(r =>
                  r.types.includes('administrative_area_level_3') ||
                  r.types.includes('administrative_area_level_2')
                );
              }

              if (municipalityResult && municipalityResult.geometry.bounds) {
                const center = municipalityResult.geometry.location;
                mapInstance.panTo(center);
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
                // Fallback: just pan to user location with city-level zoom
                mapInstance.panTo(userPos);
                setTimeout(() => {
                  mapInstance.setZoom(13);
                }, 300);
              }
            } else {
              // Geocoding failed, fallback to simple zoom
              console.warn('Geocoding failed, using fallback zoom. Status:', status);
              mapInstance.panTo(userPos);
              setTimeout(() => {
                mapInstance.setZoom(13);
              }, 300);
            }
          });
        } catch (error) {
          // Geocoder not available (API not enabled), fallback to simple zoom
          console.warn('Geocoding API not available, using fallback zoom:', error);
          mapInstance.panTo(userPos);
          setTimeout(() => {
            mapInstance.setZoom(13);
          }, 300);
        }
      },
      () => {
        alert("Could not access your location. Please check browser permissions.");
      }
    );
  }, [mapInstance]);

  return {
    mapInstance,
    currentMapCenter,
    mapType,
    handleMapLoad,
    handleToggleMapType,
    handleLocateMe,
    handleResetView,
    handleZoomToMunicipality
  };
}
