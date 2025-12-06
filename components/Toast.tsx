import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map, ArrowRight, MapPin } from 'lucide-react';

interface ToastProps {
  message: string;
  mapName?: string;
  isVisible: boolean;
  onHide: () => void;
  duration?: number;
  isMapSwitch?: boolean; // New prop to trigger glass blur effect
}

export const Toast: React.FC<ToastProps> = ({
  message,
  mapName,
  isVisible,
  onHide,
  duration = 2000,
  isMapSwitch = false
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      // Trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(true);
        });
      });

      const hideTimer = setTimeout(() => {
        setIsAnimatingIn(false);
        setIsAnimatingOut(true);
        setTimeout(() => {
          setShouldRender(false);
          setIsAnimatingOut(false);
          onHide();
        }, 350);
      }, duration);

      return () => clearTimeout(hideTimer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [isVisible, duration, onHide]);

  if (!shouldRender) return null;

  // Glass blur centered toast for map switches
  if (isMapSwitch) {
    const glassToast = (
      <div 
        className={`fixed inset-0 z-[300] flex items-center justify-center ${
          isAnimatingOut ? 'animate-glass-blur-out' : 'animate-glass-blur-in'
        }`}
        style={{ 
          backdropFilter: isAnimatingIn ? 'blur(12px)' : 'blur(0px)',
          WebkitBackdropFilter: isAnimatingIn ? 'blur(12px)' : 'blur(0px)',
          background: isAnimatingIn ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          transition: 'backdrop-filter 0.3s ease, background 0.3s ease'
        }}
      >
        <div
          className={`
            flex flex-col items-center gap-4 px-8 py-6
            bg-gradient-to-br from-gray-800/90 to-gray-900/90
            backdrop-blur-xl border border-gray-600/50
            rounded-2xl shadow-2xl
            max-w-[85vw]
            ${isAnimatingOut ? 'animate-toast-float-out' : isAnimatingIn ? 'animate-toast-float-in' : 'opacity-0 scale-90'}
          `}
        >
          {/* Icon */}
          <div className="p-4 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-2xl border border-blue-400/20">
            <MapPin size={32} className="text-blue-400" />
          </div>
          
          {/* Message */}
          <div className="text-center">
            <p className="text-white text-lg font-medium mb-1">{message}</p>
            {mapName && (
              <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                <ArrowRight size={14} />
                <span className="font-medium">{mapName}</span>
              </div>
            )}
          </div>
          
          {/* Subtle loading indicator */}
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );

    return createPortal(glassToast, document.body);
  }

  // Standard bottom toast for other messages
  const toast = (
    <div className="fixed bottom-24 inset-x-0 z-[200] pointer-events-none flex items-center justify-center">
      <div
        className={`
          flex items-center gap-3 px-5 py-3.5
          bg-gradient-to-r from-gray-800/95 to-gray-900/95 
          backdrop-blur-xl border border-gray-600/50
          rounded-2xl shadow-2xl
          transition-all duration-300 ease-out
          ${isAnimatingIn
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-6 scale-95'
          }
        `}
      >
        <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-400/20">
          <Map size={20} className="text-blue-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-white text-sm font-medium">{message}</span>
          {mapName && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-0.5">
              <ArrowRight size={12} />
              <span className="font-medium">{mapName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(toast, document.body);
};
