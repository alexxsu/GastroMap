import React, { useEffect, useRef, useState } from 'react';
import { Restaurant } from '../types';

interface MapContainerProps {
  apiKey: string;
  restaurants: Restaurant[];
  onMarkerClick: (restaurant: Restaurant) => void;
  onMapLoad: (map: google.maps.Map) => void;
  onMapClick?: () => void;
  mapType?: 'satellite' | 'roadmap' | 'dark';
}

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 };

// Dark mode styles
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

const EXPLORED_RADIUS = 300;

const getCircleStyle = (isDarkMode: boolean, isSatellite: boolean) => {
  if (isDarkMode) {
    return {
      fillColor: '#6366f1',
      fillOpacity: 0.08,
      strokeColor: '#818cf8',
      strokeOpacity: 0.15,
      strokeWeight: 1,
    };
  } else if (isSatellite) {
    return {
      fillColor: '#fbbf24',
      fillOpacity: 0.1,
      strokeColor: '#f59e0b',
      strokeOpacity: 0.2,
      strokeWeight: 1,
    };
  } else {
    return {
      fillColor: '#3b82f6',
      fillOpacity: 0.06,
      strokeColor: '#60a5fa',
      strokeOpacity: 0.15,
      strokeWeight: 1,
    };
  }
};

// Zoom-based scaling configuration
// Inverted: markers get BIGGER when zoomed out to compensate visual shrinking
const ZOOM_SCALE_CONFIG = {
  maxZoom: 18,      // At this zoom (close), markers are at base size
  minZoom: 10,      // At this zoom (far), markers are at maximum size
  zoomedInScale: 1.2,   // Larger base size when zoomed in close
  zoomedOutScale: 2.4,  // Cap at 200% of base size (1.2 * 2 = 2.4)
};

// Clustering configuration
const CLUSTER_CONFIG = {
  gridSize: 90,          // Pixel grid size for clustering
  minZoomForClustering: 15, // Start clustering below this zoom
  maxPhotosInCluster: 4, // Max photos to show in cluster stack
};

const getScaleForZoom = (zoom: number): number => {
  const { maxZoom, minZoom, zoomedInScale, zoomedOutScale } = ZOOM_SCALE_CONFIG;
  // Inverted: bigger when zoomed out, smaller when zoomed in
  if (zoom >= maxZoom) return zoomedInScale;
  if (zoom <= minZoom) return zoomedOutScale;
  // Interpolate: as zoom decreases, scale increases
  const ratio = (maxZoom - zoom) / (maxZoom - minZoom);
  return zoomedInScale + ratio * (zoomedOutScale - zoomedInScale);
};

