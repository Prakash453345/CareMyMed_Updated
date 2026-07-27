import React, { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, Animated } from 'react-native';
import { HapticPatterns } from '../../utils/haptics';

export default function AnimatedChip({
    label,
    selected = false,
    onPress,
    hapticType = 'selection',
    activeBg = '#FAF5FF',
    inactiveBg = '#FFFFFF',
    activeBorder = '#C084FC',
    inactiveBorder = '#E2E8F0',
    activeText = '#7C3AED',
    inactiveText = '#64748B',
    style,
    textStyle,
    ...props
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const selectAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(selectAnim, {
            toValue: selected ? 1 : 0,
            duration: 150,
            useNativeDriver: false,
        }).start();
    }, [selected, selectAnim]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
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
        if (hapticType !== 'none' && HapticPatterns[hapticType]) {
            HapticPatterns[hapticType]();
        }
        if (onPress) onPress();
    };

    const backgroundColor = selectAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [inactiveBg, activeBg],
    });

    const borderColor = selectAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [inactiveBorder, activeBorder],
    });

    const textColor = selectAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [inactiveText, activeText],
    });

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            {...props}
        >
            <Animated.View
                style={[
                    styles.chip,
                    {
                        backgroundColor,
                        borderColor,
                        transform: [{ scale: scaleAnim }],
                    },
                    style,
                ]}
            >
                <Animated.Text style={[styles.labelText, { color: textColor }, textStyle]}>
                    {label}
                </Animated.Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    labelText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
