import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageWithPlaceholderProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onClick?: () => void;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export const ImageWithPlaceholder: React.FC<ImageWithPlaceholderProps> = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  onClick,
  objectFit = 'cover'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state when src changes
    setIsLoaded(false);
    setIsError(false);
    setShowPlaceholder(true);

    // Preload the image
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setIsLoaded(true);
      // Small delay before hiding placeholder for smooth transition
      setTimeout(() => setShowPlaceholder(false), 300);
    };
    
    img.onerror = () => {
      setIsError(true);
      setShowPlaceholder(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {/* Placeholder/Loading state */}
      {showPlaceholder && (
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          } ${placeholderClassName}`}
          style={{ backgroundColor: 'rgb(31, 41, 55)' }}
        >
          {isError ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <ImageIcon size={32} className="opacity-50" />
              <span className="text-xs">Failed to load</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              {/* Animated loading skeleton */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-3 border-gray-600 border-t-blue-500 animate-spin" />
                <ImageIcon size={20} className="absolute inset-0 m-auto text-gray-500" />
              </div>
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
          )}
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`w-full h-full transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ objectFit }}
        onLoad={() => {
          setIsLoaded(true);
          setTimeout(() => setShowPlaceholder(false), 300);
        }}
        onError={() => {
          setIsError(true);
          setShowPlaceholder(true);
        }}
      />
    </div>
  );
};

// Thumbnail version with smaller placeholder
interface ThumbnailWithPlaceholderProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export const ThumbnailWithPlaceholder: React.FC<ThumbnailWithPlaceholderProps> = ({
  src,
  alt,
  className = '',
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsError(true);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <div 
      className={`relative overflow-hidden bg-gray-700 ${className}`} 
      onClick={onClick}
    >
      {/* Loading/Error state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isError ? (
            <ImageIcon size={16} className="text-gray-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-600 border-t-blue-500 animate-spin" />
          )}
        </div>
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
      />
    </div>
  );
};

// Batch preloader for multiple images
export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve anyway to not block
        })
    )
  );
};

// Hook for preloading images
export const useImagePreloader = (urls: string[]) => {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (urls.length === 0) {
      setLoaded(true);
      setProgress(100);
      return;
    }

    let loadedCount = 0;
    setLoaded(false);
    setProgress(0);

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      
      const handleComplete = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / urls.length) * 100));
        if (loadedCount === urls.length) {
          setLoaded(true);
        }
      };

      img.onload = handleComplete;
      img.onerror = handleComplete;
    });
  }, [urls]);

  return { loaded, progress };
};