// Create cluster element with stacked photos
const createClusterElement = (
  restaurants: Restaurant[],
  onClick: () => void,
  scale: number = 1
): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    transform: translate(-50%, -100%) scale(${scale});
    transform-origin: bottom center;
    cursor: pointer;
    z-index: 10;
    transition: transform 0.15s ease-out, z-index 0s;
  `;
  container.dataset.baseScale = String(scale);

  // Collect photos from all restaurants
  const photos: string[] = [];
  for (const restaurant of restaurants) {
    const visits = restaurant.visits || [];
    for (const visit of visits) {
      const photoUrl = visit.photoDataUrl || visit.photos?.[0];
      if (photoUrl && photos.length < CLUSTER_CONFIG.maxPhotosInCluster) {
        photos.push(photoUrl);
      }
    }
    if (photos.length >= CLUSTER_CONFIG.maxPhotosInCluster) break;
  }

  const count = restaurants.length;

  // Create stacked photos cluster - much more prominent
  container.innerHTML = `
    <div style="
      position: relative;
      width: 95px;
      height: 115px;
      filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
    ">
      <!-- Stacked cards effect - back cards -->
      ${photos.length >= 3 ? `
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) rotate(15deg);
          width: 62px;
          height: 62px;
          background: #fffef8;
          border: 3px solid #d4c5a9;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${photos[2] ? `<img src="${photos[2]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';" />` : ''}
        </div>
      ` : ''}

      ${photos.length >= 2 ? `
        <div style="
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%) rotate(-8deg);
          width: 62px;
          height: 62px;
          background: #fffef8;
          border: 3px solid #d4c5a9;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${photos[1] ? `<img src="${photos[1]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';" />` : ''}
        </div>
      ` : ''}

      <!-- Front card -->
      <div style="
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%) rotate(2deg);
        width: 68px;
        height: 68px;
        background: #fffef8;
        border: 3px solid #d4c5a9;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      ">
        ${photos[0] ? `
          <img src="${photos[0]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div style="display:none;width:100%;height:100%;background:#f3f4f6;align-items:center;justify-content:center;font-size:26px;position:absolute;top:0;left:0;">🍽️</div>
        ` : `
          <div style="width:100%;height:100%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:26px;">🍽️</div>
        `}
      </div>

      <!-- Count badge - more prominent -->
      <div style="
        position: absolute;
        top: -2px;
        right: 0px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        font-size: 14px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 12px;
        border: 3px solid #fffef8;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        z-index: 5;
        min-width: 24px;
        text-align: center;
      ">${count}</div>

      <!-- Pointer/tail -->
      <div style="
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
      ">
        <div style="
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-top: 14px solid #d4c5a9;
        "></div>
        <div style="
          width: 0;
          height: 0;
          border-left: 9px solid transparent;
          border-right: 9px solid transparent;
          border-top: 11px solid #fffef8;
          margin-top: -14px;
          margin-left: 3px;
        "></div>
      </div>
    </div>
  `;

  // Hover effect
  container.addEventListener('mouseenter', () => {
    const baseScale = parseFloat(container.dataset.baseScale || '1');
    container.style.transform = `translate(-50%, -100%) scale(${baseScale * 1.1})`;
    container.style.zIndex = '1000';
  });
  container.addEventListener('mouseleave', () => {
    const baseScale = parseFloat(container.dataset.baseScale || '1');
    container.style.transform = `translate(-50%, -100%) scale(${baseScale})`;
    container.style.zIndex = '10';
  });

  container.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });

  return container;
};

// Create HTML element for custom pin
const createPinElement = (restaurant: Restaurant, onClick: () => void, scale: number = 1): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    transform: translate(-50%, -100%) scale(${scale});
    transform-origin: bottom center;
    cursor: pointer;
    z-index: 1;
    transition: transform 0.15s ease-out, z-index 0s;
  `;
  container.dataset.baseScale = String(scale);

  // Get data from restaurant
  const visits = restaurant.visits || [];
  const hasMultiplePosts = visits.length >= 2;

  // Get photos from visits
  const firstVisit = visits[0];
  const secondVisit = visits[1];
  const photoUrl1 = firstVisit?.photoDataUrl || firstVisit?.photos?.[0] || '';
  const photoUrl2 = secondVisit?.photoDataUrl || secondVisit?.photos?.[0] || '';
  
  if (hasMultiplePosts) {
    // Stacked cards design for 2+ posts
    container.innerHTML = `
      <div style="
        position: relative;
        width: 60px;
        height: 72px;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ">
        <!-- Back card (rotated) -->
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) rotate(8deg);
          width: 48px;
          height: 48px;
          background: #fffef8;
          border: 2px solid #d4c5a9;
          border-radius: 6px;
          overflow: hidden;
        ">
          ${photoUrl2 ? `
            <img src="${photoUrl2}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            " onerror="this.style.display='none';" />
          ` : `
            <div style="
              width: 100%;
              height: 100%;
              background: #f3f4f6;
            "></div>
          `}
        </div>
        
        <!-- Front card -->
        <div style="
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%) rotate(-3deg);
          width: 48px;
          height: 48px;
          background: #fffef8;
          border: 2px solid #d4c5a9;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          ${photoUrl1 ? `
            <img src="${photoUrl1}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            " onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div style="
              display: none;
              width: 100%;
              height: 100%;
              background: #f3f4f6;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              position: absolute;
              top: 0;
              left: 0;
            ">🍽️</div>
          ` : `
            <div style="
              width: 100%;
              height: 100%;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
            ">🍽️</div>
          `}
        </div>
        
        <!-- Pointer/tail -->
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        ">
          <div style="
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 10px solid #d4c5a9;
          "></div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid #fffef8;
            margin-top: -10px;
            margin-left: 2px;
          "></div>
        </div>
      </div>
    `;
  } else {
    // Single card design for 1 post
    container.innerHTML = `
      <div style="
        position: relative;
        width: 52px;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ">
        <!-- Main card -->
        <div style="
          width: 52px;
          height: 52px;
          background: #fffef8;
          border: 2px solid #d4c5a9;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        ">
          <!-- Photo -->
          ${photoUrl1 ? `
            <img src="${photoUrl1}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            " onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div style="
              display: none;
              width: 100%;
              height: 100%;
              background: #f3f4f6;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              position: absolute;
              top: 0;
              left: 0;
            ">🍽️</div>
          ` : `
            <div style="
              width: 100%;
              height: 100%;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
            ">🍽️</div>
          `}
        </div>
        
        <!-- Pointer/tail -->
        <div style="
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 10px solid #d4c5a9;
          margin: -1px auto 0;
        "></div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #fffef8;
          margin: -11px auto 0;
        "></div>
      </div>
    `;
  }
  
  // Hover effect - use base scale
  container.addEventListener('mouseenter', () => {
    const baseScale = parseFloat(container.dataset.baseScale || '1');
    container.style.transform = `translate(-50%, -100%) scale(${baseScale * 1.15})`;
    container.style.zIndex = '1000';
  });
  container.addEventListener('mouseleave', () => {
    const baseScale = parseFloat(container.dataset.baseScale || '1');
    container.style.transform = `translate(-50%, -100%) scale(${baseScale})`;
    container.style.zIndex = '1';
  });
  
  container.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  
  return container;
};

