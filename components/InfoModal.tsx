
import React, { useState } from 'react';
import { X, MapPin, Camera, Trash2, Settings, Lock } from 'lucide-react';
import { GRADES, getGradeColor, getGradeDescription } from '../utils/rating';

interface InfoModalProps {
  onClose: () => void;
  onClearDatabase?: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose, onClearDatabase }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleUnlock = () => {
    if (password === 'sqxwazjl123') {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password");
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-800 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-blue-500">ℹ️</span> About 宝宝少爷寻味地图
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-gray-300 flex-1">
          
          <section>
            <h3 className="text-white font-semibold mb-2">How it works</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <Camera size={18} className="text-blue-400 flex-shrink-0" />
                <span>Upload a photo of your food. We extract the GPS location to find the restaurant automatically.</span>
              </li>
              <li className="flex gap-3">
                <MapPin size={18} className="text-green-400 flex-shrink-0" />
                <span>We mark it on your map. You can add comments and ratings for every visit.</span>
              </li>
            </ul>
          </section>

          <section>
             <h3 className="text-white font-semibold mb-2">Grading System</h3>
             <div className="grid gap-2 text-sm">
               {GRADES.map(grade => (
                 <div key={grade} className="flex items-center gap-3 bg-gray-700/50 p-2 rounded">
                   <span className={`font-bold text-lg w-8 text-center ${getGradeColor(grade)}`}>{grade}</span>
                   <span className="text-gray-300 text-xs sm:text-sm">
                     {getGradeDescription(grade)}
                   </span>
                 </div>
               ))}
             </div>
          </section>

          <div className="text-center pt-4">
             <p className="text-xs text-gray-500">Version 0.1</p>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition"
            >
              <Settings size={14} />
              {showAdvanced ? 'Hide Advanced Options' : 'Advanced Options'}
            </button>

            {showAdvanced && (
              <div className="mt-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700 transition-all">
                 {!isAuthenticated ? (
                   <div className="flex flex-col gap-2">
                     <p className="text-xs text-gray-400 flex items-center gap-1"><Lock size={12}/> Admin Access Required</p>
                     <div className="flex gap-2">
                       <input 
                         type="password" 
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         placeholder="Enter Password"
                         className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                       />
                       <button 
                         onClick={handleUnlock}
                         className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition"
                       >
                         Unlock
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-2">
                      <p className="text-xs text-green-400 mb-2">Access Granted</p>
                      {onClearDatabase && (
                        <button 
                          onClick={onClearDatabase}
                          className="w-full flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs border border-red-900 p-3 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                          Reset Database (Delete All Data)
                        </button>
                      )}
                   </div>
                 )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default InfoModal;
