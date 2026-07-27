import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function StepTransition({ children, stepKey, direction = 'forward', duration = 250, style }) {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        animValue.setValue(0);
        Animated.timing(animValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
        }).start();
    }, [stepKey, duration, animValue]);

    const offset = direction === 'forward' ? 30 : -30;

    const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [offset, 0],
    });

    return (
        <Animated.View style={[{ opacity: animValue, transform: [{ translateX }] }, style]}>
            {children}
        </Animated.View>
    );
}
