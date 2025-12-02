
import React from 'react';
import { X, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Restaurant, Visit } from '../types';
import { getGradeColor } from '../utils/rating';

interface UserHistoryModalProps {
  restaurants: Restaurant[];
  currentUserUid: string;
  onClose: () => void;
  onSelectVisit: (restaurant: Restaurant) => void;
}

const UserHistoryModal: React.FC<UserHistoryModalProps> = ({ 
  restaurants, 
  currentUserUid, 
  onClose,
  onSelectVisit
}) => {
  
  // Flatten restaurants to get all visits by this user
  const userVisits = restaurants.flatMap(r => 
    r.visits
      .filter(v => v.createdBy === currentUserUid)
      .map(v => ({
        ...v,
        restaurantName: r.name,
        restaurantAddress: r.address,
        restaurantObj: r
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-800 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Your Food Journey <span className="text-gray-500 text-sm font-normal">({userVisits.length} memories)</span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 bg-gray-900/50">
          {userVisits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>You haven't logged any food memories yet.</p>
              <p className="text-sm mt-2">Tap the + button to start!</p>
            </div>
          ) : (
            userVisits.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onSelectVisit(item.restaurantObj)}
                className="flex gap-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 hover:border-blue-500/50 transition cursor-pointer group"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
                  <img src={item.photoDataUrl} alt="Food" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white truncate pr-2 group-hover:text-blue-400 transition">{item.restaurantName}</h3>
                    <div className={`px-2 py-0.5 rounded bg-gray-900 text-xs font-bold border border-gray-700 ${getGradeColor(item.rating)}`}>
                      {item.rating}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                    <MapPin size={10} />
                    <span className="truncate">{item.restaurantAddress}</span>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                     <p className="text-gray-400 text-xs italic truncate max-w-[80%]">
                       "{item.comment || item.aiDescription || 'No comment'}"
                     </p>
                     <div className="flex items-center text-gray-600 text-xs gap-1">
                       <Calendar size={10} />
                       {formatDate(item.date)}
                     </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center px-1 text-gray-600 group-hover:text-blue-500 transition">
                  <ArrowRight size={16} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHistoryModal;
