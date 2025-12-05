import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface AddButtonProps {
  isAddModalOpen: boolean;
  hideAddButton: boolean;
  isModalActive?: boolean;
  onToggle: () => void;
}

export const AddButton: React.FC<AddButtonProps> = ({
  isAddModalOpen,
  hideAddButton,
  isModalActive = false,
  onToggle
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  
  const shouldBeVisible = !hideAddButton && !isModalActive;
  
  useEffect(() => {
    if (shouldBeVisible) {
      // Show button
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      // Hide button with animation
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [shouldBeVisible, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div data-tutorial="add-button" className={`fixed bottom-8 inset-x-0 flex justify-center z-[60] pointer-events-none ${isAnimatingOut ? 'animate-fade-out-down' : 'animate-fade-in-up'}`}>
      <button
        onClick={onToggle}
        className={`pointer-events-auto group relative flex items-center justify-center w-16 h-16 rounded-full border backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out active:scale-95
          ${isAddModalOpen
            ? 'bg-red-500/80 border-red-400/50 shadow-red-500/20'
            : 'bg-gray-900/70 border-white/30 hover:bg-gray-900/80 hover:shadow-blue-500/20 hover:scale-105'
          }
        `}
        title={isAddModalOpen ? "Close" : "Add Memory"}
      >
        {!isAddModalOpen && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/30 via-red-400/20 to-blue-500/30 blur-md group-hover:opacity-80 group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
        )}
        <div className={`relative z-10 transition-transform duration-300 ${isAddModalOpen ? 'rotate-45' : ''}`}>
          {isAddModalOpen ? (
            <X size={28} className="text-white" strokeWidth={2.5} />
          ) : (
            <Plus size={28} className="text-white" strokeWidth={2.5} />
          )}
        </div>
      </button>
    </div>
  );
};
