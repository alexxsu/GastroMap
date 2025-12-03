import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageSliderProps {
  photos: string[];
}

const ImageSlider: React.FC<ImageSliderProps> = ({ photos }) => {
  const [index, setIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // Use Refs for touch tracking to avoid state update lag during gestures
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  if (!photos || photos.length === 0) return <div className="h-48 bg-gray-800" />;

  const canGoNext = index < photos.length - 1;
  const canGoPrev = index > 0;

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canGoNext) {
      setIndex((prev) => prev + 1);
    }
  };

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canGoPrev) {
      setIndex((prev) => prev - 1);
    }
  };

  const handleLightboxClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsClosing(true);
    setTimeout(() => {
      setIsLightboxOpen(false);
      setIsClosing(false);
    }, 200); // Duration matches CSS scaleOut animation
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (e.key === 'ArrowRight') {
        if (index < photos.length - 1) setIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        if (index > 0) setIndex(prev => prev - 1);
      } else if (e.key === 'Escape') {
        handleLightboxClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, photos.length, index]);

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
    isDraggingRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
    if (touchStartRef.current && Math.abs(touchEndRef.current - touchStartRef.current) > 10) {
      isDraggingRef.current = true;
    }
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const minSwipeDistance = 50;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && index < photos.length - 1) {
      setIndex((prev) => prev + 1);
    } else if (isRightSwipe && index > 0) {
      setIndex((prev) => prev - 1);
    }
    
    // Reset refs after a short delay to allow onClick to check isDragging
    setTimeout(() => {
      touchStartRef.current = null;
      touchEndRef.current = null;
      isDraggingRef.current = false;
    }, 100);
  };

  const handleContainerClick = () => {
    // Only open lightbox if we weren't dragging/swiping
    if (!isDraggingRef.current) {
      setIsLightboxOpen(true);
    }
  };

  return (
    <>
      <div 
        className="h-48 w-full relative group overflow-hidden bg-gray-900 cursor-zoom-in touch-pan-y"
        onClick={handleContainerClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Carousel Container */}
        <div 
          className="flex h-full transition-transform duration-500"
          style={{ 
            transform: `translateX(-${index * 100}%)`,
            transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)' 
          }}
        >
          {photos.map((photo, i) => (
            <img 
              key={i}
              src={photo} 
              className="w-full h-full object-cover flex-shrink-0 select-none pointer-events-none" 
              alt={`Food ${i + 1}`} 
              loading="lazy"
            />
          ))}
        </div>
        
        {photos.length > 1 && (
          <>
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
              <div className="pointer-events-auto">
                {canGoPrev && (
                  <button onClick={prev} className="bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur-sm transition transform active:scale-95">
                    <ChevronLeft size={20} />
                  </button>
                )}
              </div>
              <div className="pointer-events-auto">
                {canGoNext && (
                  <button onClick={next} className="bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur-sm transition transform active:scale-95">
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20 pointer-events-none">
               {photos.map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all duration-300 ${i === index ? 'bg-white w-3' : 'bg-white/40'}`} />
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
          className={`fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
          onClick={handleLightboxClose}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Close Button - Top Right (Fixed Position) */}
          <button 
             className="absolute top-4 right-4 z-[60] p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer hover:scale-105"
             onClick={handleLightboxClose}
          >
            <X size={32} />
          </button>

          {/* Navigation - Left */}
          {photos.length > 1 && canGoPrev && (
             <button 
               onClick={prev} 
               className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95"
             >
               <ChevronLeft size={40} />
             </button>
          )}

           {/* Navigation - Right */}
          {photos.length > 1 && canGoNext && (
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
              className="flex h-full transition-transform duration-500"
              style={{ 
                transform: `translateX(-${index * 100}%)`,
                transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            >
              {photos.map((photo, i) => (
                <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 md:p-12">
                   <img 
                     src={photo} 
                     className="max-w-full max-h-full object-contain shadow-2xl select-none cursor-zoom-out"
                     alt={`Full view ${i + 1}`}
                     loading="lazy"
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

export default ImageSlider;