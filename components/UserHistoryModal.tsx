
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { Restaurant, Visit } from '../types';
import { getGradeColor } from '../utils/rating';

interface UserHistoryModalProps {
  restaurants: Restaurant[];
  currentUserUid: string;
  onClose: () => void;
  onSelectVisit: (restaurant: Restaurant) => void;
}

const ITEMS_PER_PAGE = 10;

const UserHistoryModal: React.FC<UserHistoryModalProps> = ({ 
  restaurants, 
  currentUserUid, 
  onClose,
  onSelectVisit
}) => {
  const [isClosing, setIsClosing] = useState(false);
  
  // Flatten restaurants to get all visits by this user
  const allUserVisits = restaurants.flatMap(r => 
    r.visits
      .filter(v => v.createdBy === currentUserUid)
      .map(v => ({
        ...v,
        restaurantName: r.name,
        restaurantAddress: r.address,
        restaurantObj: r
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Infinite Scroll State
  const [displayedVisits, setDisplayedVisits] = useState(allUserVisits.slice(0, ITEMS_PER_PAGE));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(allUserVisits.length > ITEMS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, page]);

  const loadMore = () => {
    const nextPage = page + 1;
    const startIndex = 0;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    const newDisplayed = allUserVisits.slice(startIndex, endIndex);
    
    setDisplayedVisits(newDisplayed);
    setPage(nextPage);
    
    if (newDisplayed.length >= allUserVisits.length) {
      setHasMore(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
      onClick={handleClose}
    >
      <div 
        className="bg-gray-800 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Your Journey <span className="text-gray-500 text-sm font-normal">({allUserVisits.length} memories)</span>
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 bg-gray-900/50 flex-1">
          {allUserVisits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>You haven't logged any memories yet.</p>
              <p className="text-sm mt-2">Tap the + button to start!</p>
            </div>
          ) : (
            <>
              {displayedVisits.map((item, index) => (
                <div 
                  key={item.id} 
                  onClick={() => onSelectVisit(item.restaurantObj)}
                  className="flex gap-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 hover:border-blue-500/50 transition cursor-pointer group animate-fade-in-up"
                  style={{ animationDelay: `${(index % 10) * 50}ms` }}
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
                    <img src={item.photoDataUrl} alt="Memory" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" loading="lazy" />
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
                         "{item.comment || 'No comment'}"
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
              ))}
              
              {/* Sentinel for Infinite Scroll */}
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-4 text-blue-400">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHistoryModal;
