import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Modal, View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing
} from 'react-native';
import Svg, { Defs, Mask, Rect as SvgRect, Circle as SvgCircle } from 'react-native-svg';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '../../theme';
import { useReduceMotion } from '../../theme/motion';
import { HapticPatterns } from '../../utils/haptics';
import { TourService } from '../../lib/TourService';

export default function GuidedTour({
    visible,
    steps = [],
    scrollRef,
    tourKey,
    onClose
}) {
    const [activeStep, setActiveStep] = useState(0);
    const [spotlightCoords, setSpotlightCoords] = useState(null);
    const [arrowConfig, setArrowConfig] = useState({ isUp: true, arrowLeft: 48 });
    const [computedShapeConfig, setComputedShapeConfig] = useState({ shape: 'roundedRect', radius: 16 });
    const [isTransitioning, setIsTransitioning] = useState(false);
    const reduceMotion = useReduceMotion();
    const cardFade = useRef(new Animated.Value(1)).current;
    const cardContentFade = useRef(new Animated.Value(1)).current;
    const cardTranslateY = useRef(new Animated.Value(0)).current;
    const timeoutsRef = useRef([]);

    // Animated values for continuous 60fps morphing between steps
    const animSpotTop = useRef(new Animated.Value(0)).current;
    const animSpotLeft = useRef(new Animated.Value(0)).current;
    const animSpotWidth = useRef(new Animated.Value(0)).current;
    const animSpotHeight = useRef(new Animated.Value(0)).current;
    const animCardTop = useRef(new Animated.Value(0)).current;
    const animCardLeft = useRef(new Animated.Value(20)).current;
    const animArrowLeft = useRef(new Animated.Value(48)).current;
    const animOpacity = useRef(new Animated.Value(0)).current;
    const animRadius = useRef(new Animated.Value(16)).current;
    const isFirstMeasureRef = useRef(true);

    const setTrackedTimeout = useCallback((fn, delay) => {
        const id = setTimeout(fn, delay);
        timeoutsRef.current.push(id);
        return id;
    }, []);

    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(clearTimeout);
        };
    }, []);

    /**
     * GUIDED TOUR LAYOUT ENGINE
     * Computes safe margins, smart placement, custom anchors, adaptive card sizing, and shapes
     */
    const animateToCoords = useCallback((coords, stepData) => {
        if (!coords || !stepData) return;

        const screenWidth = Dimensions.get('window').width || 360;
        const screenHeight = Dimensions.get('window').height || 640;
        const SAFE_MARGIN = 16;

        const pad = Number(stepData.spotlightPadding ?? coords.padding) || 6;
        const rawTop = Number(coords.top);
        const rawLeft = Number(coords.left);
        const rawWidth = Number(coords.width);
        const rawHeight = Number(coords.height);

        const safeTop = isNaN(rawTop) ? 120 : rawTop;
        const safeLeft = isNaN(rawLeft) ? 16 : rawLeft;
        const safeWidth = isNaN(rawWidth) || rawWidth <= 0 ? screenWidth - 32 : rawWidth;
        const safeHeight = isNaN(rawHeight) || rawHeight <= 0 ? 80 : rawHeight;

        // 1. Safe Edge Boundaries (Never clip screen edges)
        const spotTop = Math.max(10, safeTop - pad);
        const spotLeft = Math.max(SAFE_MARGIN, Math.min(screenWidth - SAFE_MARGIN - 20, safeLeft - pad));
        const spotWidth = Math.min(screenWidth - SAFE_MARGIN * 2, Math.max(10, safeWidth + pad * 2));
        const spotHeight = Math.max(10, safeHeight + pad * 2);

        // 2. Shape & Corner Radius Engine
        const shape = stepData.shape || 'roundedRect';
        let computedRadius = stepData.spotlightRadius || stepData.borderRadius || 16;
        if (shape === 'circle') {
            computedRadius = Math.max(spotWidth, spotHeight) / 2;
        } else if (shape === 'pill') {
            computedRadius = spotHeight / 2;
        }

        setComputedShapeConfig({ shape, radius: computedRadius });

        // 3. Smart Placement Engine (Auto-calculates largest free area above vs below target)
        const spaceAbove = spotTop - 20;
        const spaceBelow = screenHeight - (spotTop + spotHeight) - 40;
        const preferred = stepData.preferredPlacement || stepData.arrow || 'auto';

        let isUp; // isUp = true means card sits BELOW spotlight (arrow points UP)
        if (preferred === 'top' || preferred === 'above') {
            isUp = false;
        } else if (preferred === 'bottom' || preferred === 'below') {
            isUp = true;
        } else {
            // Auto placement: Pick direction with largest free area
            if (spaceBelow >= 180) {
                isUp = true;
            } else if (spaceAbove >= 180) {
                isUp = false;
            } else {
                isUp = spaceBelow >= spaceAbove;
            }
        }

        // 4. Custom Anchor Points (anchorX ratio 0.0 to 1.0)
        const anchorRatio = stepData.anchorX !== undefined ? stepData.anchorX : 0.5;
        const targetCenterX = safeLeft + safeWidth * anchorRatio;

        // 5. Adaptive Tooltip Card Width (~86% on phones, capped on tablets)
        const cardWidth = Math.min(
            stepData.maxCardWidth || 340,
            Math.min(Math.round(screenWidth * 0.86), screenWidth > 600 ? 360 : 310)
        );
        const cardLeft = Math.max(SAFE_MARGIN, Math.min(targetCenterX - cardWidth / 2, screenWidth - cardWidth - SAFE_MARGIN));
        const computedArrowLeft = Math.max(16, Math.min(targetCenterX - cardLeft - 8, cardWidth - 32));

        let cardTop;
        if (isUp) {
            cardTop = Math.min(screenHeight - 200, spotTop + spotHeight + 12);
        } else {
            cardTop = Math.max(20, spotTop - (stepData.cardOffset || 170));
        }

        const finalSpotTop = isNaN(spotTop) ? 0 : spotTop;
        const finalSpotLeft = isNaN(spotLeft) ? 0 : spotLeft;
        const finalSpotWidth = isNaN(spotWidth) ? 100 : spotWidth;
        const finalSpotHeight = isNaN(spotHeight) ? 100 : spotHeight;
        const finalCardTop = isNaN(cardTop) ? 100 : cardTop;
        const finalCardLeft = isNaN(cardLeft) ? 16 : cardLeft;
        const finalArrowLeft = isNaN(computedArrowLeft) ? 48 : computedArrowLeft;

        setArrowConfig({ isUp, arrowLeft: finalArrowLeft });

        if (isFirstMeasureRef.current || reduceMotion) {
            animSpotTop.setValue(finalSpotTop);
            animSpotLeft.setValue(finalSpotLeft);
            animSpotWidth.setValue(finalSpotWidth);
            animSpotHeight.setValue(finalSpotHeight);
            animCardTop.setValue(finalCardTop);
            animCardLeft.setValue(finalCardLeft);
            animArrowLeft.setValue(finalArrowLeft);
            animRadius.setValue(computedRadius);
            animOpacity.setValue(1);
            isFirstMeasureRef.current = false;
        } else {
            // Coordinated 240ms gliding animation across all parameters
            Animated.parallel([
                Animated.timing(animSpotTop, { toValue: finalSpotTop, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotLeft, { toValue: finalSpotLeft, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotWidth, { toValue: finalSpotWidth, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotHeight, { toValue: finalSpotHeight, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animCardTop, { toValue: finalCardTop, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animCardLeft, { toValue: finalCardLeft, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animArrowLeft, { toValue: finalArrowLeft, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animRadius, { toValue: computedRadius, duration: 240, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animOpacity, { toValue: 1, duration: 180, useNativeDriver: false }),
            ]).start();
        }
    }, [animSpotTop, animSpotLeft, animSpotWidth, animSpotHeight, animCardTop, animCardLeft, animArrowLeft, animRadius, animOpacity, reduceMotion]);

    /**
     * AUTO-SCROLL ENGINE
     * Automatically scrolls screen container until target is fully in viewport before measuring
     */
    const scrollToTarget = useCallback((stepData, callback) => {
        const activeScrollRef = stepData?.scrollRef || scrollRef;
        if (!stepData || !activeScrollRef?.current) {
            if (callback) callback();
            return;
        }

        const scrollInst = activeScrollRef.current;

        // A) Explicit scrollOffset provided
        if (stepData.scrollOffset !== undefined) {
            try {
                if (scrollInst.scrollTo) {
                    scrollInst.scrollTo({ y: Math.max(0, stepData.scrollOffset), animated: !reduceMotion });
                } else if (scrollInst.scrollToOffset) {
                    scrollInst.scrollToOffset({ offset: Math.max(0, stepData.scrollOffset), animated: !reduceMotion });
                }
            } catch (e) {}
            setTrackedTimeout(callback, reduceMotion ? 50 : 260);
            return;
        }

        // B) FlatList scrollToIndex
        if (stepData.index !== undefined && scrollInst.scrollToIndex) {
            try {
                scrollInst.scrollToIndex({ index: stepData.index, animated: !reduceMotion, viewPosition: 0.3 });
            } catch (e) {}
            setTrackedTimeout(callback, reduceMotion ? 50 : 280);
            return;
        }

        // C) Automatic Layout Measurement & Scroll (measureLayout against ScrollView node)
        if (stepData.ref?.current) {
            try {
                const targetNode = scrollInst.getNode ? scrollInst.getNode() : (scrollInst._component || scrollInst);
                if (stepData.ref.current.measureLayout && targetNode) {
                    stepData.ref.current.measureLayout(
                        targetNode,
                        (x, y) => {
                            try {
                                const offset = Math.max(0, y - (stepData.scrollMargin || 50));
                                if (scrollInst.scrollTo) {
                                    scrollInst.scrollTo({ y: offset, animated: !reduceMotion });
                                } else if (scrollInst.scrollToOffset) {
                                    scrollInst.scrollToOffset({ offset, animated: !reduceMotion });
                                }
                            } catch (e) {}
                            setTrackedTimeout(callback, reduceMotion ? 50 : 260);
                        },
                        () => {
                            if (callback) callback();
                        }
                    );
                    return;
                }
            } catch (e) {}
        }

        if (callback) callback();
    }, [scrollRef, reduceMotion, setTrackedTimeout]);

    /**
     * Measure step target using measureInWindow after auto-scroll completes
     */
    const measureStep = useCallback((stepData, attempt = 0, onDone = null) => {
        if (!stepData) return;

        const applyStaticFallback = (sd) => {
            const screenWidth = Dimensions.get('window').width || 360;
            const fallbackCoords = {
                top: Number(sd?.spotlightTop) || 140,
                height: Number(sd?.spotlightHeight) || 90,
                left: 16,
                width: screenWidth - 32
            };
            setSpotlightCoords(fallbackCoords);
            animateToCoords(fallbackCoords, sd);
            if (onDone) onDone();
        };

        const doWindowMeasure = () => {
            if (stepData.ref?.current) {
                if (stepData.ref.current.measureInWindow) {
                    stepData.ref.current.measureInWindow((x, y, mwidth, mheight) => {
                        if (mwidth > 0 && mheight > 0) {
                            const coords = {
                                top: y,
                                height: mheight,
                                left: x > 0 ? x : 16,
                                width: mwidth
                            };
                            setSpotlightCoords(coords);
                            animateToCoords(coords, stepData);
                            if (onDone) onDone();
                        } else if (attempt < 4) {
                            setTrackedTimeout(() => measureStep(stepData, attempt + 1, onDone), 60);
                        } else {
                            applyStaticFallback(stepData);
                        }
                    });
                } else if (stepData.ref.current.measure) {
                    stepData.ref.current.measure((mx, my, mwidth, mheight, pageX, pageY) => {
                        if (mwidth > 0 && mheight > 0) {
                            const coords = {
                                top: pageY,
                                height: mheight,
                                left: pageX || 16,
                                width: mwidth
                            };
                            setSpotlightCoords(coords);
                            animateToCoords(coords, stepData);
                            if (onDone) onDone();
                        } else {
                            applyStaticFallback(stepData);
                        }
                    });
                } else {
                    applyStaticFallback(stepData);
                }
            } else {
                applyStaticFallback(stepData);
            }
        };

        doWindowMeasure();
    }, [setTrackedTimeout, animateToCoords]);

    // Measure spotlight whenever active step or visibility changes
    useEffect(() => {
        if (visible && steps.length > 0) {
            const stepData = steps[activeStep];
            scrollToTarget(stepData, () => {
                measureStep(stepData);
            });
        } else {
            setActiveStep(0);
            setSpotlightCoords(null);
            isFirstMeasureRef.current = true;
            animOpacity.setValue(0);
        }
    }, [visible, activeStep, steps, scrollToTarget, measureStep, animOpacity]);

    if (!visible || steps.length === 0) return null;

    const stepData = steps[activeStep];
    if (!stepData) return null;

    const Icon = stepData.icon;

    const handleNext = async () => {
        HapticPatterns.selection();
        if (activeStep < steps.length - 1) {
            setIsTransitioning(true);
            const nextStepIdx = activeStep + 1;
            const nextStepData = steps[nextStepIdx];

            // 1. Fade out current card content & spotlight while scrolling
            Animated.parallel([
                Animated.timing(cardContentFade, { toValue: 0, duration: 100, useNativeDriver: true }),
                Animated.timing(animOpacity, { toValue: 0, duration: 100, useNativeDriver: false }),
            ]).start(() => {
                setActiveStep(nextStepIdx);

                // 2. Perform Auto-Scroll
                scrollToTarget(nextStepData, () => {
                    // 3. Measure target after scroll finishes
                    measureStep(nextStepData, 0, () => {
                        // 4. Fade back in with translateY lift
                        cardTranslateY.setValue(8);
                        Animated.parallel([
                            Animated.timing(cardContentFade, { toValue: 1, duration: 180, useNativeDriver: true }),
                            Animated.timing(cardTranslateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                        ]).start(() => setIsTransitioning(false));
                    });
                });
            });
        } else {
            if (tourKey) {
                await TourService.markTourSeen(tourKey);
            }
            if (onClose) onClose();
        }
    };

    const handleSkip = async () => {
        HapticPatterns.selection();
        if (tourKey) {
            await TourService.markTourSeen(tourKey);
        }
        if (onClose) onClose();
    };

    const pad = Number(stepData.spotlightPadding ?? spotlightCoords?.padding) || 6;
    const spotX = spotlightCoords ? Math.max(16, spotlightCoords.left - pad) : 0;
    const spotY = spotlightCoords ? Math.max(10, spotlightCoords.top - pad) : 0;
    const spotW = spotlightCoords ? spotlightCoords.width + pad * 2 : 0;
    const spotH = spotlightCoords ? spotlightCoords.height + pad * 2 : 0;

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent={true}>
            <View style={[s.wtOverlay, !spotlightCoords && s.wtOverlayCentered]}>
                {/* Clean Cut-Out Overlay with 55% dimming so background remains visible & alive */}
                {spotlightCoords ? (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Defs>
                            <Mask id="spotlightMask">
                                <SvgRect width="100%" height="100%" fill="white" />
                                {computedShapeConfig.shape === 'circle' ? (
                                    <SvgCircle
                                        cx={spotX + spotW / 2}
                                        cy={spotY + spotH / 2}
                                        r={Math.max(spotW, spotH) / 2}
                                        fill="black"
                                    />
                                ) : (
                                    <SvgRect
                                        x={spotX}
                                        y={spotY}
                                        width={spotW}
                                        height={spotH}
                                        rx={computedShapeConfig.radius}
                                        fill="black"
                                    />
                                )}
                            </Mask>
                        </Defs>
                        <SvgRect
                            width="100%"
                            height="100%"
                            fill="rgba(15, 23, 42, 0.55)"
                            mask="url(#spotlightMask)"
                        />
                    </Svg>
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.55)' }]} pointerEvents="none" />
                )}

                {/* Subtle, non-glowing white edge line around target component (NO PURPLE HALO) */}
                {spotlightCoords && (
                    <Animated.View
                        style={[
                            s.wtSpotlight,
                            {
                                top: animSpotTop,
                                left: animSpotLeft,
                                width: animSpotWidth,
                                height: animSpotHeight,
                                opacity: animOpacity,
                                borderRadius: animRadius,
                            }
                        ]}
                        pointerEvents="none"
                    />
                )}

                {/* Anchored Tooltip Card */}
                <Animated.View
                    style={[
                        s.wtCard,
                        spotlightCoords ? {
                            position: 'absolute',
                            top: animCardTop,
                            left: animCardLeft,
                            width: Math.min(Math.round(Dimensions.get('window').width * 0.86), Dimensions.get('window').width > 600 ? 360 : 310),
                        } : {
                            position: 'relative',
                            alignSelf: 'center',
                            width: Math.min(Math.round(Dimensions.get('window').width * 0.86), Dimensions.get('window').width > 600 ? 360 : 310),
                        },
                        { opacity: cardFade }
                    ]}
                    pointerEvents={isTransitioning ? 'none' : 'auto'}
                >
                    {/* Anchored Arrow pointing to component center / custom anchorX */}
                    {spotlightCoords && (
                        <Animated.View
                            style={[
                                arrowConfig.isUp ? s.wtCardArrowUp : s.wtCardArrowDown,
                                { left: animArrowLeft }
                            ]}
                        />
                    )}

                    <Animated.View style={{ opacity: cardContentFade, transform: [{ translateY: cardTranslateY }] }}>
                        <View style={s.wtCardHeader}>
                            <View style={s.wtIconWrap}>
                                {Icon && <Icon size={18} color="#475569" strokeWidth={2.2} />}
                            </View>
                            <Text style={s.wtTitle}>{stepData.title}</Text>
                            <Pressable onPress={handleSkip} style={s.wtSkipBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={s.wtSkipText}>Skip</Text>
                            </Pressable>
                        </View>

                        <Text style={s.wtDesc}>{stepData.desc}</Text>

                        <View style={s.wtFooter}>
                            {/* Step Counter (1 / 5) for instant position clarity */}
                            <View style={s.wtStepCounter}>
                                <Text style={s.wtStepCounterText}>
                                    {activeStep + 1} / {steps.length}
                                </Text>
                            </View>

                            {/* Vibrant Primary Action Button */}
                            <Pressable style={s.wtNextBtn} onPress={handleNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={s.wtNextText}>
                                    {activeStep === steps.length - 1 ? 'Got It' : 'Next'}
                                </Text>
                                <ChevronRight size={13} color="#FFF" strokeWidth={2.8} />
                            </Pressable>
                        </View>
                    </Animated.View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    wtOverlay: {
        flex: 1,
    },
    wtOverlayCentered: {
        justify: 'center',
        alignItems: 'center',
        padding: 20,
    },
    // Pure clean cut-out edge — NO purple glow, NO shadow, NO neon halo
    wtSpotlight: {
        position: 'absolute',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        borderStyle: 'solid',
        borderRadius: 16,
        backgroundColor: 'transparent',
    },
    wtCard: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 18,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    wtCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    wtIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justify: 'center',
        marginRight: 10,
    },
    wtTitle: {
        fontSize: 15.5,
        fontWeight: '800',
        color: '#0F172A',
        flex: 1,
    },
    wtSkipBtn: {
        paddingHorizontal: 6,
        paddingVertical: 4,
        backgroundColor: 'transparent',
    },
    wtSkipText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#94A3B8',
    },
    wtDesc: {
        fontSize: 13,
        fontWeight: '500',
        color: '#475569',
        lineHeight: 19.5,
        marginBottom: 16,
    },
    wtFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justify: 'space-between',
    },
    wtStepCounter: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    wtStepCounterText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#64748B',
    },
    wtNextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#7C3AED',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    wtNextText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
    },
    wtCardArrowUp: {
        position: 'absolute',
        top: -7,
        width: 14,
        height: 14,
        backgroundColor: '#FFFFFF',
        borderLeftWidth: 1,
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
        transform: [{ rotate: '45deg' }],
        zIndex: 5,
    },
    wtCardArrowDown: {
        position: 'absolute',
        bottom: -7,
        width: 14,
        height: 14,
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E2E8F0',
        transform: [{ rotate: '45deg' }],
        zIndex: 5,
    },
});
