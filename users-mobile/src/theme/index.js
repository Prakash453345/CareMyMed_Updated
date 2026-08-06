/**
 * CareMyMed Users App — Theme
 * Design tokens for the CareMyMed Users App
 * (Mirrors shared/theme/tokens.js — kept in-app for Metro bundler compatibility)
 */

export const colors = {
    // ─── Core Brand ────────────────────────────
    primary: '#7C3AED',
    primaryMid: '#6D28D9',
    primaryDark: '#5B21B6',
    primarySoft: '#FAF5FF',
    accent: '#C084FC',

    // ─── Surfaces ──────────────────────────────
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF2F7',

    // ─── Semantic ──────────────────────────────
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',

    // ─── Text ──────────────────────────────────
    textPrimary: '#1A202C',
    textSecondary: '#4A5568',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    textOnDark: '#F1F5F9',

    // ─── Borders ───────────────────────────────
    border: '#BDD4EE',
    borderLight: '#E2E8F0',
    divider: '#E2E8F0',

    // ─── Gradients ─────────────────────────────
    gradientPrimary: ['#6D28D9', '#7C3AED'],
    gradientAccent: ['#7C3AED', '#C084FC'],
    gradientSoft: ['#C084FC', '#F3E8FF'],

    // ─── Status Indicators ─────────────────────
    calledToday: '#22C55E',
    notCalled3Days: '#F59E0B',
    notCalled7Days: '#EF4444',

    // ─── Role Accents ──────────────────────────
    rolePatient: '#3A86FF',
    roleCaller: '#0A2463',
    roleManager: '#059669',
    roleOrgAdmin: '#6D28D9',
    roleSuperAdmin: '#7C3AED',
};

export const FONT = {
    regular: { fontFamily: 'PlusJakartaSans_400Regular' },
    medium: { fontFamily: 'PlusJakartaSans_500Medium' },
    semibold: { fontFamily: 'PlusJakartaSans_600SemiBold' },
    bold: { fontFamily: 'PlusJakartaSans_700Bold' },
    heavy: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
};

export const METRIC_FONT = {
    regular: { fontFamily: 'Inter_400Regular' },
    medium: { fontFamily: 'Inter_500Medium' },
    semibold: { fontFamily: 'Inter_600SemiBold' },
    bold: { fontFamily: 'Inter_700Bold' },
    heavy: { fontFamily: 'Inter_800ExtraBold' },
};

export const TEXT_SIZE = {
    display: 32,
    h1: 28,
    h2: 24,
    h3: 20,
    title: 18,
    body: 16,
    small: 14,
    caption: 12,
    tiny: 10,
};

export const TYPOGRAPHY = {
    display: {
        fontFamily: FONT.heavy.fontFamily,
        fontSize: TEXT_SIZE.display,
        lineHeight: 38,
        letterSpacing: -0.8,
    },
    h1: {
        fontFamily: FONT.bold.fontFamily,
        fontSize: TEXT_SIZE.h1,
        lineHeight: 34,
        letterSpacing: -0.5,
    },
    h2: {
        fontFamily: FONT.bold.fontFamily,
        fontSize: TEXT_SIZE.h2,
        lineHeight: 30,
        letterSpacing: -0.3,
    },
    h3: {
        fontFamily: FONT.semibold.fontFamily,
        fontSize: TEXT_SIZE.h3,
        lineHeight: 26,
    },
    title: {
        fontFamily: FONT.semibold.fontFamily,
        fontSize: TEXT_SIZE.title,
        lineHeight: 24,
    },
    body: {
        fontFamily: FONT.regular.fontFamily,
        fontSize: TEXT_SIZE.body,
        lineHeight: 24,
    },
    bodyMedium: {
        fontFamily: FONT.medium.fontFamily,
        fontSize: TEXT_SIZE.body,
        lineHeight: 24,
    },
    small: {
        fontFamily: FONT.regular.fontFamily,
        fontSize: TEXT_SIZE.small,
        lineHeight: 20,
    },
    caption: {
        fontFamily: FONT.medium.fontFamily,
        fontSize: TEXT_SIZE.caption,
        lineHeight: 18,
    },
    button: {
        fontFamily: FONT.semibold.fontFamily,
        fontSize: TEXT_SIZE.body,
        lineHeight: 22,
    },
    chip: {
        fontFamily: FONT.medium.fontFamily,
        fontSize: 13,
        lineHeight: 18,
    },

    // ── Metric Specific Typography (Inter) ──────
    metricLarge: {
        fontFamily: METRIC_FONT.heavy.fontFamily,
        fontSize: 32,
        lineHeight: 38,
        letterSpacing: -0.5,
    },
    metric: {
        fontFamily: METRIC_FONT.bold.fontFamily,
        fontSize: 20,
        lineHeight: 26,
    },
    metricSmall: {
        fontFamily: METRIC_FONT.semibold.fontFamily,
        fontSize: 14,
        lineHeight: 18,
    },
};

export const TEXT = {
    pageTitle:       { ...TYPOGRAPHY.h1, color: colors.textPrimary },
    sectionTitle:    { ...TYPOGRAPHY.h3, color: colors.textPrimary },
    bodyPrimary:     { ...TYPOGRAPHY.body, color: colors.textPrimary },
    bodySecondary:   { ...TYPOGRAPHY.body, color: colors.textSecondary },
    captionMuted:    { ...TYPOGRAPHY.caption, color: colors.textMuted },
    metricHero:      { ...TYPOGRAPHY.metricLarge, color: colors.textPrimary },
    metricSecondary: { ...TYPOGRAPHY.metric, color: colors.primary },
};

export const ICON_SIZE = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    screen: 20,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
};

export const typography = {
    fontFamily: 'PlusJakartaSans_400Regular',
    heading: { fontFamily: 'PlusJakartaSans_700Bold' },
    body: { fontFamily: 'PlusJakartaSans_400Regular' },
    label: { fontFamily: 'PlusJakartaSans_600SemiBold' },
    sizes: TEXT_SIZE,
};

export const radius = {
    card: 12,
    button: 8,
    chip: 999,
    input: 10,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
};

export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    base: 8,
    screen: 20,
    heroScreen: 24,
};

export const shadows = {
    sm: {
        shadowColor: '#0A2463',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    md: {
        shadowColor: '#0A2463',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 4,
    },
    lg: {
        shadowColor: '#0A2463',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
    },
    card: {
        shadowColor: '#4A5568',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    hero: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 8,
    },
    modal: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 12,
    },

    // ── Dual-Shadow System ──────────────────────
    // Use cardSharp on inner View + cardAmbient on outer View
    // for realistic two-layer depth (definition + ambient glow).
    cardSharp: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    cardAmbient: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 24,
        elevation: 3,
    },
};

// App-specific helpers
export const cardStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    ...shadows.card,
    padding: spacing.md,
};

export const headerGradient = [colors.primary, colors.primaryMid];

export const layout = {
    TAB_BAR_HEIGHT: 64,
    TAB_BAR_BOTTOM: 8,
    TAB_BAR_CLEARANCE: 140, 
};

import { motion, anim, useReduceMotion } from './motion';
export { motion, anim, useReduceMotion };

import { MotionProvider, useMotion } from './MotionProvider';
export { MotionProvider, useMotion };

export default { colors, typography, FONT, METRIC_FONT, TEXT_SIZE, TYPOGRAPHY, TEXT, ICON_SIZE, SPACING, RADIUS, radius, spacing, shadows, layout, motion, anim, useReduceMotion, MotionProvider, useMotion };
