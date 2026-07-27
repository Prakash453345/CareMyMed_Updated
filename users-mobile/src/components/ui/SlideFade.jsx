import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function SlideFade({
    children,
    visible = true,
    direction = 'up',
    distance = 16,
    duration = 250,
    style,
}) {
    const animValue = useRef(new Animated.Value(visible ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animValue, {
            toValue: visible ? 1 : 0,
            duration,
            useNativeDriver: true,
        }).start();
    }, [visible, duration, animValue]);

    const offset = direction === 'up' ? distance : direction === 'down' ? -distance : 0;

    const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [offset, 0],
    });

    return (
        <Animated.View style={[{ opacity: animValue, transform: [{ translateY }] }, style]}>
            {children}
        </Animated.View>
    );
}
