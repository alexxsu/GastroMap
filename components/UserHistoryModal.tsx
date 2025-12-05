
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Calendar, MapPin, ArrowRight, Loader2, Filter } from 'lucide-react';
import { Restaurant, Visit } from '../types';
import { getGradeColor, GRADES } from '../utils/rating';
import { useLanguage } from '../hooks/useLanguage';

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
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedRatings, setSelectedRatings] = useState<string[]>(GRADES);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  
  // Flatten restaurants to get all visits by this user
  const allUserVisits = useMemo(() => {
    return restaurants.flatMap(r => 
      r.visits
        .filter(v => v.createdBy === currentUserUid)
        .map(v => ({
          ...v,
          restaurantName: r.name,
          restaurantAddress: r.address,
          restaurantObj: r
        }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [restaurants, currentUserUid]);

  // Get unique years from visits
  const availableYears = useMemo(() => {
    const years = new Set(allUserVisits.map(v => new Date(v.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [allUserVisits]);

  // Filter visits based on selected filters
  const filteredVisits = useMemo(() => {
    let filtered = allUserVisits;
    
    if (selectedRatings.length < GRADES.length) {
      filtered = filtered.filter(v => selectedRatings.includes(v.rating));
    }
    
    if (selectedYear) {
      filtered = filtered.filter(v => new Date(v.date).getFullYear().toString() === selectedYear);
    }
    
    return filtered;
  }, [allUserVisits, selectedRatings, selectedYear]);

  // Infinite Scroll State
  const [displayedVisits, setDisplayedVisits] = useState(filteredVisits.slice(0, ITEMS_PER_PAGE));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(filteredVisits.length > ITEMS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayedVisits(filteredVisits.slice(0, ITEMS_PER_PAGE));
    setPage(1);
    setHasMore(filteredVisits.length > ITEMS_PER_PAGE);
  }, [filteredVisits]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const toggleFilter = () => {
    if (showFilters) {
      setIsFilterClosing(true);
      setTimeout(() => {
        setShowFilters(false);
        setIsFilterClosing(false);
      }, 200);
    } else {
      setShowFilters(true);
    }
  };

  const toggleRating = (rating: string) => {
    setSelectedRatings(prev => 
      prev.includes(rating)
        ? prev.filter(r => r !== rating)
        : [...prev, rating]
    );
  };

  const selectAllRatings = () => setSelectedRatings(GRADES);
  const clearAllRatings = () => setSelectedRatings([]);

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
  }, [hasMore, page, filteredVisits]);

  const loadMore = () => {
    const nextPage = page + 1;
    const startIndex = 0;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    const newDisplayed = filteredVisits.slice(startIndex, endIndex);
    
    setDisplayedVisits(newDisplayed);
    setPage(nextPage);
    
    if (newDisplayed.length >= filteredVisits.length) {
      setHasMore(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setSelectedRatings(GRADES);
    setSelectedYear(null);
  };

  const hasActiveFilters = selectedRatings.length < GRADES.length || selectedYear;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div 
        className={`bg-gray-800 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {language === 'zh' ? '你的旅程' : 'Your Journey'} 
            <span className="text-gray-500 text-sm font-normal">
              ({filteredVisits.length} {language === 'zh' ? '条记忆' : 'memories'})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFilter}
              className={`p-2 rounded-lg transition relative ${showFilters || hasActiveFilters ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
            >
              <Filter size={18} />
              {hasActiveFilters && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
            <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Section with animation */}
        {(showFilters || isFilterClosing) && (
          <div className={`p-4 border-b border-gray-700 bg-gray-900/30 space-y-4 ${isFilterClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
            {/* Rating Filter Grid */}
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase mb-2">{t('filterByRating')}</div>
              <div className="grid grid-cols-6 gap-1.5">
                {GRADES.map(grade => (
                  <button
                    key={grade}
                    onClick={() => toggleRating(grade)}
                    className={`text-sm font-bold py-2 rounded-lg transition border
                      ${selectedRatings.includes(grade)
                        ? `${getGradeColor(grade)} bg-gray-700 border-gray-600`
                        : 'text-gray-600 border-transparent hover:bg-gray-700/50'}
                    `}
                  >
                    {grade}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs mt-2">
                <button onClick={selectAllRatings} className="text-blue-400 hover:text-blue-300">{t('selectAll')}</button>
                <button onClick={clearAllRatings} className="text-gray-500 hover:text-gray-400">{t('clearAll')}</button>
              </div>
            </div>
            
            {/* Year Filter */}
            {availableYears.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase mb-2">{t('year')}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedYear(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition border
                      ${selectedYear === null
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'text-gray-400 border-gray-600 hover:bg-gray-700'}
                    `}
                  >
                    {t('all')}
                  </button>
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition border
                        ${selectedYear === year
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                          : 'text-gray-400 border-gray-600 hover:bg-gray-700'}
                      `}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button 
                  onClick={clearFilters}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  {t('clearFilter')}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="p-4 overflow-y-auto space-y-3 bg-gray-900/50 flex-1">
          {filteredVisits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {hasActiveFilters ? (
                <>
                  <p>{t('noResults')}</p>
                  <button 
                    onClick={clearFilters}
                    className="text-sm mt-2 text-blue-400 hover:text-blue-300"
                  >
                    {t('clearFilter')}
                  </button>
                </>
              ) : (
                <>
                  <p>{language === 'zh' ? '你还没有记录任何记忆。' : "You haven't logged any memories yet."}</p>
                  <p className="text-sm mt-2">{language === 'zh' ? '点击 + 按钮开始！' : 'Tap the + button to start!'}</p>
                </>
              )}
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
                         "{item.comment || (language === 'zh' ? '无评论' : 'No comment')}"
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
