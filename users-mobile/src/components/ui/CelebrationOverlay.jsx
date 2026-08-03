import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Living Glass Particle Palette (Soft Violet, Emerald, Pearl Frosted Discs)
const GLASS_PALETTE = [
  'rgba(16, 185, 129, 0.85)',  // Emerald
  'rgba(52, 211, 153, 0.85)',  // Mint Emerald
  'rgba(139, 92, 246, 0.85)',  // Violet
  'rgba(192, 132, 252, 0.85)', // Light Purple
  'rgba(245, 158, 11, 0.80)',  // Soft Amber
  'rgba(255, 255, 255, 0.95)', // Frosted Pearl
];

const GlassSparkleParticle = ({ index, total }) => {
  // Parabolic upward initial velocity + soft gravity arc
  const angle = ((index / total) * 360 + (Math.random() * 20 - 10)) * (Math.PI / 180);
  const speed = 35 + Math.random() * 75;
  const destX = Math.cos(angle) * speed;
  const destY = Math.sin(angle) * speed * 0.7 - 15; // Initial upward bias (-15px)

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const txAnim = useRef(new Animated.Value(0)).current;
  const tyAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      // Scale pop (0 -> 1.1 -> 0)
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8 + Math.random() * 0.5,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
      // Radial spring dispersal
      Animated.spring(txAnim, {
        toValue: destX,
        speed: 16,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.spring(tyAnim, {
        toValue: destY + 22, // Gentle gravity arc downward after peak
        speed: 14,
        bounciness: 3,
        useNativeDriver: true,
      }),
      // Micro rotation
      Animated.timing(rotationAnim, {
        toValue: 180 + Math.random() * 360,
        duration: 700,
        useNativeDriver: true,
      }),
      // Quick opacity fade (disappears before 750ms)
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [destX, destY]);

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 540],
    outputRange: ['0deg', '540deg'],
  });

  const particleColor = GLASS_PALETTE[index % GLASS_PALETTE.length];
  const size = 6 + Math.random() * 6;
  const isCircle = Math.random() > 0.3;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          backgroundColor: particleColor,
          borderRadius: isCircle ? size / 2 : 3,
          borderColor: 'rgba(255, 255, 255, 0.45)',
          borderWidth: 0.8,
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

// Soft Emerald Success Ripple Effect
const EmeraldRipple = () => {
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const opacityAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 2.4,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.emeraldRipple,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    />
  );
};

export default function CelebrationOverlay({ active, onComplete, origin, tier = "medication" }) {
  const [show, setShow] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (active) {
      setBurstKey((prev) => prev + 1);
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        if (onComplete) onComplete();
      }, 800); // Quick 800ms total lifetime
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [active]);

  if (!show) return null;

  // Origin centering: localized over the checkmark or completed card
  const originX = origin?.x ?? SCREEN_WIDTH * 0.22;
  const originY = origin?.y ?? SCREEN_HEIGHT * 0.42;

  // Particle count based on rarity tier: 20 for single med, 26 for slot/day
  const particleCount = tier === "day" ? 28 : tier === "slot" ? 24 : 20;
  const particles = Array.from({ length: particleCount });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.burstContainer, { left: originX, top: originY }]}>
        <EmeraldRipple key={`ripple-${burstKey}`} />
        {particles.map((_, i) => (
          <GlassSparkleParticle key={`${burstKey}-${i}`} index={i} total={particleCount} />
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
    zIndex: 9999,
  },
  emeraldRipple: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  particle: {
    position: 'absolute',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
