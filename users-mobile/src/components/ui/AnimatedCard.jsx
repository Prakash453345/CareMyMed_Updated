import React, { useRef } from 'react';
import { StyleSheet, Pressable, View, Animated } from 'react-native';
import { useMotion } from '../../theme/MotionProvider';
import { HapticPatterns } from '../../utils/haptics';

export default function AnimatedCard({
    children,
    onPress,
    pressScale = 1.01,
    hapticType = 'selection', // 'selection' | 'log' | 'none'
    glowColor = '#C084FC',
    enableGlow = false,
    style,
    ...props
}) {
    const { reduceMotion } = useMotion();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (reduceMotion) return;
        Animated.spring(scaleAnim, {
            toValue: pressScale,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        if (reduceMotion) return;
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
        }).start();
    };

    const handlePress = () => {
        if (onPress) {
            if (hapticType !== 'none' && HapticPatterns[hapticType]) {
                HapticPatterns[hapticType]();
            }
            onPress();
        }
    };

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress ? handlePress : undefined}
            disabled={!onPress}
            style={[styles.outerCard, style]}
            {...props}
        >
            <Animated.View
                style={[
                    styles.innerCard,
                    { transform: [{ scale: scaleAnim }] },
                    enableGlow && { borderColor: glowColor, borderWidth: 1.5 },
                ]}
            >
                {children}
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    outerCard: {
        borderRadius: 24,
        elevation: 2,
    },
    innerCard: {
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
    },
});
