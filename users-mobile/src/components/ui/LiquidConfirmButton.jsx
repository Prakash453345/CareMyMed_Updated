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
    label = 'Mark Slot as Taken',
    takenLabel = 'Taken',
    disabled = false,
}) {
    const sweepAnim = useRef(new Animated.Value(taken ? 1 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const checkAnim = useRef(new Animated.Value(taken ? 1 : 0)).current;
    const textOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (taken) {
            sweepAnim.setValue(1);
            checkAnim.setValue(1);
        } else {
            sweepAnim.setValue(0);
            checkAnim.setValue(0);
        }
    }, [taken]);

    const handlePress = () => {
        if (disabled || taken) return;

        // 1. Immediate tactile depress
        Animated.timing(scaleAnim, {
            toValue: 0.96,
            duration: 50,
            useNativeDriver: true,
        }).start(() => {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 100,
                useNativeDriver: true,
            }).start();
        });

        // 2. Trigger Haptic
        try {
            Haptics.selectionAsync().catch(() => {});
        } catch (e) {}

        // 3. Staggered Liquid Sweep Animation
        // 60ms: Liquid sweep (0% -> 100% width over 320ms)
        // 220ms: Checkmark slides in
        Animated.parallel([
            Animated.timing(sweepAnim, {
                toValue: 1,
                duration: 320,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.sequence([
                Animated.delay(160),
                Animated.parallel([
                    Animated.timing(textOpacity, {
                        toValue: 0.3,
                        duration: 80,
                        useNativeDriver: true,
                    }),
                    Animated.spring(checkAnim, {
                        toValue: 1,
                        friction: 7,
                        tension: 80,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } catch (e) {}
        });

        // 4. Trigger Parent Handler
        onPress?.();
    };

    const sweepWidth = sweepAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const checkTranslateX = checkAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-12, 0],
    });

    const checkScale = checkAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
    });

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                style={[s.btnContainer, taken && s.btnContainerTaken]}
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
                    {taken || sweepAnim._value > 0 ? (
                        <Animated.View
                            style={{
                                opacity: checkAnim,
                                transform: [
                                    { translateX: checkTranslateX },
                                    { scale: checkScale },
                                ],
                                marginRight: 6,
                            }}
                        >
                            <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                        </Animated.View>
                    ) : null}

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
        height: 44,
        borderRadius: radius.md || 12,
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
        borderRadius: radius.md || 12,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 14,
        ...FONT.bold,
        letterSpacing: -0.2,
    },
    btnTextTaken: {
        color: '#FFFFFF',
    },
});
