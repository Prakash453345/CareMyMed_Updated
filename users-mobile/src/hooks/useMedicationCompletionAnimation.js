import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Custom hook to manage instance-scoped material state transitions for medication cards.
 * Provides synchronized background, border, icon, title, and lift animation.
 */
export function useMedicationCompletionAnimation(isTaken, defaultIconBg = '#F1F5F9', defaultBorder = '#F1F5F9') {
  const animProgress = useRef(new Animated.Value(isTaken ? 1 : 0)).current;
  const cardLiftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTaken) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(cardLiftAnim, {
            toValue: -2,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(cardLiftAnim, {
            toValue: 0,
            friction: 6,
            tension: 70,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(animProgress, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(animProgress, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [isTaken]);

  const cardBgColor = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#F0FDF4'],
  });

  const cardBorderColor = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [defaultBorder || '#E2E8F0', '#A7F3D0'],
  });

  const iconBgColor = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [defaultIconBg || '#EEF2FF', '#ECFDF5'],
  });

  const titleColor = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0F172A', '#0F172A'],
  });

  return {
    animProgress,
    cardLiftAnim,
    cardBgColor,
    cardBorderColor,
    iconBgColor,
    titleColor,
  };
}