// Custom Overlay class factory - must be called after Google Maps is loaded
let CustomMarkerOverlayClass: any = null;
let ClusterOverlayClass: any = null;

// Cluster overlay factory
const getClusterOverlayClass = () => {
  if (ClusterOverlayClass) return ClusterOverlayClass;

  ClusterOverlayClass = class extends google.maps.OverlayView {
    private position: google.maps.LatLng;
    private container: HTMLDivElement;
    private restaurants: Restaurant[];
    private onClick: () => void;
    private currentScale: number;

    constructor(position: google.maps.LatLng, restaurants: Restaurant[], onClick: () => void, scale: number = 1) {
      super();
      this.position = position;
      this.restaurants = restaurants;
      this.onClick = onClick;
      this.currentScale = scale;
      this.container = createClusterElement(restaurants, onClick, scale);
    }

    onAdd() {
      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(this.container);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection) return;

      const point = projection.fromLatLngToDivPixel(this.position);
      if (point) {
        this.container.style.left = point.x + 'px';
        this.container.style.top = point.y + 'px';
      }
    }

    onRemove() {
      if (this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
    }

    getPosition() {
      return this.position;
    }

    updateScale(scale: number) {
      this.currentScale = scale;
      this.container.dataset.baseScale = String(scale);
      this.container.style.transform = `translate(-50%, -100%) scale(${scale})`;
    }

    getRestaurants() {
      return this.restaurants;
    }
  };

  return ClusterOverlayClass;
};

