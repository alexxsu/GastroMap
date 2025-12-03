
import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, MapPin, Share2, User, Trash2, Pencil, Loader2, ExternalLink } from 'lucide-react';
import { Restaurant, Visit, GUEST_ID } from '../types';
import { getGradeColor, calculateAverageGrade } from '../utils/rating';
import html2canvas from 'html2canvas';
import ImageSlider from './ImageSlider';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  currentUserUid?: string;
  onClose: () => void;
  onAddAnotherVisit: () => void;
  onDeleteVisit: (restaurant: Restaurant, visit: Visit) => void;
  onEditVisit: (restaurant: Restaurant, visit: Visit) => void;
}

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ 
  restaurant, 
  currentUserUid, 
  onClose, 
  onAddAnotherVisit,
  onDeleteVisit,
  onEditVisit
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'info'>('timeline');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareBase64Map, setShareBase64Map] = useState<Record<string, string>>({});
  const shareRef = useRef<HTMLDivElement>(null);
  
  // Animation & Drag State
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingDown, setIsClosingDown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  
  const sortedVisits = [...restaurant.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleClose = (direction: 'right' | 'down' = 'right') => {
    if (direction === 'down') setIsClosingDown(true);
    setIsClosing(true);
    setTimeout(onClose, 250); // Matches CSS animation duration
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Drag Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    // Only allow dragging down
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 150) { // Threshold to close
      handleClose('down');
    } else {
      setDragY(0); // Snap back
    }
  };

  const convertUrlToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      // Append a timestamp to avoid cache issues with CORS
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (e) {
          reject(e); // Likely tainted canvas if CORS failed silently
        }
      };
      
      img.onerror = (e) => {
        reject(new Error(`Image load failed`));
      };
    });
  };

  const handleShareAsImage = async () => {
    if (!shareRef.current) return;
    setIsGeneratingShare(true);

    try {
      // 1. Convert all images to Base64 using Canvas method
      const urls = sortedVisits.map(v => v.photoDataUrl).filter(url => url);
      const uniqueUrls = [...new Set(urls)];
      const newBase64Map: Record<string, string> = {};

      await Promise.all(uniqueUrls.map(async (url) => {
        try {
          if (url.startsWith('data:')) {
             newBase64Map[url] = url;
             return;
          }
          const base64 = await convertUrlToBase64(url);
          newBase64Map[url] = base64;
        } catch (err) {
          console.warn("Error converting image for share (CORS might be missing on bucket):", url);
          // Fallback to original URL - html2canvas might still fail to render it if it's cross-origin
          newBase64Map[url] = url; 
        }
      }));

      setShareBase64Map(newBase64Map);
      
      // Allow React to re-render the hidden view with Base64 sources
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(shareRef.current, {
        useCORS: true, 
        allowTaint: false, // Must be false to allow export
        backgroundColor: '#111827',
        scale: 2, 
        logging: false,
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) throw new Error('Canvas is empty');
        const file = new File([blob], `${restaurant.name.replace(/\s+/g, '_')}_Experience.png`, { type: 'image/png' });

        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out my experience at ${restaurant.name} on 宝宝少爷寻味地图!`
            });
          } catch (shareError) {
             downloadImage(canvas);
          }
        } else {
          downloadImage(canvas);
        }
        setIsGeneratingShare(false);
      }, 'image/png');

    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate share image. Please ensure your Firebase Storage CORS settings allow this domain.");
      setIsGeneratingShare(false);
    }
  };

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `${restaurant.name.replace(/\s+/g, '_')}_Experience.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleDelete = (visit: Visit) => {
    if (window.confirm("Are you sure you want to delete this memory? This cannot be undone.")) {
      onDeleteVisit(restaurant, visit);
    }
  };

  const canEditOrDeleteVisit = (visit: Visit): boolean => {
    if (!currentUserUid) return false;
    
    // Guest users cannot edit anything (Read Only)
    if (currentUserUid === GUEST_ID) return false;

    if (visit.createdBy === currentUserUid) return true;
    
    // Real users can edit guest posts
    const isRealUser = currentUserUid !== GUEST_ID;
    const isGuestPost = visit.createdBy === GUEST_ID;
    if (isRealUser && isGuestPost) return true;
    
    return false;
  };

  const avgGrade = calculateAverageGrade(restaurant.visits);

  const handleOpenGoogleMaps = () => {
    const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  // Determine animation class
  let animationClass = 'animate-slide-in-up sm:animate-slide-in-right'; // Mobile slide up, Desktop slide right
  if (isClosing) {
    animationClass = isClosingDown ? 'animate-slide-out-down' : 'animate-slide-out-down sm:animate-slide-out-right';
  }

  return (
    <>
      <div 
        className={`absolute bottom-0 left-0 right-0 h-[92%] sm:h-full sm:top-0 sm:left-auto sm:right-0 sm:w-[400px] bg-gray-900 border-t sm:border-t-0 sm:border-l border-gray-800 shadow-2xl z-20 flex flex-col rounded-t-2xl sm:rounded-none ${animationClass}`}
        style={{ 
          transform: isDragging ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : undefined
        }}
      >
        
        {/* Header - Draggable Area */}
        <div 
          className="relative h-48 bg-gray-800 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none rounded-t-2xl sm:rounded-none overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Drag Handle for Mobile */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-gray-400/50 rounded-full z-30 sm:hidden"></div>

          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10 pointer-events-none" />
          {restaurant.visits.length > 0 && (
            <img 
              src={restaurant.visits[0].photoDataUrl} 
              className="w-full h-full object-cover opacity-60" 
              alt="Venue" 
            />
          )}
          <button 
            onClick={() => handleClose('right')}
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
            <h1 className="text-2xl font-bold text-white leading-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
              <MapPin size={12} />
              <span className="truncate">{restaurant.address}</span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex border-b border-gray-800 bg-gray-900/50 backdrop-blur flex-shrink-0">
          <div className="flex-1 p-3 text-center border-r border-gray-800">
            <span className="block text-lg font-bold text-white">{restaurant.visits.length}</span>
            <span className="text-xs text-gray-500 uppercase">Visits</span>
          </div>
          <div className="flex-1 p-3 text-center">
            <span className={`block text-lg font-bold ${getGradeColor(avgGrade)}`}>
              {avgGrade}
            </span>
            <span className="text-xs text-gray-500 uppercase">Avg Grade</span>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-800 bg-gray-900">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'timeline' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'info' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Info
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <>
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Memories</h3>
                  <button 
                    onClick={handleShareAsImage} 
                    disabled={isGeneratingShare}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs bg-blue-900/20 px-2 py-1 rounded transition disabled:opacity-50"
                  >
                    {isGeneratingShare ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                    Share Card
                  </button>
              </div>

              {restaurant.visits.length === 0 ? (
                 <div className="text-center text-gray-500 py-10">
                   <p>No visits recorded.</p>
                 </div>
              ) : (
                sortedVisits.map((visit, index) => {
                  const photos = visit.photos && visit.photos.length > 0 ? visit.photos : [visit.photoDataUrl];
                  
                  return (
                    <div 
                      key={visit.id} 
                      className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-sm group animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      
                      <div className="relative">
                        {canEditOrDeleteVisit(visit) && (
                          <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                              onClick={() => onEditVisit(restaurant, visit)}
                              className="bg-blue-600/80 hover:bg-blue-500 p-1.5 rounded-full text-white"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(visit)}
                              className="bg-red-600/80 hover:bg-red-500 p-1.5 rounded-full text-white"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                        <ImageSlider photos={photos} />

                        {visit.creatorName && (
                          <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-md pl-1 pr-3 py-1 rounded-full flex items-center gap-2 max-w-[85%] border border-white/10 pointer-events-none">
                            {visit.creatorPhotoURL ? (
                               <img src={visit.creatorPhotoURL} alt="User" className="w-5 h-5 rounded-full object-cover border border-gray-400" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center border border-gray-500">
                                <User size={10} className="text-gray-300" />
                              </div>
                            )}
                            <span className="text-[10px] text-white font-medium truncate">
                              {visit.creatorName}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700 font-bold ${getGradeColor(visit.rating)}`}>
                            {visit.rating}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                            <Calendar size={12} />
                            <span>{formatDate(visit.date)}</span>
                          </div>
                        </div>
                        
                        {visit.comment && (
                          <p className="text-gray-300 text-sm mb-3">"{visit.comment}"</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in-up">
               <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Location Details</h3>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="text-xs text-gray-500">Name</label>
                     <p className="text-white font-medium">{restaurant.name}</p>
                   </div>
                   
                   <div>
                     <label className="text-xs text-gray-500">Address</label>
                     <p className="text-white font-medium">{restaurant.address}</p>
                   </div>

                   <div>
                      <label className="text-xs text-gray-500">Coordinates</label>
                      <p className="text-gray-400 font-mono text-xs">
                        {restaurant.location.lat.toFixed(5)}, {restaurant.location.lng.toFixed(5)}
                      </p>
                   </div>

                   <button 
                     onClick={handleOpenGoogleMaps}
                     className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition border border-gray-600"
                   >
                     <MapPin size={18} />
                     Open in Google Maps
                     <ExternalLink size={14} className="opacity-70" />
                   </button>
                 </div>
               </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {activeTab === 'timeline' && (
          <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
            {/* 
              Check if user can add visits. Guests can view but NOT add (as per "cant edit" request).
              Actually, usually adding is "creating", editing is "modifying". 
              The prompt said "visitor can still view, but cant edit".
              Does creating count as editing? Usually yes in read-only mode.
              I will hide the 'Add Another Visit' button for Guests.
            */}
            {currentUserUid !== GUEST_ID && (
              <button 
                onClick={onAddAnotherVisit}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition"
              >
                Add Another Visit Here
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden Share Receipt Render */}
      <div 
        ref={shareRef}
        className="fixed top-0 left-[-9999px] w-[400px] bg-gray-900 text-white p-6 border border-gray-800"
      >
        <div className="text-center mb-6">
           <h2 className="text-xl font-bold text-white mb-1">宝宝少爷寻味地图</h2>
           <div className="w-48 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4 rounded-full shadow-sm"></div>
           <h1 className="text-2xl font-black text-blue-400 mb-2 px-4 leading-tight">{restaurant.name}</h1>
           <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
             <MapPin size={12} /> {restaurant.address}
           </p>
        </div>

        <div className="flex justify-between border-t border-b border-gray-700 py-3 mb-6">
           <div className="text-center w-1/2 border-r border-gray-700">
             <span className="block text-xl font-bold">{restaurant.visits.length}</span>
             <span className="text-xs text-gray-500 uppercase tracking-widest">Visits</span>
           </div>
           <div className="text-center w-1/2">
             <span className={`block text-xl font-bold ${getGradeColor(avgGrade)}`}>{avgGrade}</span>
             <span className="text-xs text-gray-500 uppercase tracking-widest">Score</span>
           </div>
        </div>

        <div className="space-y-6">
           {sortedVisits.map((visit, i) => (
             <div key={i} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                   <div className="w-3 h-3 rounded-full bg-gray-600 z-10"></div>
                   {i !== sortedVisits.length - 1 && <div className="w-0.5 h-full bg-gray-800 absolute top-3"></div>}
                </div>
                
                <div className="flex-1 pb-4">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-500 font-mono block">{formatDate(visit.date)}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                           {visit.creatorPhotoURL && <img src={visit.creatorPhotoURL} className="w-3 h-3 rounded-full" />}
                           <span className="text-xs text-gray-300 font-bold">{visit.creatorName}</span>
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${getGradeColor(visit.rating)}`}>{visit.rating}</span>
                   </div>

                   {/* Use Background Image to prevent stretching and ensure cover fit */}
                   <div className="rounded-lg overflow-hidden mb-2 border border-gray-700 h-64 bg-gray-800">
                     <div 
                        className="w-full h-full bg-cover bg-center"
                        style={{ 
                          backgroundImage: `url(${shareBase64Map[visit.photoDataUrl] || visit.photoDataUrl})` 
                        }}
                     ></div>
                   </div>
                   
                   {visit.comment && <p className="text-sm text-gray-300 italic mb-1">"{visit.comment}"</p>}
                </div>
             </div>
           ))}
        </div>
      </div>
    </>
  );
};

export default RestaurantDetail;
