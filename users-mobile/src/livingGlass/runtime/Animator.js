/**
 * Living Glass Runtime v1 — Animator
 *
 * Executes Reanimated / RN Animated driver & handles interruption cancellation.
 */

import { Animated, Easing } from 'react-native';

export class Animator {
    static animatePhases(animValue, duration, onComplete) {
        animValue.setValue(0);
        const animation = Animated.timing(animValue, {
            toValue: 1,
            duration,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true,
        });

        animation.start(({ finished }) => {
            if (finished) {
                onComplete?.();
            }
        });

        return () => {
            animation.stop();
        };
    }
}

export default Animator;
