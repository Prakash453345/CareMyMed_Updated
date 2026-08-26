import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { ShieldPlus } from 'lucide-react-native';
import { colors, text, TYPOGRAPHY } from '../../theme';
import { useMotion } from '../../theme/MotionProvider';

const { width: SW, height: SH } = Dimensions.get('window');

export default function BrandedSplashScreen({
    isReady = false,
    isNewUser = false,
    onFinish,
}) {
    const { reduceMotion } = useMotion();
    const [syncMessage, setSyncMessage] = useState(
        isNewUser ? 'Setting things up…' : 'Loading your care plan…'
    );

    // Animation values
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.85)).current;
    const glowScale = useRef(new Animated.Value(0.8)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const screenOpacity = useRef(new Animated.Value(1)).current;

    const startTimeRef = useRef(Date.now());
    const hasCompletedRef = useRef(false);

    useEffect(() => {
        if (reduceMotion) {
            logoOpacity.setValue(1);
            logoScale.setValue(1);
            textOpacity.setValue(1);
        } else {
            // Beat 2: Logo fades + scales in (400ms -> 1100ms)
            const beat2Timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(logoOpacity, {
                        toValue: 1,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.spring(logoScale, {
                        toValue: 1,
                        friction: 7,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowOpacity, {
                        toValue: 0.18,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.spring(glowScale, {
                        toValue: 1.2,
                        friction: 6,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 400);

            // Beat 3: Sync message fades in (1100ms -> 1900ms)
            const beat3Timer = setTimeout(() => {
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            }, 1100);

            // Long network fallback (>3.5s)
            const fallbackTimer = setTimeout(() => {
                if (!hasCompletedRef.current) {
                    setSyncMessage('Almost there…');
                }
            }, 3500);

            return () => {
                clearTimeout(beat2Timer);
                clearTimeout(beat3Timer);
                clearTimeout(fallbackTimer);
            };
        }
    }, [reduceMotion]);

    // Handle transition to app once isReady is true and 1.9s floor has passed
    useEffect(() => {
        if (!isReady || hasCompletedRef.current) return;

        const elapsed = Date.now() - startTimeRef.current;
        const remainingDelay = Math.max(0, 1900 - elapsed);

        const transitionTimer = setTimeout(() => {
            hasCompletedRef.current = true;
            if (reduceMotion) {
                if (onFinish) onFinish();
            } else {
                // Beat 4: 200ms cross-fade directly into mounted chrome
                Animated.timing(screenOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => {
                    if (onFinish) onFinish();
                });
            }
        }, remainingDelay);

        return () => clearTimeout(transitionTimer);
    }, [isReady, onFinish, reduceMotion, screenOpacity]);

    return (
        <Animated.View
            style={[
                styles.container,
                { opacity: screenOpacity },
            ]}
            pointerEvents="none"
        >
            {/* Radial glow background halo */}
            <Animated.View
                style={[
                    styles.glowCircle,
                    {
                        opacity: glowOpacity,
                        transform: [{ scale: glowScale }],
                    },
                ]}
            />

            {/* Logo Mark */}
            <Animated.View
                style={[
                    styles.logoWrapper,
                    {
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                    },
                ]}
            >
                <View style={styles.iconCircle}>
                    <ShieldPlus size={44} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={styles.brandTitle}>CareMyMed</Text>
            </Animated.View>

            {/* Sync Beat Message */}
            <Animated.View
                style={[
                    styles.syncWrapper,
                    { opacity: textOpacity },
                ]}
            >
                <Text style={styles.syncText}>{syncMessage}</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.primary, // Brand purple #7C3AED
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
    },
    glowCircle: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#FFFFFF',
    },
    logoWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 16,
    },
    brandTitle: {
        ...TYPOGRAPHY.h1,
        color: text.inverse,
        letterSpacing: -0.4,
    },
    syncWrapper: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    syncText: {
        ...TYPOGRAPHY.chip,
        color: text.inverse,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        letterSpacing: 0.2,
        opacity: 0.9,
    },
});
