import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Strict CareMyMed Brand Palette (Emerald, Violet, Soft Cyan, Frosted White)
const BRAND_GLASS_PALETTE = [
  'rgba(16, 185, 129, 0.90)',  // Emerald
  'rgba(52, 211, 153, 0.85)',  // Mint
  'rgba(139, 92, 246, 0.90)',  // Violet
  'rgba(192, 132, 252, 0.85)', // Light Purple
  'rgba(6, 182, 212, 0.85)',   // Soft Cyan
  'rgba(255, 255, 255, 0.95)', // Frosted Pearl
];

const GlassSparkleParticle = ({ index, total, isHero, isMedium }) => {
  // Parabolic upward initial velocity + soft gravity arc
  const angle = ((index / total) * 360 + (Math.random() * 16 - 8)) * (Math.PI / 180);
  const distance = isHero ? 75 : isMedium ? 48 : 28 + Math.random() * 20;
  const destX = Math.cos(angle) * distance * (isHero ? 0.35 : 1);
  const destY = isHero
    ? -75
    : Math.sin(angle) * distance * 0.7 - (isMedium ? 20 : 10); // Hero travels highest

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const txAnim = useRef(new Animated.Value(0)).current;
  const tyAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const delayMs = isHero ? 0 : Math.floor(Math.random() * 90);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        // Scale pop (0 -> 1.1 -> 0)
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: isHero ? 1.3 : isMedium ? 1.0 : 0.7,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: isHero ? 580 : 460,
            useNativeDriver: true,
          }),
        ]),
        // Dispersal
        Animated.spring(txAnim, {
          toValue: destX,
          speed: isHero ? 12 : 16,
          bounciness: 4,
          useNativeDriver: true,
        }),
        Animated.spring(tyAnim, {
          toValue: destY + (isHero ? 15 : 20), // Gravity arc after peak
          speed: isHero ? 10 : 14,
          bounciness: 3,
          useNativeDriver: true,
        }),
        // Rotation
        Animated.timing(rotationAnim, {
          toValue: isHero ? 360 : 180 + Math.random() * 180,
          duration: 650,
          useNativeDriver: true,
        }),
        // Opacity fade
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [destX, destY, delayMs, isHero, isMedium]);

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const particleColor = isHero
    ? '#10B981'
    : BRAND_GLASS_PALETTE[index % BRAND_GLASS_PALETTE.length];
  const size = isHero ? 12 : isMedium ? 8 : 4.5;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          backgroundColor: particleColor,
          borderRadius: isHero ? 3 : isMedium ? size / 2 : 2,
          borderColor: 'rgba(255, 255, 255, 0.55)',
          borderWidth: isHero ? 1.5 : 0.8,
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
  const opacityAnim = useRef(new Animated.Value(0.80)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 2.2,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
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
      }, 750); // Quick 750ms total lifetime
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [active]);

  if (!show) return null;

  // Origin centering: localized over the checkmark or completed card
  const originX = origin?.x ?? SCREEN_WIDTH * 0.22;
  const originY = origin?.y ?? SCREEN_HEIGHT * 0.42;

  // Hierarchical Particle Structure: 1 Hero, 4 Medium Orbs, 10 Micro Sparkles
  const totalCount = tier === "day" ? 22 : 15;
  const particles = Array.from({ length: totalCount });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.burstContainer, { left: originX, top: originY }]}>
        <EmeraldRipple key={`ripple-${burstKey}`} />
        {particles.map((_, i) => (
          <GlassSparkleParticle
            key={`${burstKey}-${i}`}
            index={i}
            total={totalCount}
            isHero={i === 0}
            isMedium={i >= 1 && i <= 4}
          />
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
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
  },
  particle: {
    position: 'absolute',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});
