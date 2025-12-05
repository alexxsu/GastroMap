import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { Crosshair, Map, GraduationCap } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface MapControlsProps {
  mapType: 'satellite' | 'roadmap' | 'dark';
  onZoomToMunicipality: () => void;
  onToggleMapType: () => void;
  onStartTutorial?: () => void;
}

export interface MapControlsRef {
  resetClickState: () => void;
}

export const MapControls = forwardRef<MapControlsRef, MapControlsProps>(({
  mapType,
  onZoomToMunicipality,
  onToggleMapType,
  onStartTutorial
}, ref) => {
  const { t } = useLanguage();
  const [clickedButton, setClickedButton] = useState<'zoom' | 'mapType' | 'tutorial' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getMapTypeTitle = () => {
    if (mapType === 'satellite') return t('switchToRoad');
    if (mapType === 'roadmap') return t('switchToDark');
    return t('switchToSatellite');
  };

  // Expose reset function to parent
  useImperativeHandle(ref, () => ({
    resetClickState: () => {
      setClickedButton(null);
    }
  }));

  // Reset click state when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setClickedButton(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleZoomClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setClickedButton('zoom');
    onZoomToMunicipality();
    e.currentTarget.blur();
  };

  const handleMapTypeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setClickedButton('mapType');
    onToggleMapType();
    e.currentTarget.blur();
  };

  const handleTutorialClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setClickedButton('tutorial');
    onStartTutorial?.();
    e.currentTarget.blur();
  };

  return (
    <div ref={containerRef} data-tutorial="map-controls" className="absolute bottom-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
      {/* Tutorial Button - Top */}
      {onStartTutorial && (
        <button
          onClick={handleTutorialClick}
          className={`bg-gradient-to-br from-amber-600 to-orange-600 backdrop-blur border p-3 rounded-full shadow-lg text-white hover:from-amber-500 hover:to-orange-500 active:from-amber-700 active:to-orange-700 transition group focus:outline-none focus:ring-0
            ${clickedButton === 'tutorial' ? 'border-amber-300 ring-2 ring-amber-400/50' : 'border-amber-500/50'}
          `}
          title={t('startTutorial')}
        >
          <GraduationCap size={24} className={`transition ${clickedButton === 'tutorial' ? 'text-amber-200' : 'group-hover:text-amber-100'}`} />
        </button>
      )}
      <button
        onClick={handleZoomClick}
        className={`bg-gray-800/90 backdrop-blur border p-3 rounded-full shadow-lg text-white hover:bg-gray-700 active:bg-gray-600 transition group focus:outline-none focus:ring-0
          ${clickedButton === 'zoom' ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-700'}
        `}
        title={t('zoomToCity')}
      >
        <Crosshair size={24} className={`transition ${clickedButton === 'zoom' ? 'text-blue-400' : 'group-hover:text-blue-400 group-active:text-blue-300'}`} />
      </button>
      <button
        onClick={handleMapTypeClick}
        className={`bg-gray-800/90 backdrop-blur border p-3 rounded-full shadow-lg text-white transition group focus:outline-none focus:ring-0 active:bg-gray-600
          ${clickedButton === 'mapType' 
            ? 'border-blue-500 ring-2 ring-blue-500/50' 
            : mapType !== 'roadmap' 
              ? 'border-blue-500 hover:bg-gray-700' 
              : 'border-gray-700 hover:bg-gray-700'}
        `}
        title={getMapTypeTitle()}
      >
        <Map size={24} className={`transition ${clickedButton === 'mapType' ? 'text-blue-400' : 'group-hover:text-blue-400 group-active:text-blue-300'}`} />
      </button>
    </div>
  );
});
