import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Share2, User, Trash2, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { Restaurant, Visit, GUEST_ID } from '../types';
import { getGradeColor, gradeToScore, scoreToGrade } from '../utils/rating';
import html2canvas from 'html2canvas';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  currentUserUid?: string;
  onClose: () => void;
  onAddAnotherVisit: () => void;
  onDeleteVisit: (restaurant: Restaurant, visit: Visit) => void;
}

// Sub-component for Image Slider
const ImageSlider: React.FC<{ photos: string[] }> = ({ photos }) => {
  const [index, setIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!photos || photos.length === 0) return <div className="h-48 bg-gray-800" />;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % photos.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const openLightbox = (idx: number) => {
    setIndex(idx);
    setIsLightboxOpen(true);
  };

  const Lightbox = () => {
    if (!isLightboxOpen) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
        onClick={() => setIsLightboxOpen(false)}
      >
        {/* Main Image Container - Rendered FIRST but we rely on z-index for controls */}
        <div 
          className="w-full h-full p-2 md:p-8 flex items-center justify-center relative z-10" 
          onClick={(e) => e.stopPropagation()}
        >
           <img 
             src={photos[index]} 
             className="max-w-full max-h-full object-contain shadow-2xl"
             alt={`Full view ${index + 1}`}
           />
        </div>

        {/* Close Button - Rendered AFTER image container with higher Z to ensure clickability */}
        <button 
           className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition z-50 cursor-pointer"
           onClick={(e) => {
             e.stopPropagation();
             setIsLightboxOpen(false);
           }}
        >
          <X size={32} />
        </button>

        {/* Navigation Controls */}
        {photos.length > 1 && (
          <>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setIndex((prev) => (prev - 1 + photos.length) % photos.length);
               }} 
               className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition z-50 cursor-pointer"
             >
               <ChevronLeft size={32} />
             </button>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setIndex((prev) => (prev + 1) % photos.length);
               }} 
               className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition z-50 cursor-pointer"
             >
               <ChevronRight size={32} />
             </button>
             
             {/* Pagination Dots */}
             <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
                {photos.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/30'}`} />
                ))}
             </div>
          </>
        )}
      </div>,
      document.body
    );
  };

  return (
    <>
      <div 
        className="h-48 w-full relative group overflow-hidden bg-gray-900 cursor-zoom-in"
        onClick={() => openLightbox(index)}
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
      <Lightbox />
    </>
  );
};

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ 
  restaurant, 
  currentUserUid, 
  onClose, 
  onAddAnotherVisit,
  onDeleteVisit
}) => {
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  
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
      // Small delay to ensure render
      await new Promise(resolve => setTimeout(resolve, 100));

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
  const canDeleteVisit = (visit: Visit): boolean => {
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
  const sortedVisits = [...restaurant.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                    {/* Delete Button (Logic: Creator or Auth User deleting Guest post) */}
                    {canDeleteVisit(visit) && (
                      <button 
                        onClick={() => handleDelete(visit)}
                        className="absolute top-2 right-2 z-20 bg-red-600/80 hover:bg-red-500 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete this memory"
                      >
                        <Trash2 size={14} />
                      </button>
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

                    {visit.aiDescription && (
                      <div className="bg-indigo-900/20 border border-indigo-500/20 p-2 rounded-lg">
                        <p className="text-xs text-indigo-300 italic">✨ {visit.aiDescription}</p>
                      </div>
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
                     <img src={visit.photoDataUrl} className="w-full h-32 object-cover" crossOrigin="anonymous" />
                   </div>
                   
                   {visit.comment && <p className="text-sm text-gray-300 italic mb-1">"{visit.comment}"</p>}
                   {visit.aiDescription && <p className="text-[10px] text-indigo-400">✨ {visit.aiDescription}</p>}
                </div>
             </div>
           ))}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-600 font-mono">Generated by GastroMap AI</p>
        </div>
      </div>
    </>
  );
};

export default RestaurantDetail;