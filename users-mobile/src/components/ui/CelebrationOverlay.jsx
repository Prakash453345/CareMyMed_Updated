import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ConfettiParticle = ({ index }) => {
  // 360-degree balanced radial explosion around origin
  const angle = ((index / 36) * 360 + (Math.random() * 16 - 8)) * (Math.PI / 180);
  const velocity = 60 + Math.random() * 130;
  const destX = Math.cos(angle) * velocity;
  const destY = Math.sin(angle) * velocity * 0.85 + 40; // Gentle gravity drop

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const txAnim = useRef(new Animated.Value(0)).current;
  const tyAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1 + Math.random() * 0.6,
      duration: 150,
      useNativeDriver: true,
    }).start();

    Animated.spring(txAnim, {
      toValue: destX,
      speed: 12,
      bounciness: 6,
      useNativeDriver: true,
    }).start();

    Animated.spring(tyAnim, {
      toValue: destY,
      speed: 12,
      bounciness: 6,
      useNativeDriver: true,
    }).start();

    Animated.timing(rotationAnim, {
      toValue: 360 + Math.random() * 720,
      duration: 1600,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.delay(800),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [destX, destY]);

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 1080],
    outputRange: ['0deg', '1080deg'],
  });

  const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];
  const particleColor = colors[index % colors.length];
  const size = 6 + Math.random() * 8;
  const isCircle = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          backgroundColor: particleColor,
          borderRadius: isCircle ? size / 2 : 2,
          opacity: opacityAnim,
          transform: [
            { translateX: txAnim },
            { translateY: tyAnim },
            { scale: scaleAnim },
            { rotate },
          ],
        },
      ]}
    />
  );
};

export default function CelebrationOverlay({ active, onComplete, origin }) {
  const [show, setShow] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (active) {
      setBurstKey((prev) => prev + 1);
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        if (onComplete) onComplete();
      }, 1600);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [active]);

  if (!show) return null;

  const originX = origin?.x ?? SCREEN_WIDTH / 2;
  const originY = origin?.y ?? SCREEN_HEIGHT * 0.45;

  const particles = Array.from({ length: 36 });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.burstContainer, { left: originX, top: originY }]}>
        {particles.map((_, i) => (
          <ConfettiParticle key={`${burstKey}-${i}`} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  burstContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
