/**
 * Living Glass Runtime v1 — LivingGlassOrb Component
 *
 * Pulsing AI Orb with living lifecycle:
 *   idle ──> pressed ──> awakening ──> active ──> dismissing ──> idle
 * Context-aware health spectrum glow (emerald for 100% adherence, amber for missed doses, violet default).
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle } from 'lucide-react-native';
import orbController, { ORB_STATES } from '../runtime/OrbController';
import glassMaterials from '../tokens/glassMaterials';
import HeroTransition from './HeroTransition';

export default function LivingGlassOrb({
    size = 58,
    healthStatus = 'violet', // 'emerald' | 'amber' | 'violet'
    onPress,
    sharedId = 'home_glass_orb',
    style,
}) {
    const [orbState, setOrbState] = useState(orbController.getState());
    const breathAnim = useRef(new Animated.Value(0)).current;
    const pressScaleAnim = useRef(new Animated.Value(1)).current;

    const accent = glassMaterials.accents[healthStatus] || glassMaterials.accents.violet;

    useEffect(() => {
        const unsubscribe = orbController.subscribe((newState) => {
            setOrbState(newState);
        });
        return unsubscribe;
    }, []);

    // Idle breathing cycle
    useEffect(() => {
        if (orbState === ORB_STATES.IDLE || orbState === ORB_STATES.ACTIVE) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(breathAnim, {
                        toValue: 1,
                        duration: 1300,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(breathAnim, {
                        toValue: 0,
                        duration: 1300,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
    }, [orbState]);

    const handlePressIn = () => {
        orbController.setState(ORB_STATES.PRESSED);
        Animated.timing(pressScaleAnim, {
            toValue: 0.98, // 2% compression
            duration: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.timing(pressScaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePress = () => {
        orbController.setState(ORB_STATES.AWAKENING);
        onPress?.();
    };

    const coreScale = breathAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.0, 1.05],
    });

    const glowOpacity = breathAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.15, 0.35],
    });

    return (
        <HeroTransition id={sharedId} style={style}>
            <Animated.View
                style={[
                    styles.wrapper,
                    {
                        width: size + 16,
                        height: size + 16,
                        transform: [{ scale: pressScaleAnim }],
                    },
                ]}
            >
                {/* Outer Glow Ring */}
                <Animated.View
                    style={[
                        styles.glowRing,
                        {
                            width: size + 16,
                            height: size + 16,
                            borderRadius: (size + 16) / 2,
                            backgroundColor: accent.outerGlow,
                            opacity: glowOpacity,
                        },
                    ]}
                />

                {/* Inner Breathing Core */}
                <Pressable
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={handlePress}
                    style={[styles.orbCore, { width: size, height: size, borderRadius: size / 2 }]}
                >
                    <Animated.View style={{ flex: 1, width: '100%', transform: [{ scale: coreScale }] }}>
                        <LinearGradient
                            colors={[accent.innerGlow, accent.core]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradient}
                        >
                            <MessageCircle size={26} color="#FFFFFF" strokeWidth={2.5} fill="rgba(255,255,255,0.15)" />
                        </LinearGradient>
                    </Animated.View>
                </Pressable>
            </Animated.View>
        </HeroTransition>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        position: 'absolute',
    },
    orbCore: {
        overflow: 'hidden',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    gradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
