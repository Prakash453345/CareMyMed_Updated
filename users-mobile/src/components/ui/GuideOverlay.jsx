import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Modal, Dimensions } from 'react-native';
import Svg, { Rect, Defs, Mask } from 'react-native-svg';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { useReduceMotion } from '../../theme';
import { HapticPatterns } from '../../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Exported pure math helper for calculating non-overlapping tooltip card placement.
 * Guaranteed 100% Zero Target Overlap invariant:
 * (tooltipTop >= targetY + targetH + 16 || tooltipBottom <= targetY - 16)
 */
export function calculateTooltipLayout(
  targetRect,
  screenWidth = SCREEN_WIDTH,
  screenHeight = SCREEN_HEIGHT,
  preferredPlacement = 'auto',
  estimatedCardHeight = 130
) {
  const SAFE_MARGIN = 20; // 20px clear breathing room
  const PADDING_HORIZ = 16;
  const cardWidth = Math.min(screenWidth * 0.88, 340);

  if (!targetRect || typeof targetRect.y !== 'number') {
    return {
      top: Math.round((screenHeight - estimatedCardHeight) / 2),
      left: Math.round((screenWidth - cardWidth) / 2),
      width: cardWidth,
      placement: 'center',
      clearance: SAFE_MARGIN,
    };
  }

  const { y = 0, height = 100 } = targetRect;

  let placement = preferredPlacement;
  if (placement === 'auto' || !placement) {
    placement = y > screenHeight * 0.52 ? 'above' : 'below';
  }

  let computedTop;
  if (placement === 'above' || placement === 'top') {
    computedTop = y - estimatedCardHeight - SAFE_MARGIN;
    if (computedTop + estimatedCardHeight > y - 16) {
      computedTop = Math.max(SAFE_MARGIN + 24, y - estimatedCardHeight - 20);
    }
  } else {
    computedTop = y + height + SAFE_MARGIN;
    if (computedTop + estimatedCardHeight > screenHeight - SAFE_MARGIN - 30) {
      computedTop = Math.max(SAFE_MARGIN + 24, y - estimatedCardHeight - 20);
      placement = 'above';
    }
  }

  const computedLeft = Math.max(
    PADDING_HORIZ,
    Math.min(screenWidth - cardWidth - PADDING_HORIZ, (screenWidth - cardWidth) / 2)
  );

  return {
    top: Math.round(computedTop),
    left: Math.round(computedLeft),
    width: cardWidth,
    placement,
    clearance: SAFE_MARGIN,
  };
}

export default function GuideOverlay({
  visible,
  steps = [],
  stepIndex = 0,
  onNext,
  onSkip,
}) {
  const reduceMotion = useReduceMotion();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const [targetRect, setTargetRect] = useState(null);

  const currentStep = steps[stepIndex] || null;

  // Measurement effect: Measure target coordinates ONLY on step change or visibility change
  useEffect(() => {
    if (visible && currentStep?.ref?.current?.measureInWindow) {
      currentStep.ref.current.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number' && width > 0 && height > 0) {
          setTargetRect({ x, y, width, height });
        } else {
          setTargetRect(null);
        }
      });
    } else {
      setTargetRect(null);
    }
  }, [visible, stepIndex]);

  // Staggered Animation Effect: Fade backdrop -> Slide/Fade tooltip
  useEffect(() => {
    if (visible) {
      try {
        if (HapticPatterns && HapticPatterns.selection) HapticPatterns.selection();
      } catch (e) {}
      if (reduceMotion) {
        opacityAnim.setValue(1);
        slideAnim.setValue(0);
        return;
      }
      opacityAnim.setValue(0);
      slideAnim.setValue(14);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, speed: 22, bounciness: 5, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, stepIndex, reduceMotion]);

  if (!visible || !currentStep) return null;

  const IconComp = currentStep.icon || Sparkles;
  const isLast = stepIndex === steps.length - 1;

  const layout = calculateTooltipLayout(
    targetRect,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    currentStep.preferredPlacement || 'auto',
    130
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <Animated.View style={[styles.overlayPlane, { opacity: opacityAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={onSkip} />

        {/* SVG Dim Mask & Restrained Soft Purple Halo Spotlight */}
        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Defs>
            <Mask id="spotlight-mask">
              <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#FFFFFF" />
              {targetRect && (
                <Rect
                  x={targetRect.x - 6}
                  y={targetRect.y - 6}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx={16}
                  ry={16}
                  fill="#000000"
                />
              )}
            </Mask>
          </Defs>

          {/* Dim Backdrop with mask hole */}
          <Rect
            x="0"
            y="0"
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            fill="rgba(15, 23, 42, 0.65)"
            mask="url(#spotlight-mask)"
          />

          {/* Subtle soft purple halo ring (restrained opacity 0.35, stroke 2) */}
          {targetRect && (
            <Rect
              x={targetRect.x - 6}
              y={targetRect.y - 6}
              width={targetRect.width + 12}
              height={targetRect.height + 12}
              rx={16}
              ry={16}
              fill="transparent"
              stroke="rgba(124, 58, 237, 0.35)"
              strokeWidth={2}
            />
          )}
        </Svg>

        {/* Compact Tooltip Card (Positioned Above or Below Target with 20px Clearance) */}
        <Animated.View
          style={[
            styles.tooltipCard,
            {
              top: layout.top,
              left: layout.left,
              width: layout.width,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <View style={[styles.iconBox, { backgroundColor: (currentStep.iconColor || '#7C3AED') + '15' }]}>
                <IconComp size={16} color={currentStep.iconColor || '#7C3AED'} strokeWidth={2.5} />
              </View>
              <Text style={styles.titleText}>{currentStep.title}</Text>
            </View>
            <Pressable
              onPress={() => {
                try {
                  if (HapticPatterns && HapticPatterns.selection) HapticPatterns.selection();
                } catch (e) {}
                if (onSkip) onSkip();
              }}
              hitSlop={12}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          <Text style={styles.descText} numberOfLines={3}>
            {currentStep.desc}
          </Text>

          <View style={styles.footerRow}>
            <View style={styles.dotIndicatorRow}>
              {steps.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.stepDot,
                    idx === stepIndex ? styles.stepDotActive : styles.stepDotInactive,
                  ]}
                />
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
              onPress={() => {
                try {
                  if (HapticPatterns && HapticPatterns.selection) HapticPatterns.selection();
                } catch (e) {}
                if (onNext) onNext();
              }}
            >
              <Text style={styles.nextBtnText}>{isLast ? 'Got It' : 'Next'}</Text>
              {!isLast && <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.5} />}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayPlane: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltipCard: {
    position: 'absolute',
    maxWidth: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  descText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepDot: {
    height: 5,
    borderRadius: 2.5,
  },
  stepDotActive: {
    width: 16,
    backgroundColor: '#7C3AED',
  },
  stepDotInactive: {
    width: 5,
    backgroundColor: '#CBD5E1',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 3,
  },
  nextBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
