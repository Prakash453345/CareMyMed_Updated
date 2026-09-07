/**
 * Living Glass Runtime v1 — LivingGlassCard Component
 *
 * Dumb component primitive handling touch compression (2%), lift, and elevation.
 */

import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import glassMaterials from '../tokens/glassMaterials';
import motionTokens from '../tokens/motionTokens';

export default function LivingGlassCard({
    children,
    onPress,
    style,
    elevationVariant = 'subtle',
    compressAmount = 0.98, // 2% compression
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shadowPreset = glassMaterials.shadows[elevationVariant] || glassMaterials.shadows.subtle;

    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: compressAmount,
            duration: motionTokens.duration.fast,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: motionTokens.duration.fast,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
        >
            <Animated.View
                style={[
                    styles.cardBase,
                    shadowPreset,
                    { transform: [{ scale: scaleAnim }] },
                    style,
                ]}
            >
                {children}
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    cardBase: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
    },
});
