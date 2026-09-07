/**
 * Living Glass Runtime v1 — Motion Tokens
 *
 * Semantic durations and easing curves.
 */

import { Easing } from 'react-native';

export const motionTokens = {
    duration: {
        instant: 0,
        fast: 100,
        normal: 180,
        expressive: 220,
        unfold: 320,
    },
    easing: {
        linear: Easing.linear,
        easeOut: Easing.out(Easing.quad),
        easeInOut: Easing.inOut(Easing.ease),
        bezierStandard: Easing.bezier(0.4, 0.0, 0.2, 1),
        bezierEmphasized: Easing.bezier(0.2, 0.0, 0.0, 1),
    },
};

export default motionTokens;
