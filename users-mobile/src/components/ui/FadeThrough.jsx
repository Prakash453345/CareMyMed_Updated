import React, { useState, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

export default function FadeThrough({ children, transitionKey, duration = 200, style }) {
    const [currentChild, setCurrentChild] = useState(children);
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const prevKeyRef = useRef(transitionKey);

    useEffect(() => {
        if (transitionKey !== prevKeyRef.current) {
            prevKeyRef.current = transitionKey;
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: duration / 2,
                useNativeDriver: true,
            }).start(() => {
                setCurrentChild(children);
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: duration / 2,
                    useNativeDriver: true,
                }).start();
            });
        } else {
            setCurrentChild(children);
        }
    }, [transitionKey, children, duration, opacityAnim]);

    return (
        <Animated.View style={[{ opacity: opacityAnim }, style]}>
            {currentChild}
        </Animated.View>
    );
}
