import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Crosshair, Map } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface MapControlsProps {
  mapType: 'satellite' | 'roadmap' | 'dark';
  onZoomToMunicipality: () => void;
  onToggleMapType: () => void;
}

export interface MapControlsRef {
  resetClickState: () => void;
}

export const MapControls = forwardRef<MapControlsRef, MapControlsProps>(({
  mapType,
  onZoomToMunicipality,
  onToggleMapType
}, ref) => {
  const { t } = useLanguage();
  const [clickedButton, setClickedButton] = useState<'zoom' | 'mapType' | null>(null);

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

  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
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
