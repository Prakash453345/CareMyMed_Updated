import React, { useState, useEffect } from 'react';
import GuideOverlay from './GuideOverlay';
import { useGuide } from '../../context/GuideContext';
import { TourService } from '../../lib/TourService';

export default function GuidedTour({
  visible,
  steps = [],
  tourKey,
  onClose,
}) {
  const guideContext = useGuide();
  const [localStepIndex, setLocalStepIndex] = useState(0);

  const isContextActive = guideContext.isTourActive;
  const isVisible = visible !== undefined ? visible : isContextActive;
  const activeSteps = steps && steps.length > 0 ? steps : guideContext.steps;
  const stepIndex = steps && steps.length > 0 ? localStepIndex : guideContext.stepIndex;

  useEffect(() => {
    if (visible && steps && steps.length > 0 && tourKey) {
      guideContext.startTour(tourKey, steps);
    }
  }, [visible, steps, tourKey]);

  if (!isVisible || !activeSteps || activeSteps.length === 0) return null;

  const handleNext = () => {
    if (steps && steps.length > 0) {
      if (localStepIndex < steps.length - 1) {
        setLocalStepIndex(prev => prev + 1);
      } else {
        if (tourKey) TourService.markTourSeen(tourKey);
        if (onClose) onClose();
      }
    } else {
      guideContext.nextStep();
    }
  };

  const handleSkip = () => {
    if (tourKey) TourService.markTourSeen(tourKey);
    if (onClose) onClose();
    if (guideContext.skipTour) guideContext.skipTour();
  };

  return (
    <GuideOverlay
      visible={isVisible}
      steps={activeSteps}
      stepIndex={stepIndex}
      onNext={handleNext}
      onSkip={handleSkip}
    />
  );
}
