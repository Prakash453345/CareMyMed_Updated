import React, { createContext, useContext, useState, useCallback } from 'react';
import { TourService } from '../lib/TourService';

const GuideContext = createContext({
  activeTourKey: null,
  currentStepId: null,
  currentStep: null,
  stepIndex: 0,
  steps: [],
  isTourActive: false,
  startTour: (tourKey, steps) => {},
  nextStep: () => {},
  skipTour: () => {},
});

export function GuideProvider({ children }) {
  const [activeTourKey, setActiveTourKey] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = useCallback(async (tourKey, tourSteps) => {
    if (!tourSteps || tourSteps.length === 0) return;
    const isSeen = await TourService.isTourSeen(tourKey);
    if (isSeen) return;
    setActiveTourKey(tourKey);
    setSteps(tourSteps);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(async () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      if (activeTourKey) {
        await TourService.markTourSeen(activeTourKey);
      }
      setActiveTourKey(null);
      setSteps([]);
      setStepIndex(0);
    }
  }, [stepIndex, steps.length, activeTourKey]);

  const skipTour = useCallback(async () => {
    if (activeTourKey) {
      await TourService.markTourSeen(activeTourKey);
    }
    setActiveTourKey(null);
    setSteps([]);
    setStepIndex(0);
  }, [activeTourKey]);

  const currentStep = steps[stepIndex] || null;
  const currentStepId = currentStep?.id || currentStep?.target || (currentStep ? `step_${stepIndex}` : null);
  const isTourActive = !!activeTourKey && steps.length > 0;

  return (
    <GuideContext.Provider
      value={{
        activeTourKey,
        currentStepId,
        currentStep,
        stepIndex,
        steps,
        isTourActive,
        startTour,
        nextStep,
        skipTour,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  return useContext(GuideContext);
}
