import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors as themeColors } from '../../theme';
import { useMotion } from '../../theme/MotionProvider';

const SIZE_MAP = {
    sm: { size: 64, strokeWidth: 6 },
    md: { size: 88, strokeWidth: 8 },
    lg: { size: 120, strokeWidth: 10 },
};

export default function ProgressRing({
    progress = 0,
    size = 'md', // 'sm' | 'md' | 'lg' | number
    strokeWidth,
    ringColors = [themeColors.primary, themeColors.accent],
    trackColor = themeColors.surfaceMuted,
    children,
    style,
}) {
    const { reduceMotion } = useMotion();
    
    // Resolve dimensions from presets or custom number
    const finalSize = typeof size === 'number' ? size : (SIZE_MAP[size]?.size || 88);
    const finalStroke = strokeWidth || (typeof size === 'string' ? (SIZE_MAP[size]?.strokeWidth || 8) : 8);

    const radius = (finalSize - finalStroke) / 2;
    const circumference = 2 * Math.PI * radius;

    const animValue = useRef(new Animated.Value(progress)).current;
    const [offset, setOffset] = useState(
        circumference * (1 - Math.max(0, Math.min(100, progress)) / 100)
    );

    useEffect(() => {
        if (reduceMotion) {
            const capped = Math.max(0, Math.min(100, progress));
            setOffset(circumference * (1 - capped / 100));
            return;
        }

        const id = animValue.addListener(({ value: val }) => {
            const cappedProgress = Math.max(0, Math.min(100, val));
            setOffset(circumference * (1 - cappedProgress / 100));
        });

        Animated.spring(animValue, {
            toValue: progress,
            speed: 12,
            bounciness: 4,
            useNativeDriver: false,
        }).start();

        return () => {
            animValue.removeListener(id);
        };
    }, [progress, circumference, animValue, reduceMotion]);

    const isGradient = Array.isArray(ringColors) && ringColors.length > 1;
    const gradId = `progressRingGrad_${finalSize}_${Math.round(progress)}`;

    return (
        <View style={[styles.container, { width: finalSize, height: finalSize }, style]}>
            <Svg width={finalSize} height={finalSize} viewBox={`0 0 ${finalSize} ${finalSize}`}>
                <Defs>
                    {isGradient && (
                        <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={ringColors[0]} />
                            <Stop offset="100%" stopColor={ringColors[ringColors.length - 1]} />
                        </LinearGradient>
                    )}
                </Defs>

                {/* Track Circle */}
                <Circle
                    cx={finalSize / 2}
                    cy={finalSize / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={finalStroke}
                    fill="transparent"
                />

                {/* Animated Progress Arc */}
                <Circle
                    cx={finalSize / 2}
                    cy={finalSize / 2}
                    r={radius}
                    stroke={isGradient ? `url(#${gradId})` : (Array.isArray(ringColors) ? ringColors[0] : ringColors)}
                    strokeWidth={finalStroke}
                    fill="transparent"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${finalSize / 2} ${finalSize / 2})`}
                />
            </Svg>

            {children && <View style={styles.childContainer}>{children}</View>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    childContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
