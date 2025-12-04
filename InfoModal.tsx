import React, { useState } from 'react';
import { X, MapPin, Camera, Trash2, Settings, Lock } from 'lucide-react';
import { GRADES, getGradeColor, getGradeDescription } from '../utils/rating';

interface InfoModalProps {
  onClose: () => void;
  onClearDatabase?: () => void;
  isAdmin: boolean;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose, onClearDatabase, isAdmin }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
      onClick={handleClose}
    >
      <div 
        className="bg-gray-800 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">About TraceBook</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-700">
            <h3 className="text-white font-bold mb-2">How it works</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2">
                <Camera size={18} className="text-blue-400 flex-shrink-0" />
                <span>Upload photos. The app auto-detects the location from GPS data.</span>
              </li>
              <li className="flex gap-2">
                <MapPin size={18} className="text-green-400 flex-shrink-0" />
                <span>Experiences are pinned to the map. Click clusters to zoom in.</span>
              </li>
            </ul>
          </div>

          <div>
             <h3 className="text-white font-bold mb-2">Rating System</h3>
             <div className="grid grid-cols-1 gap-2">
               {GRADES.map(grade => (
                 <div key={grade} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                   <span className={`font-bold w-6 text-center ${getGradeColor(grade)}`}>{grade}</span>
                   <span className="text-xs text-gray-400">{getGradeDescription(grade)}</span>
                 </div>
               ))}
             </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
             <button 
               onClick={() => setShowAdvanced(!showAdvanced)}
               className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition"
             >
               <Settings size={14} />
               Advanced Options
             </button>

             {showAdvanced && (
               <div className="mt-4 bg-red-900/10 border border-red-900/30 rounded-xl p-4">
                 {!isAdmin ? (
                   <div className="space-y-3">
                     <p className="text-xs text-red-400 flex items-center gap-1">
                       <Lock size={12} /> Restricted Access
                     </p>
                     <p className="text-xs text-gray-400">
                       Only administrators can perform advanced actions on the database.
                     </p>
                   </div>
                 ) : (
                   <div>
                     <p className="text-xs text-red-400 mb-3 font-bold flex items-center gap-1">
                       <Lock size={12} /> Admin Control
                     </p>
                     <button 
                       onClick={() => {
                         if(onClearDatabase) onClearDatabase();
                         handleClose();
                       }}
                       className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition"
                     >
                       <Trash2 size={18} />
                       Reset Database
                     </button>
                     <p className="text-[10px] text-red-300/50 text-center mt-2">This will delete all places and memories permanently.</p>
                   </div>
                 )}
               </div>
             )}
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-600">Version 0.9</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;