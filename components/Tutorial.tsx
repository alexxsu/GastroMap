import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, GraduationCap, ChevronRight, Check, MapPin, Filter, Menu, Layers, Users, Search, Lock, Globe, UserPlus } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export type TutorialStep =
  | 'welcome'
  | 'map_overview'
  | 'search_bar'
  | 'filter_button'
  | 'side_menu'
  | 'map_pill'
  | 'map_management'
  | 'map_types'
  | 'map_controls'
  | 'add_button'
  | 'complete';

interface TutorialProps {
  isActive: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface StepConfig {
  id: TutorialStep;
  targetSelector?: string;
  requiresClick?: boolean;
  waitForInteraction?: boolean; // Wait for user to see the interaction result
  interactionDelay?: number; // How long to wait after click before moving to next step
}

export const Tutorial: React.FC<TutorialProps> = ({
  isActive,
  onClose,
  onComplete
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [highlightRect, setHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isWaitingForInteraction, setIsWaitingForInteraction] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Memoize steps array to prevent recreation on every render
  const steps: StepConfig[] = useMemo(() => [
    { id: 'welcome' },
    { id: 'map_overview' },
    { id: 'search_bar', targetSelector: '[data-tutorial="search-bar"]', requiresClick: true, waitForInteraction: true, interactionDelay: 1500 },
    { id: 'filter_button', targetSelector: '[data-tutorial="filter-button"]', requiresClick: true, waitForInteraction: true, interactionDelay: 2000 },
    { id: 'side_menu', targetSelector: '[data-tutorial="menu-button"]', requiresClick: true, waitForInteraction: true, interactionDelay: 1500 },
    { id: 'map_pill', targetSelector: '[data-tutorial="map-pill"]', requiresClick: true, waitForInteraction: true, interactionDelay: 1500 },
    { id: 'map_management' }, // Info about map management inside the modal
    { id: 'map_types' }, // Info about the 3 map types
    { id: 'map_controls', targetSelector: '[data-tutorial="map-controls"]' },
    { id: 'add_button', targetSelector: '[data-tutorial="add-button"]' },
    { id: 'complete' }
  ], []);

  const currentStepIndex = useMemo(() => steps.findIndex(s => s.id === currentStep), [steps, currentStep]);
  const currentConfig = steps[currentStepIndex];

  // Fade in animation on mount
  useEffect(() => {
    if (isActive) {
      // Small delay for smooth fade in
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setCurrentStep('welcome');
      setIsWaitingForInteraction(false);
    }
  }, [isActive]);

  // Get target selector for current step (memoized to prevent dep changes)
  const targetSelector = currentConfig?.targetSelector;

  // Update highlight position when step changes
  useEffect(() => {
    if (!isActive || !targetSelector) {
      setHighlightRect(null);
      return;
    }

    const updateHighlight = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Store as plain object to avoid DOMRect reference issues
        // Add extra padding for better visibility and touch targets
        const padding = 4;
        setHighlightRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2
        });
      } else {
        setHighlightRect(null);
      }
    };

    // Initial update with small delay to let DOM settle
    const initialTimer = setTimeout(updateHighlight, 100);

