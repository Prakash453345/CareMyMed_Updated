/**
 * Living Glass Runtime v1 — Spring Tokens
 *
 * Physical spring configuration presets.
 */

export const springTokens = {
    gentle: {
        damping: 18,
        stiffness: 120,
        mass: 1,
        overshootClamping: false,
    },
    responsive: {
        damping: 14,
        stiffness: 180,
        mass: 0.8,
        overshootClamping: false,
    },
    settle: {
        damping: 22,
        stiffness: 200,
        mass: 1,
        overshootClamping: true,
    },
};

export default springTokens;
