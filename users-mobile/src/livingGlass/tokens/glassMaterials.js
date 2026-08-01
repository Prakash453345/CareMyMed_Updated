/**
 * Living Glass Runtime v1 — Glass Materials & Accent Tokens
 */

export const glassMaterials = {
    backdrop: {
        blurIntensity: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    diffusion: {
        light: {
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'rgba(255, 255, 255, 0.6)',
            borderWidth: 1,
        },
        violet: {
            backgroundColor: 'rgba(245, 243, 255, 0.9)',
            borderColor: 'rgba(196, 181, 253, 0.5)',
            borderWidth: 1.5,
        },
    },
    accents: {
        violet: {
            core: '#8B5CF6',
            innerGlow: '#A78BFA',
            outerGlow: '#C4B5FD',
            label: 'Balanced State',
        },
        emerald: {
            core: '#10B981',
            innerGlow: '#34D399',
            outerGlow: '#A7F3D0',
            label: 'Adherence 100%',
        },
        amber: {
            core: '#F59E0B',
            innerGlow: '#FBBF24',
            outerGlow: '#FDE68A',
            label: 'Attention Needed',
        },
    },
    shadows: {
        subtle: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
        },
        floating: {
            shadowColor: '#8B5CF6',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 18,
            elevation: 8,
        },
    },
};

export default glassMaterials;