    // Update on resize/scroll
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);

    // Also update periodically in case elements move
    const intervalId = setInterval(updateHighlight, 500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [isActive, targetSelector]);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setIsTransitioning(true);
      setIsWaitingForInteraction(false);
      setTimeout(() => {
        setCurrentStep(steps[currentStepIndex + 1].id);
        setIsTransitioning(false);
      }, 200);
    }
  }, [currentStepIndex, steps]);

  const handleSkip = () => {
    setIsVisible(false);
    setIsWaitingForInteraction(false);
    setTimeout(onClose, 200);
  };

  const handleComplete = () => {
    setIsVisible(false);
    setIsWaitingForInteraction(false);
    // Mark tutorial as completed
    localStorage.setItem('tutorial_completed', 'true');
    setTimeout(() => {
      onClose();
      onCompleteRef.current?.();
    }, 200);
  };

  // Handle click on highlighted area - let the interaction happen first
  const handleHighlightClick = useCallback(() => {
    if (!currentConfig?.requiresClick || isWaitingForInteraction) return;

    // Trigger actual click on the element
    if (currentConfig.targetSelector) {
      const element = document.querySelector(currentConfig.targetSelector) as HTMLElement;
      if (element) {
        element.click();
      }
    }

    // If we need to wait for user to see the interaction result
    if (currentConfig.waitForInteraction) {
      setIsWaitingForInteraction(true);
      // Wait longer so user can see what the interaction does
      const delay = currentConfig.interactionDelay || 1500;
      setTimeout(goToNextStep, delay);
    } else {
      // Move to next step after a short delay
      setTimeout(goToNextStep, 400);
    }
  }, [currentConfig, goToNextStep, isWaitingForInteraction]);

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
            {isWaitingForInteraction ? (
              <p className="text-green-400 text-sm">{t('tutorialGreat')}</p>
            ) : (
              <p className="text-blue-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
            )}
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
            {isWaitingForInteraction ? (
              <p className="text-green-400 text-sm">{t('tutorialGreat')}</p>
            ) : (
              <p className="text-purple-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
            )}
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
            {isWaitingForInteraction ? (
              <p className="text-green-400 text-sm">{t('tutorialGreat')}</p>
            ) : (
              <p className="text-orange-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
            )}
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
            {isWaitingForInteraction ? (
              <p className="text-green-400 text-sm">{t('tutorialGreat')}</p>
            ) : (
              <p className="text-cyan-400 text-sm animate-pulse">{t('tutorialClickToTry')}</p>
            )}
          </div>
        );

      case 'map_management':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <Layers size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('tutorialMapManagement')}</h3>
            <p className="text-gray-300 mb-4">{t('tutorialMapManagementDesc')}</p>
            <button
              onClick={goToNextStep}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'map_types':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-4">{t('tutorialMapTypes')}</h3>
            <div className="space-y-3 mb-6 text-left">
              {/* Private Map */}
              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <Lock size={18} className="text-gray-300" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t('tutorialMapTypePrivate')}</p>
                  <p className="text-gray-400 text-xs">{t('tutorialMapTypePrivateDesc')}</p>
                </div>
              </div>
              {/* Shared Map (Owner) */}
              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                  <Globe size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t('tutorialMapTypeShared')}</p>
                  <p className="text-gray-400 text-xs">{t('tutorialMapTypeSharedDesc')}</p>
                </div>
              </div>
              {/* Joined Map */}
              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-green-600/30 flex items-center justify-center flex-shrink-0">
                  <UserPlus size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t('tutorialMapTypeJoined')}</p>
                  <p className="text-gray-400 text-xs">{t('tutorialMapTypeJoinedDesc')}</p>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-xs mb-4">{t('tutorialMapSwitch')}</p>
            <button
              onClick={goToNextStep}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              {t('tutorialNext')}
            </button>
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
    // Increase card height for map_types step which has more content
    const cardHeight = currentStep === 'map_types' ? 420 : 320;
    const cardWidth = Math.min(340, viewportWidth - 32);
    const padding = 20;

    const elementCenterY = highlightRect.top + highlightRect.height / 2;
    const elementCenterX = highlightRect.left + highlightRect.width / 2;
    const highlightBottom = highlightRect.top + highlightRect.height;

    let top, left;

    if (elementCenterY < viewportHeight / 2) {
      top = Math.min(highlightBottom + padding, viewportHeight - cardHeight - padding);
    } else {
      top = Math.max(highlightRect.top - cardHeight - padding, padding);
    }

    left = Math.max(padding, Math.min(elementCenterX - cardWidth / 2, viewportWidth - cardWidth - padding));

    return { top: `${top}px`, left: `${left}px`, transform: 'none' };
  };

  const cardPosition = getCardPosition();

  // Calculate highlight box dimensions with extra padding for touch targets
  const highlightPadding = 6;
  const highlightStyle = highlightRect ? {
    top: highlightRect.top - highlightPadding,
    left: highlightRect.left - highlightPadding,
    width: highlightRect.width + highlightPadding * 2,
    height: highlightRect.height + highlightPadding * 2,
  } : null;

  return (
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Dark overlay with cutout for highlighted element */}
      {highlightStyle ? (
        <>
          {/* Top overlay */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/85"
            style={{ height: highlightStyle.top, pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Bottom overlay */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/85"
            style={{ top: highlightStyle.top + highlightStyle.height, pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Left overlay */}
          <div
            className="absolute left-0 bg-black/85"
            style={{
              top: highlightStyle.top,
              width: highlightStyle.left,
              height: highlightStyle.height,
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Right overlay */}
          <div
            className="absolute right-0 bg-black/85"
            style={{
              top: highlightStyle.top,
              left: highlightStyle.left + highlightStyle.width,
              height: highlightStyle.height,
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Clickable cutout area */}
          <div
            className="absolute bg-transparent cursor-pointer"
            style={{
              ...highlightStyle,
              borderRadius: 12,
              pointerEvents: currentConfig?.requiresClick ? 'auto' : 'none',
            }}
            onClick={currentConfig?.requiresClick ? handleHighlightClick : undefined}
          />
        </>
      ) : (
        /* Full overlay when no highlight */
        <div
          className="absolute inset-0 bg-black/85 transition-opacity duration-300"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Highlight border animation */}
      {highlightStyle && (
        <div
          className="absolute border-2 border-blue-400 rounded-xl"
          style={{
            ...highlightStyle,
            pointerEvents: 'none',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
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