const getCustomMarkerOverlayClass = () => {
  if (CustomMarkerOverlayClass) return CustomMarkerOverlayClass;

  CustomMarkerOverlayClass = class extends google.maps.OverlayView {
    private position: google.maps.LatLng;
    private container: HTMLDivElement;
    private restaurant: Restaurant;
    private onClick: () => void;
    private currentScale: number;

    constructor(position: google.maps.LatLng, restaurant: Restaurant, onClick: () => void, scale: number = 1) {
      super();
      this.position = position;
      this.restaurant = restaurant;
      this.onClick = onClick;
      this.currentScale = scale;
      this.container = createPinElement(restaurant, onClick, scale);
    }

    onAdd() {
      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(this.container);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection) return;

      const point = projection.fromLatLngToDivPixel(this.position);
      if (point) {
        this.container.style.left = point.x + 'px';
        this.container.style.top = point.y + 'px';
      }
    }

    onRemove() {
      if (this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
    }

    getPosition() {
      return this.position;
    }

    getContainer() {
      return this.container;
    }

    updateContent(restaurant: Restaurant) {
      this.restaurant = restaurant;
      const newContainer = createPinElement(restaurant, this.onClick, this.currentScale);
      this.container.innerHTML = newContainer.innerHTML;
    }

    updateScale(scale: number) {
      this.currentScale = scale;
      this.container.dataset.baseScale = String(scale);
      this.container.style.transform = `translate(-50%, -100%) scale(${scale})`;
    }

    getRestaurant() {
      return this.restaurant;
    }
  };

  return CustomMarkerOverlayClass;
};

