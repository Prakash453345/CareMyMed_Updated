import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Modal, View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing, AppState, Keyboard
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
    const [arrowConfig, setArrowConfig] = useState({ isUp: true, arrowLeft: 40 });
    const [computedShapeConfig, setComputedShapeConfig] = useState({ shape: 'roundedRect', radius: 14 });
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const reduceMotion = useReduceMotion();
    const cardFade = useRef(new Animated.Value(1)).current;
    const cardContentFade = useRef(new Animated.Value(1)).current;
    const cardTranslateY = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0.97)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timeoutsRef = useRef([]);

    // Animated values for continuous 60fps morphing between steps
    const animSpotTop = useRef(new Animated.Value(0)).current;
    const animSpotLeft = useRef(new Animated.Value(0)).current;
    const animSpotWidth = useRef(new Animated.Value(0)).current;
    const animSpotHeight = useRef(new Animated.Value(0)).current;
    const animCardTop = useRef(new Animated.Value(0)).current;
    const animCardLeft = useRef(new Animated.Value(20)).current;
    const animArrowLeft = useRef(new Animated.Value(40)).current;
    const animOpacity = useRef(new Animated.Value(0)).current;
    const animRadius = useRef(new Animated.Value(14)).current;
    const isFirstMeasureRef = useRef(true);

    // 1. Keyboard Avoidance
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // 2. AppState Pause Guard (stop animation loops when app is backgrounded)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState.match(/inactive|background/)) {
                pulseAnim.stopAnimation();
                animSpotTop.stopAnimation();
                animSpotLeft.stopAnimation();
            }
        });
        return () => subscription.remove();
    }, [pulseAnim, animSpotTop, animSpotLeft]);

    // 3. Pulse animation around target element every few seconds
    useEffect(() => {
        if (visible && spotlightCoords && !reduceMotion) {
            const pulseLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.04,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1.0,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ])
            );
            pulseLoop.start();
            return () => pulseLoop.stop();
        } else {
            pulseAnim.setValue(1.0);
        }
    }, [visible, spotlightCoords, reduceMotion, pulseAnim]);

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
     * ADAPTIVE SPOTLIGHT & TOOLTIP PLACEMENT ENGINE (Swiggy-Style Precision)
     * Smart positioning, tight spotlight bounds, sticky header collision avoidance, direct center anchoring
     */
    const animateToCoords = useCallback((coords, stepData) => {
        if (!coords || !stepData) return;

        const screenWidth = Dimensions.get('window').width || 360;
        const rawScreenHeight = Dimensions.get('window').height || 640;
        const screenHeight = rawScreenHeight - keyboardHeight; // Keyboard offset aware
        const SAFE_MARGIN = 16; // Strict 16px margin from display edges

        // Tight spotlight padding (+8px to +10px default instead of massive card padding)
        const pad = Number(stepData.spotlightPadding ?? coords.padding) ?? 8;
        const rawTop = Number(coords.top);
        const rawLeft = Number(coords.left);
        const rawWidth = Number(coords.width);
        const rawHeight = Number(coords.height);

        const safeTop = isNaN(rawTop) ? 120 : rawTop;
        const safeLeft = isNaN(rawLeft) ? 16 : rawLeft;
        const safeWidth = isNaN(rawWidth) || rawWidth <= 0 ? screenWidth - 32 : rawWidth;
        const safeHeight = isNaN(rawHeight) || rawHeight <= 0 ? 50 : rawHeight;

        // 1. Precise Spotlight Edge Boundaries
        const spotTop = Math.max(10, safeTop - pad);
        const spotLeft = Math.max(SAFE_MARGIN, Math.min(screenWidth - SAFE_MARGIN - 20, safeLeft - pad));
        const spotWidth = Math.min(screenWidth - SAFE_MARGIN * 2, Math.max(10, safeWidth + pad * 2));
        const spotHeight = Math.max(10, safeHeight + pad * 2);

        // 2. Shape & Corner Radius (default 12px for tight clean look)
        const shape = stepData.shape || 'roundedRect';
        let computedRadius = stepData.spotlightRadius || stepData.borderRadius || 12;
        if (shape === 'circle') {
            computedRadius = Math.max(spotWidth, spotHeight) / 2;
        } else if (shape === 'pill') {
            computedRadius = spotHeight / 2;
        }

        setComputedShapeConfig({ shape, radius: computedRadius });

        // 3. Clear Space Calculations aware of Sticky Header (105px) and Bottom Nav Bar (90px)
        const topHeaderOffset = Number(stepData.topOffset || 105);
        const bottomBarOffset = Number(stepData.bottomOffset || 90);

        const clearAbove = spotTop - topHeaderOffset;
        const clearBelow = (screenHeight - bottomBarOffset) - (spotTop + spotHeight);
        const estimatedCardHeight = Number(stepData.cardHeight || 135);
        const preferred = stepData.preferredPlacement || stepData.arrow || 'auto';

        let isUp; // isUp = true means card sits BELOW spotlight (arrow points UP)
        if (preferred === 'top' || preferred === 'above') {
            // If top requested but clearAbove is cramped (< 120px) to avoid sticky header collision, auto-switch to below!
            isUp = clearAbove < 120;
        } else if (preferred === 'bottom' || preferred === 'below') {
            isUp = true;
        } else {
            // Auto placement: Pick side with maximum clear space!
            if (clearBelow >= estimatedCardHeight + 10) {
                isUp = true;
            } else if (clearAbove >= estimatedCardHeight + 10) {
                isUp = false;
            } else {
                isUp = clearBelow >= clearAbove;
            }
        }

        // 4. Custom Anchor Points (Points directly to center of spotlight target)
        const anchorRatio = stepData.anchorX !== undefined ? stepData.anchorX : 0.5;
        const targetCenterX = safeLeft + safeWidth * anchorRatio;

        // 5. Adaptive Card Width with strict edge clamping: Math.min(260, screenWidth - 32)
        const cardWidth = Math.min(
            stepData.maxCardWidth || 260,
            screenWidth - 32
        );
        const cardLeft = Math.max(SAFE_MARGIN, Math.min(targetCenterX - cardWidth / 2, screenWidth - cardWidth - SAFE_MARGIN));
        const computedArrowLeft = Math.max(16, Math.min(targetCenterX - cardLeft - 6, cardWidth - 28));

        // 6. Placement & Kissing Offset (8px gap from spotlight boundary)
        let cardTop;
        if (isUp) {
            // Position below spotlight with 8px kissing gap
            cardTop = spotTop + spotHeight + 8;
            // Safety clamp: do not overlap bottom navigation bar
            cardTop = Math.min(screenHeight - bottomBarOffset - estimatedCardHeight, cardTop);
        } else {
            // Position above spotlight with 8px kissing gap
            cardTop = spotTop - estimatedCardHeight - 8;
            // Safety clamp: NEVER collide with sticky top header bar (topHeaderOffset)
            cardTop = Math.max(topHeaderOffset + 6, cardTop);
        }

        const finalSpotTop = isNaN(spotTop) ? 0 : spotTop;
        const finalSpotLeft = isNaN(spotLeft) ? 0 : spotLeft;
        const finalSpotWidth = isNaN(spotWidth) ? 100 : spotWidth;
        const finalSpotHeight = isNaN(spotHeight) ? 100 : spotHeight;
        const finalCardTop = isNaN(cardTop) ? 100 : cardTop;
        const finalCardLeft = isNaN(cardLeft) ? 16 : cardLeft;
        const finalArrowLeft = isNaN(computedArrowLeft) ? 40 : computedArrowLeft;

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
            cardScale.setValue(1.0);
            cardTranslateY.setValue(0);
            isFirstMeasureRef.current = false;
        } else {
            Animated.parallel([
                Animated.timing(animSpotTop, { toValue: finalSpotTop, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotLeft, { toValue: finalSpotLeft, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotWidth, { toValue: finalSpotWidth, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animSpotHeight, { toValue: finalSpotHeight, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animCardTop, { toValue: finalCardTop, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animCardLeft, { toValue: finalCardLeft, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animArrowLeft, { toValue: finalArrowLeft, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animRadius, { toValue: computedRadius, duration: 220, easing: Easing.bezier(0.22, 0.98, 0.34, 1), useNativeDriver: false }),
                Animated.timing(animOpacity, { toValue: 1, duration: 160, useNativeDriver: false }),
            ]).start();
        }
    }, [animSpotTop, animSpotLeft, animSpotWidth, animSpotHeight, animCardTop, animCardLeft, animArrowLeft, animRadius, animOpacity, cardScale, cardTranslateY, keyboardHeight, reduceMotion]);

    /**
     * AUTO-SCROLL ENGINE
     */
    const scrollToTarget = useCallback((stepData, callback) => {
        const activeScrollRef = stepData?.scrollRef || scrollRef;
        if (!stepData || !activeScrollRef?.current) {
            if (callback) callback();
            return;
        }

        const scrollInst = activeScrollRef.current;

        if (stepData.scrollOffset !== undefined) {
            try {
                if (scrollInst.scrollTo) {
                    scrollInst.scrollTo({ y: Math.max(0, stepData.scrollOffset), animated: !reduceMotion });
                } else if (scrollInst.scrollToOffset) {
                    scrollInst.scrollToOffset({ offset: Math.max(0, stepData.scrollOffset), animated: !reduceMotion });
                }
            } catch (e) {}
            setTrackedTimeout(callback, reduceMotion ? 50 : 240);
            return;
        }

        if (stepData.index !== undefined && scrollInst.scrollToIndex) {
            try {
                scrollInst.scrollToIndex({ index: stepData.index, animated: !reduceMotion, viewPosition: 0.3 });
            } catch (e) {}
            setTrackedTimeout(callback, reduceMotion ? 50 : 260);
            return;
        }

        if (stepData.ref?.current) {
            try {
                const targetNode = scrollInst.getNode ? scrollInst.getNode() : (scrollInst._component || scrollInst);
                if (stepData.ref.current.measureLayout && targetNode) {
                    stepData.ref.current.measureLayout(
                        targetNode,
                        (x, y) => {
                            try {
                                const offset = Math.max(0, y - (stepData.scrollMargin || 40));
                                if (scrollInst.scrollTo) {
                                    scrollInst.scrollTo({ y: offset, animated: !reduceMotion });
                                } else if (scrollInst.scrollToOffset) {
                                    scrollInst.scrollToOffset({ offset, animated: !reduceMotion });
                                }
                            } catch (e) {}
                            setTrackedTimeout(callback, reduceMotion ? 50 : 240);
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
     * Measure step target
     */
    const measureStep = useCallback((stepData, attempt = 0, onDone = null) => {
        if (!stepData) return;

        const applyStaticFallback = (sd) => {
            const screenWidth = Dimensions.get('window').width || 360;
            const fallbackCoords = {
                top: Number(sd?.spotlightTop) || 140,
                height: Number(sd?.spotlightHeight) || 80,
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
    const cardWidthConst = Math.min(
        stepData.maxCardWidth || 270,
        Dimensions.get('window').width - 32
    );

    const handleNext = async () => {
        HapticPatterns.selection();
        if (activeStep < steps.length - 1) {
            // Cancel running in-flight animations on rapid taps
            cardContentFade.stopAnimation();
            cardTranslateY.stopAnimation();
            cardScale.stopAnimation();

            setIsTransitioning(true);
            const nextStepIdx = activeStep + 1;
            const nextStepData = steps[nextStepIdx];

            Animated.parallel([
                Animated.timing(cardContentFade, { toValue: 0, duration: 90, useNativeDriver: true }),
                Animated.timing(animOpacity, { toValue: 0, duration: 90, useNativeDriver: false }),
            ]).start(() => {
                setActiveStep(nextStepIdx);

                scrollToTarget(nextStepData, () => {
                    measureStep(nextStepData, 0, () => {
                        if (reduceMotion) {
                            cardContentFade.setValue(1);
                            cardTranslateY.setValue(0);
                            cardScale.setValue(1.0);
                            setIsTransitioning(false);
                        } else {
                            cardTranslateY.setValue(10);
                            cardScale.setValue(0.97);
                            Animated.parallel([
                                Animated.timing(cardContentFade, { toValue: 1, duration: 200, useNativeDriver: true }),
                                Animated.timing(cardTranslateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
                                Animated.timing(cardScale, { toValue: 1.0, duration: 200, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
                            ]).start(() => setIsTransitioning(false));
                        }
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

    const pad = Number(stepData.spotlightPadding ?? spotlightCoords?.padding) || 4;
    const spotX = spotlightCoords ? Math.max(14, spotlightCoords.left - pad) : 0;
    const spotY = spotlightCoords ? Math.max(10, spotlightCoords.top - pad) : 0;
    const spotW = spotlightCoords ? spotlightCoords.width + pad * 2 : 0;
    const spotH = spotlightCoords ? spotlightCoords.height + pad * 2 : 0;

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent={true}>
            <View style={[s.wtOverlay, !spotlightCoords && s.wtOverlayCentered]} pointerEvents="box-none">
                {/* Sleek 40% Backdrop Dimming */}
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
                            fill="rgba(15, 23, 42, 0.36)"
                            mask="url(#spotlightMask)"
                        />
                    </Svg>
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.40)' }]} pointerEvents="none" />
                )}

                {/* Subtle Pulsing Highlight Halo around Target Element */}
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
                                transform: [{ scale: pulseAnim }],
                            }
                        ]}
                        pointerEvents="none"
                    />
                )}

                {/* Swiggy-Style Compact Floating Tooltip Card */}
                <Animated.View
                    accessible={true}
                    accessibilityRole="alert"
                    accessibilityLabel={`Step ${activeStep + 1} of ${steps.length}. ${stepData.title}. ${stepData.desc}`}
                    style={[
                        s.wtCard,
                        spotlightCoords ? {
                            position: 'absolute',
                            top: animCardTop,
                            left: animCardLeft,
                            width: cardWidthConst,
                        } : {
                            position: 'relative',
                            alignSelf: 'center',
                            width: cardWidthConst,
                        },
                        { opacity: cardFade }
                    ]}
                    pointerEvents={isTransitioning ? 'none' : 'auto'}
                >
                    {/* Rotated Arrow Pointer */}
                    {spotlightCoords && (
                        <Animated.View
                            style={[
                                arrowConfig.isUp ? s.wtCardArrowUp : s.wtCardArrowDown,
                                { left: animArrowLeft }
                            ]}
                        />
                    )}

                    <Animated.View style={{ opacity: cardContentFade, transform: reduceMotion ? [] : [{ translateY: cardTranslateY }, { scale: cardScale }] }}>
                        <View style={s.wtCardHeader}>
                            <View style={s.wtIconWrap}>
                                {Icon && <Icon size={14} color={stepData.iconColor || "#7C3AED"} strokeWidth={2.4} />}
                            </View>
                            <Text style={s.wtTitle} numberOfLines={1}>{stepData.title}</Text>
                            <Pressable
                                onPress={handleSkip}
                                style={s.wtSkipBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Skip tour"
                            >
                                <Text style={s.wtSkipText}>Skip</Text>
                            </Pressable>
                        </View>

                        {/* Description strictly capped at 2 lines */}
                        <Text style={s.wtDesc} numberOfLines={2} ellipsizeMode="tail">{stepData.desc}</Text>

                        <View style={s.wtFooter}>
                            {/* Modern Progress Dots (● ○ ○ ○) instead of text fractions */}
                            <View style={s.wtDotsRow} accessibilityLabel={`Step ${activeStep + 1} of ${steps.length}`}>
                                {steps.map((_, idx) => (
                                    <View
                                        key={idx}
                                        style={[
                                            s.wtDot,
                                            activeStep === idx ? s.wtDotActive : s.wtDotInactive,
                                        ]}
                                    />
                                ))}
                            </View>

                            {/* Compact Action Button */}
                            <Pressable
                                style={s.wtNextBtn}
                                onPress={handleNext}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel={activeStep === steps.length - 1 ? 'Finish tour' : 'Next step'}
                            >
                                <Text style={s.wtNextText}>
                                    {activeStep === steps.length - 1 ? 'Got It' : 'Next'}
                                </Text>
                                <ChevronRight size={12} color="#FFF" strokeWidth={2.8} />
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    wtSpotlight: {
        position: 'absolute',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderStyle: 'solid',
        borderRadius: 14,
        backgroundColor: 'transparent',
    },
    wtCard: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 13,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.9)',
    },
    wtCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    wtIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#F3E8FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wtTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
        flex: 1,
    },
    wtSkipBtn: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        backgroundColor: 'transparent',
    },
    wtSkipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    wtDesc: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#475569',
        lineHeight: 16.5,
        marginBottom: 10,
    },
    wtFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    wtDotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    wtDot: {
        height: 5,
        borderRadius: 2.5,
    },
    wtDotActive: {
        width: 14,
        backgroundColor: '#7C3AED',
    },
    wtDotInactive: {
        width: 5,
        backgroundColor: '#CBD5E1',
    },
    wtNextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#7C3AED',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    wtNextText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#FFF',
    },
    wtCardArrowUp: {
        position: 'absolute',
        top: -5,
        width: 10,
        height: 10,
        backgroundColor: '#FFFFFF',
        borderLeftWidth: 1,
        borderTopWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.9)',
        transform: [{ rotate: '45deg' }],
        zIndex: 5,
    },
    wtCardArrowDown: {
        position: 'absolute',
        bottom: -5,
        width: 10,
        height: 10,
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.9)',
        transform: [{ rotate: '45deg' }],
        zIndex: 5,
    },
});
