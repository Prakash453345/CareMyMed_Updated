import React, { useRef } from 'react';
import { Pressable, Animated } from 'react-native';
import { reanimatedMotion } from '../../theme/reanimatedMotion';
import { useMotion } from '../../theme/MotionProvider';
import { HapticPatterns } from '../../utils/haptics';

export default function ScalePressable({
    children,
    onPress,
    onLongPress,
    pressScale,
    hapticType = 'tap',
    disabled = false,
    style,
    activeOpacity = 1,
    ...props
}) {
    const { reduceMotion } = useMotion();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const resolvedScale = pressScale ?? reanimatedMotion.scales?.pressed ?? 0.98;

    const handlePressIn = () => {
        if (reduceMotion) return;
        Animated.spring(scaleAnim, {
            toValue: resolvedScale,
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
        if (disabled) return;
        if (hapticType !== 'none' && HapticPatterns[hapticType]) {
            HapticPatterns[hapticType]();
        }
        if (onPress) onPress();
    };

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            onLongPress={onLongPress}
            disabled={disabled}
            style={style}
            {...props}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {children}
            </Animated.View>
        </Pressable>
    );
}
