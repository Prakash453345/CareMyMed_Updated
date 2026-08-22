import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

/**
 * LiquidConfirmButton — Premium liquid sweep confirmation button.
 * Smoothly sweeps from Take (Purple) to Taken (Emerald Checkmark & Border).
 */
export default function LiquidConfirmButton({
    taken = false,
    onPress,
    label = 'TAKE',
    takenLabel = 'TAKEN',
    disabled = false,
}) {
    const [isCompleting, setIsCompleting] = useState(false);
    const sweepAnim = useRef(new Animated.Value(taken ? 1 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const checkAnim = useRef(new Animated.Value(taken ? 1 : 0)).current;

    const prevTakenRef = useRef(taken);

    useEffect(() => {
        const wasTaken = prevTakenRef.current;
        prevTakenRef.current = taken;

        if (taken) {
            if (!wasTaken) {
                // Smooth transition from Untaken -> Taken
                Animated.parallel([
                    Animated.timing(sweepAnim, {
                        toValue: 1,
                        duration: 320,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: false,
                    }),
                    Animated.spring(checkAnim, {
                        toValue: 1,
                        friction: 6,
                        tension: 80,
                        useNativeDriver: false,
                    }),
                ]).start(() => {
                    setIsCompleting(false);
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    } catch (e) {}
                });
            } else {
                // Direct mount / state sync with taken = true
                sweepAnim.setValue(1);
                checkAnim.setValue(1);
                setIsCompleting(false);
            }
        } else {
            if (wasTaken) {
                // Transition from Taken -> Untaken
                Animated.parallel([
                    Animated.timing(sweepAnim, {
                        toValue: 0,
                        duration: 240,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: false,
                    }),
                    Animated.timing(checkAnim, {
                        toValue: 0,
                        duration: 180,
                        useNativeDriver: false,
                    }),
                ]).start(() => {
                    setIsCompleting(false);
                });
            } else {
                sweepAnim.setValue(0);
                checkAnim.setValue(0);
                setIsCompleting(false);
            }
        }
    }, [taken]);

    const handlePress = () => {
        if (disabled || taken || isCompleting) return;
        setIsCompleting(true);

        // Tactile depress animation
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.93,
                duration: 70,
                useNativeDriver: false,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 110,
                useNativeDriver: false,
            }),
        ]).start();

        try {
            Haptics.selectionAsync().catch(() => {});
        } catch (e) {}

        onPress?.();

        // Safety fallback to unblock if parent handler takes longer
        setTimeout(() => {
            setIsCompleting(false);
        }, 1200);
    };

    const containerBgColor = sweepAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#7C3AED', '#FFFFFF'],
    });

    const containerBorderColor = sweepAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', '#DCFCE7'],
    });

    const liquidWidth = sweepAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const liquidBgColor = sweepAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['#6D28D9', '#059669', '#DCFCE7'],
    });

    const textColor = sweepAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#FFFFFF', '#10B981'],
    });

    const checkScale = checkAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
    });

    const checkOpacity = checkAnim.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0, 0.8, 1],
    });

    const showCheck = taken || isCompleting;

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={handlePress}
                disabled={disabled || taken || isCompleting}
            >
                <Animated.View
                    style={[
                        s.btnContainer,
                        {
                            backgroundColor: containerBgColor,
                            borderColor: containerBorderColor,
                        },
                    ]}
                >
                    {/* Background Liquid Sweep Layer */}
                    <Animated.View
                        style={[
                            s.liquidFill,
                            {
                                width: liquidWidth,
                                backgroundColor: liquidBgColor,
                            },
                        ]}
                    />

                    {/* Button Content Layer */}
                    <View style={s.contentRow}>
                        {showCheck && (
                            <Animated.View
                                style={{
                                    opacity: taken ? 1 : checkOpacity,
                                    transform: [{ scale: checkScale }],
                                    marginRight: 4,
                                }}
                            >
                                <Check size={15} color="#10B981" strokeWidth={3} />
                            </Animated.View>
                        )}

                        <Animated.Text
                            style={[
                                s.btnText,
                                { color: textColor },
                            ]}
                        >
                            {taken ? (takenLabel || 'TAKEN') : (label || 'TAKE')}
                        </Animated.Text>
                    </View>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    btnContainer: {
        height: 38,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1.5,
    },
    liquidFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 12,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    btnText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
});
