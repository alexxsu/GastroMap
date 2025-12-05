import React from 'react';
import { Crosshair, Map } from 'lucide-react';

interface MapControlsProps {
  mapType: 'satellite' | 'roadmap' | 'dark';
  onZoomToMunicipality: () => void;
  onToggleMapType: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  mapType,
  onZoomToMunicipality,
  onToggleMapType
}) => {
  const getMapTypeTitle = () => {
    if (mapType === 'satellite') return 'Switch to Road View';
    if (mapType === 'roadmap') return 'Switch to Dark Mode';
    return 'Switch to Satellite View';
  };

  const handleZoomClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onZoomToMunicipality();
    // Remove focus to clear visual feedback
    e.currentTarget.blur();
  };

  const handleMapTypeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onToggleMapType();
    // Remove focus to clear visual feedback
    e.currentTarget.blur();
  };

  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
      <button
        onClick={handleZoomClick}
        className="bg-gray-800/90 backdrop-blur border border-gray-700 p-3 rounded-full shadow-lg text-white hover:bg-gray-700 active:bg-gray-600 transition group focus:outline-none"
        title="Zoom to My City"
      >
        <Crosshair size={24} className="group-hover:text-blue-400 group-active:text-blue-300 transition" />
      </button>
      <button
        onClick={handleMapTypeClick}
        className={`bg-gray-800/90 backdrop-blur border p-3 rounded-full shadow-lg text-white transition group focus:outline-none active:bg-gray-600
          ${mapType !== 'roadmap' ? 'border-blue-500' : 'border-gray-700 hover:bg-gray-700'}
        `}
        title={getMapTypeTitle()}
      >
        <Map size={24} className="group-hover:text-blue-400 group-active:text-blue-300 transition" />
      </button>
    </div>
  );
};
