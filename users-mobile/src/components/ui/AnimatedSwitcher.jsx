import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

export default function AnimatedSwitcher({
    children,
    transitionKey,
    style,
    duration = 250,
    direction = 'slide',
}) {
    const [currentChild, setCurrentChild] = useState(children);
    const animValue = useRef(new Animated.Value(1)).current;
    const prevKeyRef = useRef(transitionKey);

    useEffect(() => {
        if (transitionKey !== prevKeyRef.current) {
            prevKeyRef.current = transitionKey;
            Animated.timing(animValue, {
                toValue: 0,
                duration: duration / 2,
                useNativeDriver: true,
            }).start(() => {
                setCurrentChild(children);
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: duration / 2,
                    useNativeDriver: true,
                }).start();
            });
        } else {
            setCurrentChild(children);
        }
    }, [transitionKey, children, duration, animValue]);

    const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [direction === 'slide' ? 20 : 0, 0],
    });

    const scale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [direction === 'slide' ? 0.98 : 1, 1],
    });

    return (
        <View style={[styles.container, style]}>
            <Animated.View style={{ opacity: animValue, transform: [{ translateX }, { scale }] }}>
                {currentChild}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
});
