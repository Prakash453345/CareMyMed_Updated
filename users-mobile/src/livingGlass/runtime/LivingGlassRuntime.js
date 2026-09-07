/**
 * Living Glass Runtime v1 — LivingGlassRuntime
 *
 * Top-level runtime context owner linking Registry, Controllers, Scheduler, & LayerManager.
 */

import React, { createContext, useContext, useRef } from 'react';
import sharedRegistry from '../registry/SharedRegistry';
import transitionScheduler from './TransitionScheduler';
import LayerManager from './LayerManager';
import orbController from './OrbController';
import TransitionController from './TransitionController';
import Animator from './Animator';

const LivingGlassContext = createContext(null);

export function LivingGlassProvider({ children }) {
    const runtimeRef = useRef({
        registry: sharedRegistry,
        scheduler: transitionScheduler,
        layers: LayerManager,
        orb: orbController,
        controller: TransitionController,
        animator: Animator,
    });

    return (
        <LivingGlassContext.Provider value={runtimeRef.current}>
            {children}
        </LivingGlassContext.Provider>
    );
}

export function useLivingGlassRuntime() {
    const context = useContext(LivingGlassContext);
    if (!context) {
        // Fallback for calls outside provider
        return {
            registry: sharedRegistry,
            scheduler: transitionScheduler,
            layers: LayerManager,
            orb: orbController,
            controller: TransitionController,
            animator: Animator,
        };
    }
    return context;
}

export default LivingGlassProvider;
