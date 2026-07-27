/**
 * CareMyMed — TabScreenTransition
 *
 * Safe 60fps page entrance animation using React Native native-driven Animated component:
 *   opacity: 0 → 1
 *   translateY: 15px → 0
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { reanimatedMotion } from '../../theme/reanimatedMotion';
import { colors, useReduceMotion } from '../../theme';

export default function TabScreenTransition({ children, style }) {
    const isFocused = useIsFocused();
    const reduceMotion = useReduceMotion();
    const animValue = useRef(new Animated.Value(0)).current;

    const shiftY = reduceMotion ? 0 : (reanimatedMotion.fadeUp?.page || 15);

    useEffect(() => {
        if (isFocused) {
            Animated.timing(animValue, {
                toValue: 1,
                duration: reduceMotion ? 0 : 250,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(animValue, {
                toValue: 0,
                duration: reduceMotion ? 0 : 150,
                useNativeDriver: true,
            }).start();
        }
    }, [isFocused, reduceMotion, animValue]);

    const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [shiftY, 0],
    });

    return (
        <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
            <Animated.View style={[{ flex: 1, opacity: animValue, transform: [{ translateY }] }]}>
                {children}
            </Animated.View>
        </View>
    );
}
