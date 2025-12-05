
import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, MapPin, Share2, User, Trash2, Pencil, Loader2, ExternalLink, Languages } from 'lucide-react';
import { Restaurant, Visit, GUEST_ID } from '../types';
import { getGradeColor, calculateAverageGrade } from '../utils/rating';
import html2canvas from 'html2canvas';
import ImageSlider from './ImageSlider';
import { useLanguage, translateText } from '../hooks/useLanguage';
import {
  SWIPE_UP_THRESHOLD,
  SWIPE_DOWN_THRESHOLD,
  MODAL_TRANSITION_DURATION,
  DRAG_RESET_DELAY,
  CLOSE_ANIMATION_DURATION,
  MOBILE_BREAKPOINT
} from '../constants';

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
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'timeline' | 'info'>('timeline');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareBase64Map, setShareBase64Map] = useState<Record<string, string>>({});
  const shareRef = useRef<HTMLDivElement>(null);
  
  // Translation state for comments
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [translatingComments, setTranslatingComments] = useState<Record<string, boolean>>({});
  const [showTranslated, setShowTranslated] = useState<Record<string, boolean>>({});
  
  // Animation & Drag State
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingDown, setIsClosingDown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const startYRef = useRef<number>(0);
  
  const sortedVisits = [...restaurant.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Handle comment translation
  const handleTranslateComment = async (visitId: string, comment: string) => {
    if (translatedComments[visitId]) {
      // Toggle between original and translated
      setShowTranslated(prev => ({ ...prev, [visitId]: !prev[visitId] }));
      return;
    }
    
    setTranslatingComments(prev => ({ ...prev, [visitId]: true }));
    try {
      const targetLang = language === 'en' ? 'zh' : 'en';
      const translated = await translateText(comment, targetLang);
      setTranslatedComments(prev => ({ ...prev, [visitId]: translated }));
      setShowTranslated(prev => ({ ...prev, [visitId]: true }));
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslatingComments(prev => ({ ...prev, [visitId]: false }));
    }
  };

  const handleClose = (direction: 'right' | 'down' = 'right') => {
    if (direction === 'down') setIsClosingDown(true);
    setIsClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_DURATION);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
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

    // Allow both up and down dragging
    if (!isExpanded && diff < 0) {
      // Dragging up when not expanded - allow expansion
      setDragY(diff);
    } else if (diff > 0) {
      // Dragging down - allow closing
      setDragY(diff);
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);

    // Haptic feedback helper
    const vibrate = (duration: number = 10) => {
      if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    };

    // Swipe up to expand (when not already expanded)
    if (!isExpanded && dragY < SWIPE_UP_THRESHOLD) {
      vibrate(15); // Subtle haptic feedback
      setDragY(0);
      setTimeout(() => {
        setIsExpanding(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsExpanded(true);
            setTimeout(() => {
              setIsExpanding(false);
            }, MODAL_TRANSITION_DURATION);
          });
        });
      }, DRAG_RESET_DELAY);
    }
    // Swipe down from expanded (100%) - collapse to 80% first
    else if (isExpanded && dragY > SWIPE_DOWN_THRESHOLD) {
      vibrate(15); // Subtle haptic feedback
      setDragY(0);
      setIsExpanded(false);
      setTimeout(() => {
        setIsExpanding(false);
      }, MODAL_TRANSITION_DURATION);
    }
    // Swipe down from partial (80%) - close completely
    else if (!isExpanded && dragY > SWIPE_DOWN_THRESHOLD) {
      vibrate(20); // Slightly stronger feedback for close
      setTimeout(() => handleClose('down'), 100);
    }
    // Snap back if threshold not met
    else {
      setDragY(0);
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
              text: `Check out my experience at ${restaurant.name} on TraceBook!`
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
    if (window.confirm(t('confirmDeleteExperience'))) {
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
      {/* Backdrop - click to close */}
      <div
        className={`fixed inset-0 bg-black/40 z-10 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={() => handleClose('down')}
      />

      <div
        className={`absolute left-0 right-0 sm:h-full sm:top-0 sm:left-auto sm:right-0 sm:w-[400px] bg-gray-900 border-t sm:border-t-0 sm:border-l border-gray-800 shadow-2xl z-20 flex flex-col ${isExpanded ? 'rounded-none' : 'rounded-t-2xl'} sm:rounded-none ${animationClass}`}
        style={{
          // Use bottom positioning with height for smooth animation
          bottom: window.innerWidth < MOBILE_BREAKPOINT ? 0 : 'auto',
          top: window.innerWidth < MOBILE_BREAKPOINT ? 'auto' : 0,
          height: window.innerWidth < MOBILE_BREAKPOINT ? ((isExpanding || isExpanded) ? '100%' : '80%') : '100%',
          transform: isDragging ? `translateY(${dragY}px)` : 'translateY(0)',
          transition: isDragging
            ? 'none'
            : `height ${MODAL_TRANSITION_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1), border-radius ${MODAL_TRANSITION_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1), transform ${CLOSE_ANIMATION_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          willChange: 'height, transform'
        }}
      >
        
        {/* Draggable Area - Header + Stats */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Header - Banner Image */}
          <div
            className={`relative h-32 sm:h-48 bg-gray-800 ${isExpanded ? 'rounded-none' : 'rounded-t-2xl'} sm:rounded-none overflow-hidden`}
          >
            {/* Drag Handle for Mobile - changes based on expand state */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-gray-400/50 rounded-full z-30 sm:hidden transition-all duration-300"></div>
            {!isExpanded && (
              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-[10px] text-gray-500 z-30 sm:hidden pointer-events-none">
                {language === 'zh' ? '上滑展开' : 'Swipe up to expand'}
              </div>
            )}

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
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
                <MapPin size={12} />
                <span className="truncate">{restaurant.address}</span>
              </div>
            </div>
          </div>

          {/* Stats Bar - Also part of draggable area */}
          <div className="flex border-b border-gray-800 bg-gray-900/50 backdrop-blur">
            <div className="flex-1 p-3 text-center border-r border-gray-800">
              <span className="block text-lg font-bold text-white">{restaurant.visits.length}</span>
              <span className="text-xs text-gray-500 uppercase">{language === 'zh' ? '访问' : 'Visits'}</span>
            </div>
            <div className="flex-1 p-3 text-center">
              <span className={`block text-lg font-bold ${getGradeColor(avgGrade)}`}>
                {avgGrade}
              </span>
              <span className="text-xs text-gray-500 uppercase">{language === 'zh' ? '平均评分' : 'Avg Grade'}</span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-800 bg-gray-900">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'timeline' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {language === 'zh' ? '时间线' : 'Timeline'}
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'info' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {language === 'zh' ? '详情' : 'Info'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <>
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('memories')}</h3>
                  <button 
                    onClick={handleShareAsImage} 
                    disabled={isGeneratingShare}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs bg-blue-900/20 px-2 py-1 rounded transition disabled:opacity-50"
                  >
                    {isGeneratingShare ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                    {language === 'zh' ? '分享卡片' : 'Share Card'}
                  </button>
              </div>

              {restaurant.visits.length === 0 ? (
                 <div className="text-center text-gray-500 py-10">
                   <p>{t('noExperiences')}</p>
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

                        {/* Rating Overlay (Bottom Right of Image) - Bigger Size */}
                        <div className={`absolute bottom-2 right-2 z-20 w-16 h-16 flex items-center justify-center rounded-xl shadow-lg font-black text-4xl text-white border border-white/20 backdrop-blur-md bg-black/50 ${getGradeColor(visit.rating)}`}>
                          {visit.rating}
                        </div>

                        {/* User Profile (Bottom Left of Image) */}
                        {visit.creatorName && (
                          <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-md pl-1 pr-3 py-1 rounded-full flex items-center gap-2 max-w-[70%] border border-white/10 pointer-events-none">
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
                        {visit.comment && (
                          <div className="mb-2">
                            <p className="text-gray-300 text-sm">
                              "{showTranslated[visit.id] && translatedComments[visit.id] 
                                ? translatedComments[visit.id] 
                                : visit.comment}"
                            </p>
                            <button
                              onClick={() => handleTranslateComment(visit.id, visit.comment!)}
                              disabled={translatingComments[visit.id]}
                              className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-400 transition-colors"
                            >
                              {translatingComments[visit.id] ? (
                                <>
                                  <Loader2 size={10} className="animate-spin" />
                                  {t('translating')}
                                </>
                              ) : (
                                <>
                                  <Languages size={10} />
                                  {showTranslated[visit.id] && translatedComments[visit.id] 
                                    ? t('showOriginal')
                                    : t('translate')}
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                           <Calendar size={12} />
                           <span>{formatDate(visit.date)}</span>
                        </div>
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
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                   {language === 'zh' ? '位置详情' : 'Location Details'}
                 </h3>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="text-xs text-gray-500">{language === 'zh' ? '名称' : 'Name'}</label>
                     <p className="text-white font-medium">{restaurant.name}</p>
                   </div>
                   
                   <div>
                     <label className="text-xs text-gray-500">{language === 'zh' ? '地址' : 'Address'}</label>
                     <p className="text-white font-medium">{restaurant.address}</p>
                   </div>

                   <div>
                      <label className="text-xs text-gray-500">{language === 'zh' ? '坐标' : 'Coordinates'}</label>
                      <p className="text-gray-400 font-mono text-xs">
                        {restaurant.location.lat.toFixed(5)}, {restaurant.location.lng.toFixed(5)}
                      </p>
                   </div>

                   <button 
                     onClick={handleOpenGoogleMaps}
                     className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition border border-gray-600"
                   >
                     <MapPin size={18} />
                     {language === 'zh' ? '在 Google 地图中打开' : 'Open in Google Maps'}
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
            {currentUserUid !== GUEST_ID && (
              <button 
                onClick={onAddAnotherVisit}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition"
              >
                {language === 'zh' ? '在此添加另一个记忆' : 'Add Another Visit Here'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden Share Card Render - Redesigned for Viral Marketing */}
      <div
        ref={shareRef}
        className="fixed top-0 left-[-9999px] w-[400px] text-white overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        {/* Gradient Background */}
        <div className="relative" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

          {/* Hero Section with Featured Photo */}
          <div className="relative h-[280px] overflow-hidden">
            {/* Background Photo with Overlay */}
            {sortedVisits[0]?.photoDataUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${shareBase64Map[sortedVisits[0].photoDataUrl] || sortedVisits[0].photoDataUrl})`,
                  filter: 'brightness(0.6)'
                }}
              />
            )}

            {/* Gradient Overlay */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(26,26,46,0.95) 100%)' }}
            />

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex flex-col justify-end p-6 pb-8">
              {/* App Logo & Branding */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <span className="text-white font-bold text-sm">TB</span>
                </div>
                <span className="text-white/90 font-semibold text-sm tracking-wide">TraceBook</span>
              </div>

              {/* Grade Badge */}
              <div
                className="absolute top-4 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <span className={`text-3xl font-black ${getGradeColor(avgGrade)}`}>{avgGrade}</span>
              </div>

              {/* Restaurant Name & Location */}
              <h1 className="text-2xl font-bold text-white leading-tight mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-1.5 text-white/70 text-sm">
                <MapPin size={14} className="flex-shrink-0" />
                <span className="truncate">{restaurant.address}</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex mx-6 -mt-4 relative z-20 rounded-xl overflow-hidden shadow-lg" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="flex-1 py-4 text-center border-r" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <span className="block text-2xl font-bold text-white">{restaurant.visits.length}</span>
              <span className="text-xs text-white/60 uppercase tracking-wider">{language === 'zh' ? '次访问' : 'Visits'}</span>
            </div>
            <div className="flex-1 py-4 text-center">
              <span className={`block text-2xl font-bold ${getGradeColor(avgGrade)}`}>{avgGrade}</span>
              <span className="text-xs text-white/60 uppercase tracking-wider">{language === 'zh' ? '评分' : 'Rating'}</span>
            </div>
          </div>

          {/* Latest Experiences Preview */}
          <div className="p-6 pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{language === 'zh' ? '最新体验' : 'Latest Experiences'}</h3>
              <span className="text-xs text-white/50">{sortedVisits.length} {language === 'zh' ? '条记录' : 'memories'}</span>
            </div>

            {/* Experience Cards - Show max 2 */}
            <div className="space-y-3">
              {sortedVisits.slice(0, 2).map((visit, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {/* Photo Thumbnail */}
                  <div
                    className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: `url(${shareBase64Map[visit.photoDataUrl] || visit.photoDataUrl})`,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {visit.creatorPhotoURL && (
                          <img
                            src={visit.creatorPhotoURL}
                            className="w-4 h-4 rounded-full border border-white/20"
                          />
                        )}
                        <span className="text-xs text-white/80 font-medium truncate">{visit.creatorName || 'Anonymous'}</span>
                      </div>
                      <span className={`text-sm font-bold ${getGradeColor(visit.rating)}`}>{visit.rating}</span>
                    </div>

                    {visit.comment && (
                      <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">"{visit.comment}"</p>
                    )}

                    <span className="text-[10px] text-white/40 mt-1 block">{formatDate(visit.date)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* More indicator if there are more visits */}
            {sortedVisits.length > 2 && (
              <div className="text-center mt-3">
                <span className="text-xs text-white/50">+{sortedVisits.length - 2} {language === 'zh' ? '更多体验' : 'more experiences'}</span>
              </div>
            )}
          </div>

          {/* Call to Action with QR Code */}
          <div
            className="mx-6 mb-4 p-4 rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.25) 0%, rgba(118,75,162,0.25) 100%)', border: '1px solid rgba(102,126,234,0.3)' }}
          >
            <div className="flex items-center gap-4">
              {/* QR Code */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=https://TraceMap.ca&bgcolor=ffffff&color=000000&margin=0"
                    alt="QR Code"
                    className="w-14 h-14"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
              {/* Text Content */}
              <div className="flex-1 text-left">
                <p className="text-sm text-white font-semibold mb-1">
                  {language === 'zh' ? '扫码加入 TraceBook' : 'Scan to join TraceBook'}
                </p>
                <p className="text-xs text-white/70 leading-relaxed">
                  {language === 'zh'
                    ? '发现美食，分享体验'
                    : 'Discover great food, share experiences'}
                </p>
                <p className="text-[10px] text-white/50 mt-1 font-medium">TraceMap.ca</p>
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="px-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <span className="text-white font-bold text-[10px]">TB</span>
              </div>
              <span className="text-white/60 text-xs font-medium">TraceMap.ca</span>
            </div>
            <span className="text-[10px] text-white/40">{language === 'zh' ? '记录美好体验' : 'Map Your Memories'}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default RestaurantDetail;
