import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Modal } from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { useReduceMotion } from '../../theme';
import { HapticPatterns } from '../../utils/haptics';

export default function GuideOverlay({
  visible,
  steps = [],
  stepIndex = 0,
  onNext,
  onSkip,
}) {
  const reduceMotion = useReduceMotion();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const currentStep = steps[stepIndex] || null;

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
      slideAnim.setValue(16);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, stepIndex, reduceMotion]);

  if (!visible || !currentStep) return null;

  const IconComp = currentStep.icon || Sparkles;
  const isLast = stepIndex === steps.length - 1;

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

        <Animated.View
          style={[
            styles.tooltipCard,
            currentStep.preferredPlacement === 'above' ? styles.tooltipAbove : styles.tooltipBelow,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <View style={[styles.iconBox, { backgroundColor: (currentStep.iconColor || '#6366F1') + '15' }]}>
                <IconComp size={18} color={currentStep.iconColor || '#6366F1'} strokeWidth={2.5} />
              </View>
              <Text style={styles.titleText}>{currentStep.title}</Text>
            </View>
            <Pressable onPress={() => {
              try {
                if (HapticPatterns && HapticPatterns.selection) HapticPatterns.selection();
              } catch (e) {}
              if (onSkip) onSkip();
            }} hitSlop={12}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          <Text style={styles.descText}>{currentStep.desc}</Text>

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
              {!isLast && <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />}
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
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltipCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
  },
  tooltipBelow: {
    marginTop: 40,
  },
  tooltipAbove: {
    marginBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  descText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#475569',
    lineHeight: 21,
    marginBottom: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    width: 20,
    backgroundColor: '#7C3AED',
  },
  stepDotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
  },
  nextBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
