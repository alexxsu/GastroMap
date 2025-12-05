import React, { useState, useEffect, useCallback } from 'react';
import { X, GraduationCap, ChevronRight, Check, MapPin, Filter, Menu, Layers, Users, Search } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export type TutorialStep = 
  | 'welcome'
  | 'map_overview'
  | 'search_bar'
  | 'filter_button'
  | 'side_menu'
  | 'map_pill'
  | 'map_controls'
  | 'add_button'
  | 'shared_maps'
  | 'complete';

interface TutorialProps {
  isActive: boolean;
  onClose: () => void;
  onStepChange?: (step: TutorialStep) => void;
}

interface StepConfig {
  id: TutorialStep;
  targetSelector?: string;
  icon: React.ReactNode;
  requiresClick?: boolean;
}

export const Tutorial: React.FC<TutorialProps> = ({
  isActive,
  onClose,
  onStepChange
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const steps: StepConfig[] = [
    { id: 'welcome', icon: <GraduationCap size={32} /> },
    { id: 'map_overview', icon: <MapPin size={24} /> },
    { id: 'search_bar', targetSelector: '[data-tutorial="search-bar"]', icon: <Search size={24} />, requiresClick: true },
    { id: 'filter_button', targetSelector: '[data-tutorial="filter-button"]', icon: <Filter size={24} />, requiresClick: true },
    { id: 'side_menu', targetSelector: '[data-tutorial="menu-button"]', icon: <Menu size={24} />, requiresClick: true },
    { id: 'map_pill', targetSelector: '[data-tutorial="map-pill"]', icon: <Layers size={24} />, requiresClick: true },
    { id: 'map_controls', targetSelector: '[data-tutorial="map-controls"]', icon: <MapPin size={24} /> },
    { id: 'add_button', targetSelector: '[data-tutorial="add-button"]', icon: <MapPin size={24} /> },
    { id: 'shared_maps', icon: <Users size={24} /> },
    { id: 'complete', icon: <Check size={32} /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const currentConfig = steps[currentStepIndex];

  // Fade in animation on mount
  useEffect(() => {
    if (isActive) {
      // Small delay for smooth fade in
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      setCurrentStep('welcome');
    }
  }, [isActive]);

  // Update highlight position when step changes
  useEffect(() => {
    if (!isActive) return;

    const updateHighlight = () => {
      if (currentConfig?.targetSelector) {
        const element = document.querySelector(currentConfig.targetSelector);
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
        } else {
          setHighlightRect(null);
        }
      } else {
        setHighlightRect(null);
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [currentStep, isActive, currentConfig]);

  // Notify parent of step changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(steps[currentStepIndex + 1].id);
        setIsTransitioning(false);
      }, 200);
    }
  }, [currentStepIndex, steps]);

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  // Handle click on highlighted area
  const handleHighlightClick = () => {
    if (currentConfig?.requiresClick) {
      // Trigger actual click on the element
      if (currentConfig.targetSelector) {
        const element = document.querySelector(currentConfig.targetSelector) as HTMLElement;
        if (element) {
          element.click();
        }
      }
      // Move to next step after a short delay
      setTimeout(goToNextStep, 400);
    }
  };

  if (!isActive) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <GraduationCap size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t('tutorialWelcome')}</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">{t('tutorialWelcomeDesc')}</p>
            <button
              onClick={goToNextStep}
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              {t('tutorialStart')}
              <ChevronRight size={18} />
            </button>
          </div>
        );

      case 'map_overview':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <MapPin size={28} className="text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialMapOverview')}</h3>
            <p className="text-gray-300 mb-6">{t('tutorialMapOverviewDesc')}</p>
            <button
              onClick={goToNextStep}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'search_bar':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Search size={28} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialSearchBar')}</h3>
            <p className="text-gray-300 mb-4">{t('tutorialSearchBarDesc')}</p>
            <p className="text-blue-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
          </div>
        );

      case 'filter_button':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Filter size={28} className="text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialFilter')}</h3>
            <p className="text-gray-300 mb-4">{t('tutorialFilterDesc')}</p>
            <p className="text-purple-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
          </div>
        );

      case 'side_menu':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Menu size={28} className="text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialSideMenu')}</h3>
            <p className="text-gray-300 mb-4">{t('tutorialSideMenuDesc')}</p>
            <p className="text-orange-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
          </div>
        );

      case 'map_pill':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <Layers size={28} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialMapPill')}</h3>
            <p className="text-gray-300 mb-4">{t('tutorialMapPillDesc')}</p>
            <p className="text-cyan-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
          </div>
        );

      case 'map_controls':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-teal-500/20 rounded-full flex items-center justify-center">
              <MapPin size={28} className="text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialMapControls')}</h3>
            <p className="text-gray-300 mb-6">{t('tutorialMapControlsDesc')}</p>
            <button
              onClick={goToNextStep}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'add_button':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-3xl text-red-400">+</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialAddButton')}</h3>
            <p className="text-gray-300 mb-6">{t('tutorialAddButtonDesc')}</p>
            <button
              onClick={goToNextStep}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'shared_maps':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-pink-500/20 rounded-full flex items-center justify-center">
              <Users size={28} className="text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialSharedMaps')}</h3>
            <p className="text-gray-300 mb-6">{t('tutorialSharedMapsDesc')}</p>
            <button
              onClick={goToNextStep}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <Check size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t('tutorialComplete')}</h2>
            <p className="text-gray-300 mb-6">{t('tutorialCompleteDesc')}</p>
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('tutorialFinish')}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Calculate position for instruction card based on highlight
  const getCardPosition = () => {
    if (!highlightRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const cardHeight = 280;
    const cardWidth = Math.min(320, viewportWidth - 32);
    const padding = 16;

    const elementCenterY = highlightRect.top + highlightRect.height / 2;
    const elementCenterX = highlightRect.left + highlightRect.width / 2;

    let top, left;

    if (elementCenterY < viewportHeight / 2) {
      top = Math.min(highlightRect.bottom + padding, viewportHeight - cardHeight - padding);
    } else {
      top = Math.max(highlightRect.top - cardHeight - padding, padding);
    }

    left = Math.max(padding, Math.min(elementCenterX - cardWidth / 2, viewportWidth - cardWidth - padding));

    return { top: `${top}px`, left: `${left}px`, transform: 'none' };
  };

  const cardPosition = getCardPosition();

  return (
    <div 
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Dark overlay - blocks clicks except on highlighted area */}
      <div 
        className="absolute inset-0 bg-black/85 transition-opacity duration-300"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Cutout for highlighted element - allows interaction */}
      {highlightRect && (
        <div
          className="absolute bg-transparent cursor-pointer"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            borderRadius: 12,
            pointerEvents: 'auto',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)'
          }}
          onClick={currentConfig?.requiresClick ? handleHighlightClick : undefined}
        />
      )}

      {/* Highlight border animation */}
      {highlightRect && (
        <div
          className="absolute border-2 border-blue-400 rounded-xl animate-pulse"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            pointerEvents: 'none',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)'
          }}
        />
      )}

      {/* Skip button - smaller on mobile */}
      {currentStep !== 'complete' && (
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 z-[201] flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-white bg-gray-800/90 hover:bg-gray-700 rounded-lg transition-all duration-200 text-xs"
          style={{ pointerEvents: 'auto' }}
        >
          <X size={14} />
          <span className="hidden sm:inline">{t('tutorialSkip')}</span>
        </button>
      )}

      {/* Progress indicator */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div 
          className="absolute top-3 left-3 z-[201] flex items-center gap-1.5"
          style={{ pointerEvents: 'none' }}
        >
          {steps.slice(1, -1).map((step, index) => (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                index < currentStepIndex - 1
                  ? 'bg-blue-500 w-1.5'
                  : index === currentStepIndex - 1
                  ? 'bg-blue-400 w-3'
                  : 'bg-gray-600 w-1.5'
              }`}
            />
          ))}
        </div>
      )}

      {/* Instruction card */}
      <div
        className={`absolute z-[201] w-80 max-w-[calc(100vw-32px)] bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl p-5 transition-all duration-200 ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{ ...cardPosition, pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {renderStepContent()}
      </div>
    </div>
  );
};

// Tutorial button component
interface TutorialButtonProps {
  onClick: () => void;
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({ onClick }) => {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl group"
      title={t('tutorialButton')}
    >
      <GraduationCap size={22} className="group-hover:animate-bounce" />
    </button>
  );
};
