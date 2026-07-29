import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Modal, View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing
} from 'react-native';
import Svg, { Defs, Mask, Rect as SvgRect } from 'react-native-svg';
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
    const [isTransitioning, setIsTransitioning] = useState(false);
    const reduceMotion = useReduceMotion();
    const cardFade = useRef(new Animated.Value(1)).current;
    const cardContentFade = useRef(new Animated.Value(1)).current;
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
     * Animate spotlight cutout, card position, and arrow alignment to new target coordinates
     */
    const animateToCoords = useCallback((coords, isUp) => {
        if (!coords) return;

        const screenWidth = Dimensions.get('window').width || 360;
        const screenHeight = Dimensions.get('window').height || 640;

        const pad = Number(coords.padding) || 6;
        const rawTop = Number(coords.top);
        const rawLeft = Number(coords.left);
        const rawWidth = Number(coords.width);
        const rawHeight = Number(coords.height);

        const safeTop = isNaN(rawTop) ? 120 : rawTop;
        const safeLeft = isNaN(rawLeft) ? 16 : rawLeft;
        const safeWidth = isNaN(rawWidth) || rawWidth <= 0 ? screenWidth - 32 : rawWidth;
        const safeHeight = isNaN(rawHeight) || rawHeight <= 0 ? 80 : rawHeight;

        const spotTop = Math.max(0, safeTop - pad);
        const spotLeft = Math.max(0, safeLeft - pad);
        const spotWidth = Math.min(screenWidth, Math.max(10, safeWidth + pad * 2));
        const spotHeight = Math.max(10, safeHeight + pad * 2);

        // Compact tooltip width (~15% narrower to eliminate long horizontal eye travel)
        const cardWidth = Math.min(screenWidth - 48, 290);
        const targetCenterX = safeLeft + safeWidth / 2;
        const cardLeft = Math.max(16, Math.min(targetCenterX - cardWidth / 2, screenWidth - cardWidth - 16));
        const computedArrowLeft = Math.max(16, Math.min(targetCenterX - cardLeft - 8, cardWidth - 32));

        let cardTop;
        if (isUp) {
            cardTop = spotTop + spotHeight + 12;
        } else {
            cardTop = Math.max(20, spotTop - 170);
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
            animOpacity.setValue(1);
            isFirstMeasureRef.current = false;
        } else {
            Animated.parallel([
                Animated.timing(animSpotTop, { toValue: finalSpotTop, duration: 300, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotLeft, { toValue: finalSpotLeft, duration: 300, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotWidth, { toValue: finalSpotWidth, duration: 300, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotHeight, { toValue: finalSpotHeight, duration: 300, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animCardTop, { toValue: finalCardTop, duration: 300, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animCardLeft, { toValue: finalCardLeft, duration: 300, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animArrowLeft, { toValue: finalArrowLeft, duration: 300, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
            ]).start();
        }
    }, [animSpotTop, animSpotLeft, animSpotWidth, animSpotHeight, animCardTop, animCardLeft, animArrowLeft, animOpacity, reduceMotion]);

    /**
     * Measure step target using measureInWindow with retry pass & scroll offset
     */
    const measureStep = useCallback((stepData, attempt = 0) => {
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
            animateToCoords(fallbackCoords, true);
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
                            const screenHeight = Dimensions.get('window').height;
                            const isUp = stepData.arrow === 'top' || (y < screenHeight / 2 - 20 && stepData.arrow !== 'bottom');
                            animateToCoords(coords, isUp);
                        } else if (attempt < 4) {
                            setTrackedTimeout(() => measureStep(stepData, attempt + 1), 60);
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
                            const screenHeight = Dimensions.get('window').height;
                            const isUp = stepData.arrow === 'top' || (pageY < screenHeight / 2 - 20 && stepData.arrow !== 'bottom');
                            animateToCoords(coords, isUp);
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

        // Handle auto-scroll if scrollRef and offset/ref are provided
        if (stepData.scrollOffset !== undefined && scrollRef?.current) {
            try {
                scrollRef.current.scrollTo({ y: stepData.scrollOffset, animated: !reduceMotion });
            } catch {}
            setTrackedTimeout(doWindowMeasure, 250);
        } else if (stepData.ref?.current && scrollRef?.current) {
            try {
                const targetNode = scrollRef.current.getNode ? scrollRef.current.getNode() : (scrollRef.current._component || scrollRef.current);
                if (stepData.ref.current.measureLayout && targetNode) {
                    stepData.ref.current.measureLayout(
                        targetNode,
                        (x, y) => {
                            try {
                                scrollRef.current.scrollTo({ y: Math.max(0, y - 40), animated: !reduceMotion });
                            } catch {}
                            setTrackedTimeout(doWindowMeasure, 250);
                        },
                        () => setTrackedTimeout(doWindowMeasure, 100)
                    );
                } else {
                    setTrackedTimeout(doWindowMeasure, 100);
                }
            } catch (err) {
                if (__DEV__) console.warn('[GuidedTour] measureLayout error:', err.message);
                setTrackedTimeout(doWindowMeasure, 100);
            }
        } else {
            setTrackedTimeout(doWindowMeasure, 100);
        }
    }, [scrollRef, reduceMotion, setTrackedTimeout, animateToCoords]);

    // Measure spotlight whenever the active step or visibility changes
    useEffect(() => {
        if (visible && steps.length > 0) {
            const stepData = steps[activeStep];
            measureStep(stepData);
        } else {
            setActiveStep(0);
            setSpotlightCoords(null);
            isFirstMeasureRef.current = true;
            animOpacity.setValue(0);
        }
    }, [visible, activeStep, steps, measureStep, animOpacity]);

    if (!visible || steps.length === 0) return null;

    const stepData = steps[activeStep];
    if (!stepData) return null;

    const Icon = stepData.icon;

    const handleNext = async () => {
        HapticPatterns.selection();
        if (activeStep < steps.length - 1) {
            setIsTransitioning(true);
            Animated.timing(cardContentFade, {
                toValue: 0,
                duration: 120,
                useNativeDriver: true,
            }).start(() => {
                const nextStep = activeStep + 1;
                setActiveStep(nextStep);
                Animated.timing(cardContentFade, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }).start(() => setIsTransitioning(false));
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

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent={true}>
            <View style={[s.wtOverlay, !spotlightCoords && s.wtOverlayCentered]}>
                {/* Clean Cut-Out Overlay with 55% dimming so background remains visible & alive */}
                {spotlightCoords ? (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Defs>
                            <Mask id="spotlightMask">
                                <SvgRect width="100%" height="100%" fill="white" />
                                <SvgRect
                                    x={spotlightCoords.left - (stepData.padding || 6)}
                                    y={spotlightCoords.top - (stepData.padding || 6)}
                                    width={spotlightCoords.width + (stepData.padding || 6) * 2}
                                    height={spotlightCoords.height + (stepData.padding || 6) * 2}
                                    rx={stepData.borderRadius || 16}
                                    fill="black"
                                />
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
                                borderRadius: stepData.borderRadius || 16,
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
                            width: Math.min(Dimensions.get('window').width - 48, 290),
                        } : {
                            position: 'relative',
                            alignSelf: 'center',
                            width: Dimensions.get('window').width - 48,
                        },
                        { opacity: cardFade }
                    ]}
                    pointerEvents={isTransitioning ? 'none' : 'auto'}
                >
                    {/* Anchored Arrow pointing to component center */}
                    {spotlightCoords && (
                        <Animated.View
                            style={[
                                arrowConfig.isUp ? s.wtCardArrowUp : s.wtCardArrowDown,
                                { left: animArrowLeft }
                            ]}
                        />
                    )}

                    <Animated.View style={{ opacity: cardContentFade }}>
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
