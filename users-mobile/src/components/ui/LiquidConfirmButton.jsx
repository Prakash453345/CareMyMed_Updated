import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, FONT, METRIC_FONT } from '../../theme';

/**
 * LiquidConfirmButton — Swiggy / PhonePe-grade liquid sweep confirmation button.
 * Single tap triggers a left-to-right emerald sweep, checkmark slide-in, and label morph.
 */
export default function LiquidConfirmButton({
    taken = false,
    onPress,
    label = 'Take Now',
    takenLabel = 'Taken',
    disabled = false,
}) {
    const sweepAnim = useRef(new Animated.Value(taken ? 1 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const checkAnim = useRef(new Animated.Value(taken ? 1 : 0)).current;
    const textOpacity = useRef(new Animated.Value(1)).current;

    const prevTakenRef = useRef(taken);

    useEffect(() => {
        const wasTaken = prevTakenRef.current;
        prevTakenRef.current = taken;

        if (taken) {
            Animated.parallel([
                Animated.timing(sweepAnim, {
                    toValue: 1,
                    duration: 280,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }),
                Animated.sequence([
                    Animated.delay(120),
                    Animated.parallel([
                        Animated.timing(textOpacity, {
                            toValue: 0.4,
                            duration: 60,
                            useNativeDriver: true,
                        }),
                        Animated.spring(checkAnim, {
                            toValue: 1,
                            friction: 7,
                            tension: 90,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.timing(textOpacity, {
                        toValue: 1,
                        duration: 80,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => {
                if (!wasTaken) {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    } catch (e) {}
                }
            });
        } else {
            Animated.parallel([
                Animated.timing(sweepAnim, {
                    toValue: 0,
                    duration: 220,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: false,
                }),
                Animated.timing(checkAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [taken]);

    const handlePress = () => {
        if (disabled || taken) return;

        // 1. Immediate tactile depress
        Animated.timing(scaleAnim, {
            toValue: 0.94,
            duration: 60,
            useNativeDriver: true,
        }).start(() => {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 100,
                useNativeDriver: true,
            }).start();
        });

        // 2. Trigger Haptic on initial tap
        try {
            Haptics.selectionAsync().catch(() => {});
        } catch (e) {}

        // 3. Trigger Parent Handler
        onPress?.();
    };

    const sweepWidth = sweepAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const checkTranslateX = checkAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-10, 0],
    });

    const checkScale = checkAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
    });

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                style={s.btnContainer}
                onPress={handlePress}
                disabled={disabled || taken}
            >
                {/* Background Liquid Sweep Layer */}
                <Animated.View
                    style={[
                        s.liquidFill,
                        { width: sweepWidth },
                    ]}
                />

                {/* Button Content Layer */}
                <View style={s.contentRow}>
                    <Animated.View
                        style={{
                            opacity: checkAnim,
                            transform: [
                                { translateX: checkTranslateX },
                                { scale: checkScale },
                            ],
                            marginRight: checkAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 4],
                            }),
                        }}
                    >
                        <Check size={14} color="#FFFFFF" strokeWidth={2.8} />
                    </Animated.View>

                    <Animated.Text
                        style={[
                            s.btnText,
                            taken && s.btnTextTaken,
                            { opacity: textOpacity },
                        ]}
                    >
                        {taken ? takenLabel : label}
                    </Animated.Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    btnContainer: {
        height: 38,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    btnContainerTaken: {
        backgroundColor: '#059669',
    },
    liquidFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#059669',
        borderRadius: 12,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    btnTextTaken: {
        color: '#FFFFFF',
    },
});
