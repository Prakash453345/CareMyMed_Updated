/**
 * Living Glass Runtime v1 — useHeroTransition Hook
 */

import { useRef, useCallback } from 'react';
import sharedRegistry from '../registry/SharedRegistry';
import TransitionController from '../runtime/TransitionController';
import Animator from '../runtime/Animator';

export function useHeroTransition(descriptor) {
    const animValue = useRef(new Animated.Value(0)).current;

    const startTransition = useCallback(async (onComplete) => {
        const prep = await TransitionController.prepareDescriptor(descriptor);
        if (!prep) {
            onComplete?.();
            return;
        }

        const cancel = Animator.animatePhases(animValue, prep.duration, () => {
            TransitionController.finish(prep.transitionId);
            onComplete?.();
        });

        return cancel;
    }, [descriptor, animValue]);

    return {
        animValue,
        startTransition,
    };
}

export default useHeroTransition;
