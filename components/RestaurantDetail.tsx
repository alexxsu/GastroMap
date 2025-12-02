
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Share2, User, Trash2, ChevronLeft, ChevronRight, Download, Loader2, Pencil } from 'lucide-react';
import { Restaurant, Visit, GUEST_ID } from '../types';
import { getGradeColor, gradeToScore, scoreToGrade } from '../utils/rating';
import html2canvas from 'html2canvas';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  currentUserUid?: string;
  onClose: () => void;
  onAddAnotherVisit: () => void;
  onDeleteVisit: (restaurant: Restaurant, visit: Visit) => void;
  onEditVisit: (restaurant: Restaurant, visit: Visit) => void;
}

// Sub-component for Image Slider
const ImageSlider: React.FC<{ photos: string[] }> = ({ photos }) => {
  const [index, setIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Touch state for swipe detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (!photos || photos.length === 0) return <div className="h-48 bg-gray-800" />;

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev + 1) % photos.length);
  };

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (e.key === 'ArrowRight') {
        setIndex((prev) => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, photos.length]);

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      setIndex((prev) => (prev + 1) % photos.length);
    } else if (isRightSwipe) {
      setIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <>
      <div 
        className="h-48 w-full relative group overflow-hidden bg-gray-900 cursor-zoom-in"
        onClick={() => setIsLightboxOpen(true)}
      >
        {/* Carousel Container */}
        <div 
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {photos.map((photo, i) => (
            <img 
              key={i}
              src={photo} 
              className="w-full h-full object-cover flex-shrink-0" 
              alt={`Food ${i + 1}`} 
            />
          ))}
        </div>
        
        {photos.length > 1 && (
          <>
            <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
              <button onClick={prev} className="pointer-events-auto bg-black/50 hover:bg-black/70 p-1 rounded-full text-white backdrop-blur-sm">
                <ChevronLeft size={16} />
              </button>
              <button onClick={next} className="pointer-events-auto bg-black/50 hover:bg-black/70 p-1 rounded-full text-white backdrop-blur-sm">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20 pointer-events-none">
               {photos.map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`} />
               ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white z-10 border border-white/10 pointer-events-none">
              {index + 1}/{photos.length}
            </div>
          </>
        )}
      </div>

      {/* Fullscreen Lightbox Portal */}
      {isLightboxOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Close Button - Top Right (Fixed Position) */}
          <button 
             className="absolute top-4 right-4 z-[60] p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer hover:scale-105"
             onClick={(e) => {
               e.stopPropagation();
               setIsLightboxOpen(false);
             }}
          >
            <X size={32} />
          </button>

          {/* Navigation - Left */}
          {photos.length > 1 && (
             <button 
               onClick={prev} 
               className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95"
             >
               <ChevronLeft size={40} />
             </button>
          )}

           {/* Navigation - Right */}
          {photos.length > 1 && (
             <button 
               onClick={next} 
               className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 z-[60] p-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95"
             >
               <ChevronRight size={40} />
             </button>
          )}

          {/* Main Image Slider Track */}
          <div className="w-full h-full overflow-hidden">
            <div 
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {photos.map((photo, i) => (
                <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 md:p-12">
                   <img 
                     src={photo} 
                     className="max-w-full max-h-full object-contain shadow-2xl select-none"
                     alt={`Full view ${i + 1}`}
                     onClick={(e) => {
                        // Prevent click on image from closing the lightbox
                        e.stopPropagation();
                     }}
                   />
                </div>
              ))}
            </div>
          </div>

           {/* Pagination Dots - Bottom */}
           {photos.length > 1 && (
             <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-50" onClick={(e) => e.stopPropagation()}>
                {photos.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setIndex(i)}
                    className={`w-3 h-3 rounded-full transition-all cursor-pointer ${i === index ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'}`} 
                  />
                ))}
             </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ 
  restaurant, 
  currentUserUid, 
  onClose, 
  onAddAnotherVisit,
  onDeleteVisit,
  onEditVisit
}) => {
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareBase64Map, setShareBase64Map] = useState<Record<string, string>>({});
  const shareRef = useRef<HTMLDivElement>(null);
  
  // Calculate this at the top level so it's available for both the main render and the share handler
  const sortedVisits = [...restaurant.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShareAsImage = async () => {
    if (!shareRef.current) return;
    setIsGeneratingShare(true);

    try {
      // 1. Pre-process images to Base64 to bypass CORS issues in html2canvas
      const urls = sortedVisits.map(v => v.photoDataUrl).filter(url => url);
      const uniqueUrls = [...new Set(urls)];
      
      const newBase64Map: Record<string, string> = {};

      await Promise.all(uniqueUrls.map(async (url) => {
        try {
          // If it's already a data URL, skip fetch
          if (url.startsWith('data:')) {
             newBase64Map[url] = url;
             return;
          }

          const response = await fetch(url);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          newBase64Map[url] = base64;
        } catch (err) {
          console.warn("Error converting image for share:", url, err);
          // Fallback to original URL
          newBase64Map[url] = url;
        }
      }));

      setShareBase64Map(newBase64Map);

      // Wait for state update and re-render of the hidden div
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(shareRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#111827', // Match gray-900
        scale: 2, // Higher resolution
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
          throw new Error('Canvas is empty');
        }

        const file = new File([blob], `${restaurant.name.replace(/\s+/g, '_')}_Experience.png`, { type: 'image/png' });

        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out my experience at ${restaurant.name} on 宝宝少爷寻味地图!`
            });
          } catch (shareError) {
             console.log("Share API cancelled or failed, falling back to download", shareError);
             downloadImage(canvas);
          }
        } else {
          downloadImage(canvas);
        }
        setIsGeneratingShare(false);
      }, 'image/png');

    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate share image.");
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

  // Check if current user has permission to delete specific visit
  const canEditOrDeleteVisit = (visit: Visit): boolean => {
    if (!currentUserUid) return false;
    
    // 1. User can delete their own post
    if (visit.createdBy === currentUserUid) return true;

    // 2. Real Google Logged In Users (not guests) can delete Guest posts
    const isRealUser = currentUserUid !== GUEST_ID;
    const isGuestPost = visit.createdBy === GUEST_ID;

    if (isRealUser && isGuestPost) return true;

    return false;
  };

  // Calculate average grade
  const calculateAverageGrade = () => {
    if (restaurant.visits.length === 0) return 'N/A';
    
    let totalScore = 0;
    restaurant.visits.forEach(v => {
      totalScore += gradeToScore(v.rating);
    });
    
    const avgScore = totalScore / restaurant.visits.length;
    return scoreToGrade(avgScore);
  };

  const avgGrade = calculateAverageGrade();

  return (
    <>
      <div className="absolute top-0 right-0 h-full w-full sm:w-[400px] bg-gray-900 border-l border-gray-800 shadow-2xl z-20 flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="relative h-48 bg-gray-800 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
          {restaurant.visits.length > 0 && (
            <img 
              src={restaurant.visits[0].photoDataUrl} 
              className="w-full h-full object-cover opacity-60" 
              alt="Venue" 
            />
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-4 left-4 right-4 z-20">
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

        {/* Visits Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Timeline</h3>
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
            sortedVisits.map((visit) => {
              // Normalize photos list (legacy support)
              const photos = visit.photos && visit.photos.length > 0 ? visit.photos : [visit.photoDataUrl];
              
              return (
                <div key={visit.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-sm group">
                  
                  {/* Image Section Container - Relative for absolute positioning of overlays */}
                  <div className="relative">
                    {/* Action Buttons (Edit/Delete) */}
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

                    {/* Image Slider */}
                    <ImageSlider photos={photos} />

                    {/* Creator Badge - Positioned relative to image, with truncation and PFP */}
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
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
          <button 
            onClick={onAddAnotherVisit}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition"
          >
            Add Another Visit Here
          </button>
        </div>
      </div>

      {/* Hidden Share Receipt Render */}
      <div 
        ref={shareRef}
        className="fixed top-0 left-[-9999px] w-[400px] bg-gray-900 text-white p-6 border border-gray-800"
      >
        <div className="text-center mb-6">
           <h2 className="text-xl font-bold text-white mb-1">宝宝少爷寻味地图</h2>
           <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4 rounded-full"></div>
           <h1 className="text-2xl font-black text-blue-400 mb-2">{restaurant.name}</h1>
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
                {/* Timeline Line */}
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

                   <div className="rounded-lg overflow-hidden mb-2 border border-gray-700">
                     <img 
                       src={shareBase64Map[visit.photoDataUrl] || visit.photoDataUrl} 
                       className="w-full h-32 object-cover" 
                       crossOrigin="anonymous" 
                       alt="Food"
                     />
                   </div>
                   
                   {visit.comment && <p className="text-sm text-gray-300 italic mb-1">"{visit.comment}"</p>}
                </div>
             </div>
           ))}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-600 font-mono">Generated by GastroMap</p>
        </div>
      </div>
    </>
  );
};

export default RestaurantDetail;
