
import React, { useState } from 'react';
import { X, MapPin, Calendar, User as UserIcon } from 'lucide-react';
import { Restaurant, Visit } from '../types';
import { GRADES, getGradeColor, getGradeDescription } from '../utils/rating';
import ImageSlider from './ImageSlider';

interface StatsModalProps {
  restaurants: Restaurant[];
  onClose: () => void;
}

interface FlattenedVisit extends Visit {
  restaurantName: string;
  restaurantAddress: string;
}

const StatsModal: React.FC<StatsModalProps> = ({ restaurants, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  
  // 1. Flatten all visits into a single array with restaurant metadata
  const allVisits: FlattenedVisit[] = restaurants.flatMap(r => 
    r.visits.map(v => ({
      ...v,
      restaurantName: r.name,
      restaurantAddress: r.address
    }))
  );

  // 2. Group by Rating
  const visitsByRating: Record<string, FlattenedVisit[]> = {};
  GRADES.forEach(grade => {
    visitsByRating[grade] = allVisits
      .filter(v => v.rating === grade)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
        className="bg-gray-800 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📊 Statistics & Rankings
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-gray-900/50">
          
          {GRADES.map((grade, gradeIndex) => {
            const visits = visitsByRating[grade];
            if (visits.length === 0) return null;

            return (
              <div 
                key={grade} 
                className="space-y-4 animate-fade-in-up"
                style={{ animationDelay: `${gradeIndex * 100}ms` }}
              >
                <div className="flex items-center gap-4 border-b border-gray-700 pb-2">
                  <div className={`text-4xl font-black ${getGradeColor(grade)} w-16 text-center`}>
                    {grade}
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className={`font-bold text-lg ${getGradeColor(grade)}`}>
                      {getGradeDescription(grade)}
                    </span>
                    <span className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-0.5">
                      {visits.length} Experiences
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visits.map(visit => {
                     const photos = visit.photos && visit.photos.length > 0 ? visit.photos : [visit.photoDataUrl];
                     
                     return (
                       <div key={visit.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-sm flex flex-col">
                         {/* Reusable Image Slider */}
                         <div className="relative">
                            <ImageSlider photos={photos} />
                            <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-md pl-1 pr-2 py-0.5 rounded-full flex items-center gap-1.5 max-w-[85%] border border-white/10 pointer-events-none">
                              {visit.creatorPhotoURL ? (
                                 <img src={visit.creatorPhotoURL} alt="User" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center">
                                  <UserIcon size={8} className="text-gray-300" />
                                </div>
                              )}
                              <span className="text-[10px] text-white font-medium truncate">
                                {visit.creatorName}
                              </span>
                            </div>
                         </div>

                         <div className="p-3 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-1">
                               <h3 className="font-bold text-white truncate text-sm" title={visit.restaurantName}>
                                 {visit.restaurantName}
                               </h3>
                               <span className="text-[10px] text-gray-500 font-mono mt-0.5 whitespace-nowrap">
                                 {formatDate(visit.date)}
                               </span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-2">
                              <MapPin size={10} />
                              <span className="truncate">{visit.restaurantAddress}</span>
                            </div>

                            {visit.comment && (
                               <p className="text-gray-300 text-xs italic line-clamp-2 mt-auto">"{visit.comment}"</p>
                            )}
                         </div>
                       </div>
                     );
                  })}
                </div>
              </div>
            );
          })}

          {allVisits.length === 0 && (
             <div className="text-center py-20 text-gray-500">
               <p className="text-lg">No statistics available yet.</p>
               <p className="text-sm">Start adding some memories!</p>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StatsModal;
