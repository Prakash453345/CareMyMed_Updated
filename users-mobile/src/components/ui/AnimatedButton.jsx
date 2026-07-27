import React, { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, View, Animated } from 'react-native';
import { HapticPatterns } from '../../utils/haptics';

export default function AnimatedButton({
    children,
    onPress,
    disabled = false,
    loading = false,
    hapticType = 'selection',
    pressScale = 0.97,
    backgroundColor = '#7C3AED',
    rippleColor = 'rgba(255, 255, 255, 0.2)',
    style,
    contentStyle,
    loaderColor = '#FFFFFF',
    ...props
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(disabled ? 0.5 : 1)).current;

    useEffect(() => {
        Animated.timing(opacityAnim, {
            toValue: disabled ? 0.5 : 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [disabled, opacityAnim]);

    const handlePressIn = () => {
        if (disabled || loading) return;
        Animated.spring(scaleAnim, {
            toValue: pressScale,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
        }).start();
    };

    const handlePress = () => {
        if (disabled || loading) return;
        if (hapticType !== 'none' && HapticPatterns[hapticType]) {
            HapticPatterns[hapticType]();
        }
        if (onPress) onPress();
    };

    return (
        <Pressable
            disabled={disabled || loading}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            android_ripple={
                !disabled && !loading
                    ? { color: rippleColor, borderless: false }
                    : null
            }
            style={style}
            {...props}
        >
            <Animated.View
                style={[
                    styles.button,
                    { backgroundColor, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
                ]}
            >
                <View style={[styles.contentContainer, contentStyle]}>
                    {loading ? (
                        <ActivityIndicator size="small" color={loaderColor} testID="loader" />
                    ) : (
                        children
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
