import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function ScaleFade({ children, visible = true, initialScale = 0.92, duration = 200, style }) {
    const animValue = useRef(new Animated.Value(visible ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animValue, {
            toValue: visible ? 1 : 0,
            duration,
            useNativeDriver: true,
        }).start();
    }, [visible, duration, animValue]);

    const scale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [initialScale, 1],
    });

    return (
        <Animated.View style={[{ opacity: animValue, transform: [{ scale }] }, style]}>
            {children}
        </Animated.View>
    );
}