const MapContainer: React.FC<MapContainerProps> = ({ 
  apiKey, 
  restaurants, 
  onMarkerClick, 
  onMapLoad, 
  onMapClick, 
  mapType = 'satellite' 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const overlaysRef = useRef<Map<string, any>>(new Map());
  const circlesRef = useRef<Map<string, google.maps.Circle>>(new Map());
  const clustersRef = useRef<any[]>([]);
  const hiddenOverlaysRef = useRef<Set<string>>(new Set());
  const currentMapTypeRef = useRef<string>(mapType);
  const onMapClickRef = useRef(onMapClick);
  const restaurantsMapRef = useRef<Map<string, Restaurant>>(new Map());
  const zoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const currentScaleRef = useRef<number>(1);

  // Clustering helper function
  const computeClusters = (
    map: google.maps.Map,
    restaurants: Restaurant[],
    zoom: number
  ): { clusters: Restaurant[][]; singles: Restaurant[] } => {
    if (zoom >= CLUSTER_CONFIG.minZoomForClustering) {
      return { clusters: [], singles: restaurants };
    }

    const projection = map.getProjection();
    if (!projection) return { clusters: [], singles: restaurants };

    // Convert to pixel coordinates
    const points: { restaurant: Restaurant; pixel: google.maps.Point }[] = [];
    for (const r of restaurants) {
      if (r.location) {
        const latLng = new google.maps.LatLng(r.location.lat, r.location.lng);
        const worldPoint = projection.fromLatLngToPoint(latLng);
        if (worldPoint) {
          const scale = Math.pow(2, zoom);
          points.push({
            restaurant: r,
            pixel: new google.maps.Point(worldPoint.x * scale, worldPoint.y * scale)
          });
        }
      }
    }

    // Grid-based clustering
    const gridSize = CLUSTER_CONFIG.gridSize;
    const grid: Map<string, Restaurant[]> = new Map();

    for (const point of points) {
      const cellX = Math.floor(point.pixel.x / gridSize);
      const cellY = Math.floor(point.pixel.y / gridSize);
      const key = `${cellX},${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(point.restaurant);
    }

    const clusters: Restaurant[][] = [];
    const singles: Restaurant[] = [];

    for (const [, group] of grid) {
      if (group.length >= 2) {
        clusters.push(group);
      } else {
        singles.push(...group);
      }
    }

    return { clusters, singles };
  };

  // Update clusters and marker visibility
  const updateClustering = (map: google.maps.Map, scale: number) => {
    const zoom = map.getZoom() || 13;
    const restaurants = Array.from(restaurantsMapRef.current.values());
    const { clusters, singles } = computeClusters(map, restaurants, zoom);

    // Clear old clusters
    for (const cluster of clustersRef.current) {
      cluster.setMap(null);
    }
    clustersRef.current = [];

    // Track which restaurants are in clusters
    const clusteredIds = new Set<string>();
    for (const cluster of clusters) {
      for (const r of cluster) {
        clusteredIds.add(r.id);
      }
    }

    // Hide/show individual overlays
    for (const [id, overlay] of overlaysRef.current) {
      const container = overlay.getContainer();
      if (clusteredIds.has(id)) {
        container.style.display = 'none';
        hiddenOverlaysRef.current.add(id);
      } else {
        container.style.display = '';
        hiddenOverlaysRef.current.delete(id);
      }
    }

    // Create cluster overlays
    const ClusterClass = getClusterOverlayClass();
    for (const cluster of clusters) {
      // Calculate center of cluster
      let sumLat = 0, sumLng = 0;
      for (const r of cluster) {
        sumLat += r.location.lat;
        sumLng += r.location.lng;
      }
      const centerLat = sumLat / cluster.length;
      const centerLng = sumLng / cluster.length;

      const clusterOverlay = new ClusterClass(
        new google.maps.LatLng(centerLat, centerLng),
        cluster,
        () => {
          // Zoom in to cluster on click
          const bounds = new google.maps.LatLngBounds();
          for (const r of cluster) {
            bounds.extend(new google.maps.LatLng(r.location.lat, r.location.lng));
          }
          map.fitBounds(bounds, 60);
        },
        scale
      );
      clusterOverlay.setMap(map);
      clustersRef.current.push(clusterOverlay);
    }
  };

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Load Google Maps API
  useEffect(() => {
    if (!apiKey) return;

    (window as any).gm_authFailure = () => {
      const message = "Google Maps API Blocked. Please check your API Key Restrictions.";
      setAuthError(message);
      console.error(message);
    };

    const loadMaps = async () => {
      if ((window as any).google?.maps?.Map) {
        initMap();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkGoogle = setInterval(() => {
          if ((window as any).google?.maps?.Map) {
            clearInterval(checkGoogle);
            initMap();
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      
      (window as any).initGoogleMap = () => {
        initMap();
      };
      
      document.head.appendChild(script);
    };

    loadMaps();
  }, [apiKey]);

  const initMap = async () => {
    if (!mapRef.current) return;
    if (!(window as any).google?.maps) {
      console.error('Google Maps not loaded');
      return;
    }

    try {
      const map = new google.maps.Map(mapRef.current, {
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

      map.addListener('click', () => {
        if (onMapClickRef.current) {
          onMapClickRef.current();
        }
      });

      // Zoom listener for marker scaling and clustering
      zoomListenerRef.current = map.addListener('zoom_changed', () => {
        const zoom = map.getZoom() || 13;
        const newScale = getScaleForZoom(zoom);
        currentScaleRef.current = newScale;

        // Update all overlay scales
        for (const [, overlay] of overlaysRef.current) {
          overlay.updateScale(newScale);
        }

        // Update cluster scales
        for (const cluster of clustersRef.current) {
          cluster.updateScale(newScale);
        }

        // Update clustering
        updateClustering(map, newScale);
      });

      // Set initial scale
      currentScaleRef.current = getScaleForZoom(13);

      setMapInstance(map);
      setIsMapReady(true);
      onMapLoad(map);

      console.log('Map initialized successfully');
    } catch (e) {
      console.error("Map initialization error:", e);
    }
  };

  // Update markers when restaurants change
  useEffect(() => {
    if (!mapInstance || !isMapReady) {
      return;
    }

    const isDarkMode = mapType === 'dark';
    const isSatellite = mapType === 'satellite';
    const circleStyle = getCircleStyle(isDarkMode, isSatellite);

    // Filter restaurants with valid coordinates
    const validRestaurants = restaurants.filter(r => 
      r.location && 
      typeof r.location.lat === 'number' && 
      typeof r.location.lng === 'number'
    );

    console.log(`Processing ${validRestaurants.length} valid restaurants out of ${restaurants.length}`);

    const currentIds = new Set(validRestaurants.map(r => r.id));

    restaurantsMapRef.current.clear();
    validRestaurants.forEach(r => restaurantsMapRef.current.set(r.id, r));

    // Remove old overlays not in current set
    for (const [id, overlay] of overlaysRef.current) {
      if (!currentIds.has(id)) {
        overlay.setMap(null);
        overlaysRef.current.delete(id);

        const circle = circlesRef.current.get(id);
        if (circle) {
          circle.setMap(null);
          circlesRef.current.delete(id);
        }
      }
    }

    // Get current zoom scale
    const currentZoom = mapInstance.getZoom() || 13;
    const scale = getScaleForZoom(currentZoom);
    currentScaleRef.current = scale;

    // Add or update overlays
    for (const restaurant of validRestaurants) {
      if (!overlaysRef.current.has(restaurant.id)) {
        const position = new google.maps.LatLng(restaurant.location.lat, restaurant.location.lng);

        const OverlayClass = getCustomMarkerOverlayClass();
        const overlay = new OverlayClass(
          position,
          restaurant,
          () => onMarkerClick(restaurant),
          scale
        );
        overlay.setMap(mapInstance);
        overlaysRef.current.set(restaurant.id, overlay);

        // Create exploration circle
        const circle = new google.maps.Circle({
          strokeColor: circleStyle.strokeColor,
          strokeOpacity: circleStyle.strokeOpacity,
          strokeWeight: circleStyle.strokeWeight,
          fillColor: circleStyle.fillColor,
          fillOpacity: circleStyle.fillOpacity,
          map: mapInstance,
          center: { lat: restaurant.location.lat, lng: restaurant.location.lng },
          radius: EXPLORED_RADIUS,
          clickable: false,
        });

        circlesRef.current.set(restaurant.id, circle);
      } else {
        // Update existing overlay content
        const overlay = overlaysRef.current.get(restaurant.id)!;
        overlay.updateContent(restaurant);
      }
    }

    console.log(`Active overlays: ${overlaysRef.current.size}`);

    // Update clustering after markers are created
    updateClustering(mapInstance, scale);

  }, [mapInstance, restaurants, onMarkerClick, mapType, isMapReady]);

  // Update map type/style
  useEffect(() => {
    if (!mapInstance) return;
    if (currentMapTypeRef.current === mapType) return;

    currentMapTypeRef.current = mapType;
    const isDarkMode = mapType === 'dark';
    const isSatellite = mapType === 'satellite';
    const circleStyle = getCircleStyle(isDarkMode, isSatellite);

    console.log('Switching map type to:', mapType);

    if (mapType === 'satellite') {
      mapInstance.setMapTypeId('satellite');
      mapInstance.setOptions({ styles: [] });
    } else if (mapType === 'roadmap') {
      mapInstance.setMapTypeId('roadmap');
      mapInstance.setOptions({ styles: [] });
    } else if (mapType === 'dark') {
      mapInstance.setMapTypeId('roadmap');
      mapInstance.setOptions({ styles: DARK_MODE_STYLES });
    }

    // Update circles
    for (const [, circle] of circlesRef.current) {
      circle.setOptions({
        fillColor: circleStyle.fillColor,
        fillOpacity: circleStyle.fillOpacity,
        strokeColor: circleStyle.strokeColor,
        strokeOpacity: circleStyle.strokeOpacity,
        strokeWeight: circleStyle.strokeWeight,
      });
    }
  }, [mapType, mapInstance]);

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
