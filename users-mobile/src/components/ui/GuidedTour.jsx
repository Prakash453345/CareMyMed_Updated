/**
 * GuidedTour — Swiggy / CRED Grade Tour Layout Engine
 *
 * Design Doctrine & Architecture:
 * 1. Measure-Scroll-Measure Sequence → Auto-scrolls target into the upper-middle viewport (30% from top) BEFORE measuring
 * 2. Adaptive Placement Engine → Dynamically evaluates clear space above sticky headers (110px) and bottom tab bar (90px)
 * 3. Non-Overlapping Guarantee → 12px kissing gap prevents tooltip from obscuring the target component
 * 4. Dynamic Pointer Tracking → Arrow triangle calculates targetCenterX and slides horizontally to anchor to target center
 * 5. Lighter Backdrop Dimming → 30% opacity (rgba(15, 23, 42, 0.30)) keeps app visible underneath
 * 6. Smooth 60fps Morphing → Animated.parallel morphs spotlight bounds, card position, and arrow alignment continuously
 * 7. Compact Height (<115px) → Capped at 2 lines of text for effortless scannability
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  AppState,
  Keyboard,
} from 'react-native';
import Svg, { Defs, Mask, Rect as SvgRect, Circle as SvgCircle } from 'react-native-svg';
import { ChevronRight } from 'lucide-react-native';
import { useReduceMotion } from '../../theme';
import { HapticPatterns } from '../../utils/haptics';
import { TourService } from '../../lib/TourService';

let AnimatedSvgRect = SvgRect;
let AnimatedSvgCircle = SvgCircle;
try {
  AnimatedSvgRect = Animated.createAnimatedComponent(SvgRect);
  AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
} catch (e) {
  AnimatedSvgRect = SvgRect;
  AnimatedSvgCircle = SvgCircle;
}

export default function GuidedTour({
  visible,
  steps = [],
  scrollRef,
  tourKey,
  onClose,
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [spotlightCoords, setSpotlightCoords] = useState(null);
  const [arrowConfig, setArrowConfig] = useState({ isUp: true, arrowLeft: 40 });
  const [computedShapeConfig, setComputedShapeConfig] = useState({ shape: 'roundedRect', radius: 18 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [measuredCardHeight, setMeasuredCardHeight] = useState(148);
  const reduceMotion = useReduceMotion();

  const cardFade = useRef(new Animated.Value(1)).current;
  const cardContentFade = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.98)).current;
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
  const animRadius = useRef(new Animated.Value(18)).current;

  const isFirstMeasureRef = useRef(true);
  const instanceIdRef = useRef(`tour_${Math.random().toString(36).slice(2, 7)}`);

  // Keyboard avoidance
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // AppState guard to pause loop on background
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

  const glowOpacityAnim = useRef(new Animated.Value(0.3)).current;

  // 1-Shot scale nudge on step start + breathing glow light
  useEffect(() => {
    if (visible && spotlightCoords && !reduceMotion) {
      // 1-shot scale pulse (1.0 -> 1.02 -> 1.0)
      pulseAnim.setValue(1.0);
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();

      // Soft breathing glow (0.2 -> 0.6 -> 0.2)
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacityAnim, {
            toValue: 0.6,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowOpacityAnim, {
            toValue: 0.2,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      glowLoop.start();
      return () => glowLoop.stop();
    } else {
      pulseAnim.setValue(1.0);
      glowOpacityAnim.setValue(0.3);
    }
  }, [visible, activeStep, reduceMotion, pulseAnim, glowOpacityAnim]);

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
   * ADAPTIVE LAYOUT & POSITIONING ENGINE
   */
  const animateToCoords = useCallback(
    (coords, stepData) => {
      if (!coords || !stepData) return;

      const screenWidth = Dimensions.get('window').width || 360;
      const rawScreenHeight = Dimensions.get('window').height || 640;
      const screenHeight = rawScreenHeight - keyboardHeight;
      const SAFE_MARGIN = 16;

      const pad = Number(stepData.spotlightPadding ?? coords.padding) ?? 6;
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
      const spotLeft = Math.max(
        SAFE_MARGIN,
        Math.min(screenWidth - SAFE_MARGIN - 20, safeLeft - pad)
      );
      const spotWidth = Math.min(
        screenWidth - SAFE_MARGIN * 2,
        Math.max(10, safeWidth + pad * 2)
      );
      const spotHeight = Math.max(10, safeHeight + pad * 2);

      // 2. Shape & Corner Radius
      const shape = stepData.shape || 'roundedRect';
      let computedRadius = stepData.spotlightRadius || stepData.borderRadius || 18;
      if (shape === 'circle') {
        computedRadius = Math.max(spotWidth, spotHeight) / 2;
      } else if (shape === 'pill') {
        computedRadius = spotHeight / 2;
      }

      setComputedShapeConfig({ shape, radius: computedRadius });

      // 3. Clear Space Calculations relative to Sticky Header (110px) & Bottom Nav (90px)
      const topHeaderOffset = Number(stepData.topOffset || 110);
      const bottomBarOffset = Number(stepData.bottomOffset || 90);

      const clearAbove = spotTop - topHeaderOffset;
      const clearBelow = screenHeight - bottomBarOffset - (spotTop + spotHeight);
      const estimatedCardHeight = Number(stepData.cardHeight || measuredCardHeight || 148);
      const preferred = stepData.preferredPlacement || stepData.arrow || 'auto';

      let isUp; // isUp = true means tooltip sits BELOW spotlight (arrow points UP)
      if (preferred === 'top' || preferred === 'above') {
        // Prefer tooltip ABOVE spotlight (isUp = false); fall back to below if not enough room
        isUp = clearAbove < estimatedCardHeight + 16;
      } else if (preferred === 'bottom' || preferred === 'below') {
        // Prefer tooltip BELOW spotlight (isUp = true); fall back to above if not enough room
        isUp = clearBelow >= estimatedCardHeight + 16 ? true : clearAbove < estimatedCardHeight + 16;
      } else {
        // Auto placement logic: Pick side with generous clearance
        if (clearBelow >= estimatedCardHeight + 16 && spotTop < screenHeight * 0.55) {
          isUp = true;
        } else if (clearAbove >= estimatedCardHeight + 16) {
          isUp = false;
        } else {
          isUp = clearBelow >= clearAbove;
        }
      }

      // 4. Component Center Alignment
      const anchorRatio = stepData.anchorX !== undefined ? stepData.anchorX : 0.5;
      const targetCenterX = safeLeft + safeWidth * anchorRatio;

      // 5. Adaptive Card Width with strict horizontal edge clamping
      const cardWidth = Math.min(stepData.maxCardWidth || 285, screenWidth - 32);
      const cardLeft = Math.max(
        SAFE_MARGIN,
        Math.min(targetCenterX - cardWidth / 2, screenWidth - cardWidth - SAFE_MARGIN)
      );

      // 6. Dynamic Pointer Arrow positioning anchored to targetCenterX
      const computedArrowLeft = Math.max(
        16,
        Math.min(targetCenterX - cardLeft - 5, cardWidth - 26)
      );

      // 7. Non-Overlapping Card Top Position with Strict Anti-Overlap Clamping
      let cardTop;
      if (isUp) {
        // Tooltip sits BELOW spotlight
        cardTop = spotTop + spotHeight + 16;
        cardTop = Math.max(spotTop + spotHeight + 12, cardTop);
        cardTop = Math.min(screenHeight - bottomBarOffset - estimatedCardHeight - 4, cardTop);
      } else {
        // Tooltip sits ABOVE spotlight
        cardTop = spotTop - estimatedCardHeight - 16;
        cardTop = Math.min(spotTop - estimatedCardHeight - 12, cardTop);
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
      setSpotlightCoords({
        top: finalSpotTop,
        left: finalSpotLeft,
        width: finalSpotWidth,
        height: finalSpotHeight,
      });

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
          Animated.timing(animSpotTop, {
            toValue: finalSpotTop,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animSpotLeft, {
            toValue: finalSpotLeft,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animSpotWidth, {
            toValue: finalSpotWidth,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animSpotHeight, {
            toValue: finalSpotHeight,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animCardTop, {
            toValue: finalCardTop,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animCardLeft, {
            toValue: finalCardLeft,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animArrowLeft, {
            toValue: finalArrowLeft,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animRadius, {
            toValue: computedRadius,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
            useNativeDriver: false,
          }),
          Animated.timing(animOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: false,
          }),
        ]).start();
      }
    },
    [
      animSpotTop,
      animSpotLeft,
      animSpotWidth,
      animSpotHeight,
      animCardTop,
      animCardLeft,
      animArrowLeft,
      animRadius,
      animOpacity,
      cardScale,
      cardTranslateY,
      keyboardHeight,
      measuredCardHeight,
      reduceMotion,
    ]
  );

  /**
   * Auto-scroll ScrollView BEFORE measuring so target is framed in upper-middle third
   */
  const scrollToTarget = useCallback(
    (stepData, callback) => {
      const activeScrollRef = stepData?.scrollRef || scrollRef;
      if (!stepData || !activeScrollRef?.current) {
        if (callback) callback();
        return;
      }

      const scrollInst = activeScrollRef.current;
      const rawScreenHeight = Dimensions.get('window').height || 640;

      if (stepData.scrollOffset !== undefined) {
        try {
          if (scrollInst.scrollTo) {
            scrollInst.scrollTo({
              y: Math.max(0, stepData.scrollOffset),
              animated: !reduceMotion,
            });
          } else if (scrollInst.scrollToOffset) {
            scrollInst.scrollToOffset({
              offset: Math.max(0, stepData.scrollOffset),
              animated: !reduceMotion,
            });
          }
        } catch (e) {}
        setTrackedTimeout(callback, reduceMotion ? 50 : 200);
        return;
      }

      if (stepData.ref?.current) {
        try {
          const targetNode = scrollInst.getNode
            ? scrollInst.getNode()
            : scrollInst._component || scrollInst;

          if (stepData.ref.current.measureLayout && targetNode) {
            stepData.ref.current.measureLayout(
              targetNode,
              (x, y) => {
                try {
                  // Frame target in upper-middle third (approx 28% from top)
                  const targetCenterMargin = Math.round(rawScreenHeight * 0.28);
                  const scrollOffset = Math.max(0, y - targetCenterMargin);
                  if (scrollInst.scrollTo) {
                    scrollInst.scrollTo({ y: scrollOffset, animated: !reduceMotion });
                  } else if (scrollInst.scrollToOffset) {
                    scrollInst.scrollToOffset({ offset: scrollOffset, animated: !reduceMotion });
                  }
                } catch (e) {}
                setTrackedTimeout(callback, reduceMotion ? 50 : 220);
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
    },
    [scrollRef, reduceMotion, setTrackedTimeout]
  );

  /**
   * Measure step target window coordinates after scroll animation completes
   */
  const measureStep = useCallback(
    (stepData, attempt = 0, onDone = null) => {
      if (!stepData) return;

      const applyStaticFallback = (sd) => {
        const screenWidth = Dimensions.get('window').width || 360;
        const fallbackCoords = {
          top: Number(sd?.spotlightTop) || 140,
          height: Number(sd?.spotlightHeight) || 80,
          left: 16,
          width: screenWidth - 32,
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
                  width: mwidth,
                };
                setSpotlightCoords(coords);
                animateToCoords(coords, stepData);
                if (onDone) onDone();

                // Dual-Measure Settling Pass: re-verify coordinates 140ms later after scroll/entrance anims finish
                if (attempt === 0) {
                  setTrackedTimeout(() => measureStep(stepData, 1), 140);
                }
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
                  width: mwidth,
                };
                setSpotlightCoords(coords);
                animateToCoords(coords, stepData);
                if (onDone) onDone();

                if (attempt === 0) {
                  setTrackedTimeout(() => measureStep(stepData, 1), 140);
                }
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
    },
    [setTrackedTimeout, animateToCoords]
  );

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
    stepData.maxCardWidth || 285,
    Dimensions.get('window').width - 32
  );

  const handleNext = async () => {
    HapticPatterns.selection();
    if (activeStep < steps.length - 1) {
      cardContentFade.stopAnimation();
      cardTranslateY.stopAnimation();
      cardScale.stopAnimation();

      setIsTransitioning(true);
      const nextStepIdx = activeStep + 1;
      const nextStepData = steps[nextStepIdx];

      Animated.parallel([
        Animated.timing(cardContentFade, { toValue: 0, duration: 90, useNativeDriver: true }),
        Animated.timing(animOpacity, { toValue: 0.3, duration: 90, useNativeDriver: false }),
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
              cardTranslateY.setValue(6);
              cardScale.setValue(0.98);
              Animated.parallel([
                Animated.timing(cardContentFade, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.timing(cardTranslateY, {
                  toValue: 0,
                  duration: 180,
                  easing: Easing.out(Easing.back(1.1)),
                  useNativeDriver: true,
                }),
                Animated.timing(cardScale, {
                  toValue: 1.0,
                  duration: 180,
                  easing: Easing.out(Easing.back(1.1)),
                  useNativeDriver: true,
                }),
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

  const maskId = `spotlightMask_${tourKey || 'default'}_${instanceIdRef.current}`;
  const screenWidth = Dimensions.get('window').width || 360;
  const screenHeight = Dimensions.get('window').height || 640;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent={true}>
      <View style={[s.wtOverlay, !spotlightCoords && s.wtOverlayCentered]} pointerEvents="box-none">
        {/* Lighter 30% Opacity SVG Mask Cutout - 60fps Lockstep Sync */}
        {spotlightCoords ? (
          <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <Mask id={maskId}>
                <SvgRect width="100%" height="100%" fill="white" />
                {computedShapeConfig.shape === 'circle' ? (
                  <AnimatedSvgCircle
                    cx={Animated.add(animSpotLeft, Animated.divide(animSpotWidth, 2))}
                    cy={Animated.add(animSpotTop, Animated.divide(animSpotHeight, 2))}
                    r={Animated.divide(Animated.add(animSpotWidth, animSpotHeight), 4)}
                    fill="black"
                  />
                ) : (
                  <AnimatedSvgRect
                    x={animSpotLeft}
                    y={animSpotTop}
                    width={animSpotWidth}
                    height={animSpotHeight}
                    rx={animRadius}
                    fill="black"
                  />
                )}
              </Mask>
            </Defs>
            <SvgRect
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.16)"
              mask={`url(#${maskId})`}
            />
          </Svg>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.16)' }]} pointerEvents="none" />
        )}

        {/* Soft Violet Glow Halo around Target Element - 60fps Lockstep Sync */}
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
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Swiggy-Style Compact Floating Tooltip Card */}
        <Animated.View
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Step ${activeStep + 1} of ${steps.length}. ${stepData.title}. ${stepData.desc}`}
          onLayout={(e) => {
            const h = e.nativeEvent?.layout?.height;
            if (h && Math.abs(h - measuredCardHeight) > 2) {
              setMeasuredCardHeight(h);
            }
          }}
          style={[
            s.wtCard,
            spotlightCoords
              ? {
                  position: 'absolute',
                  top: animCardTop,
                  left: animCardLeft,
                  width: cardWidthConst,
                }
              : {
                  position: 'relative',
                  alignSelf: 'center',
                  width: cardWidthConst,
                },
            { opacity: cardFade },
          ]}
          pointerEvents={isTransitioning ? 'none' : 'auto'}
        >
          {/* Rotated Pointer Arrow (Anchored dynamically to targetCenterX) */}
          {spotlightCoords && (
            <Animated.View
              style={[
                arrowConfig.isUp ? s.wtCardArrowUp : s.wtCardArrowDown,
                { left: animArrowLeft },
              ]}
            />
          )}

          <Animated.View
            style={{
              opacity: cardContentFade,
              transform: reduceMotion
                ? []
                : [{ translateY: cardTranslateY }, { scale: cardScale }],
            }}
          >
            <View style={s.wtCardHeader}>
              <View style={[s.wtIconWrap, stepData.hero && s.wtHeroIconWrap]}>
                {Icon && (
                  <Icon
                    size={14}
                    color={stepData.iconColor || '#7C3AED'}
                    strokeWidth={2.4}
                  />
                )}
              </View>
              <Text style={s.wtTitle} numberOfLines={1}>
                {stepData.title}
              </Text>
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

            {/* Description allowed up to 3 lines */}
            <Text style={s.wtDesc} numberOfLines={3} ellipsizeMode="tail">
              {stepData.desc}
            </Text>

            <View style={s.wtFooter}>
              {/* Progress Dots (● ○ ○ ○) */}
              <View
                style={s.wtDotsRow}
                accessibilityLabel={`Step ${activeStep + 1} of ${steps.length}`}
              >
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

              {/* Action Button */}
              <Pressable
                style={s.wtNextBtn}
                onPress={handleNext}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={
                  activeStep === steps.length - 1 ? 'Finish tour' : 'Next step'
                }
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
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.40)',
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  },
  wtCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  wtCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 6,
  },
  wtIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wtHeroIconWrap: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  wtTitle: {
    fontSize: 13,
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
    lineHeight: 16,
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
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 11,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  wtNextText: {
    fontSize: 11,
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
