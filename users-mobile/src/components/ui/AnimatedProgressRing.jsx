import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function AnimatedProgressRing({
    progress = 0,
    size = 88,
    strokeWidth = 8,
    colors = ['#A78BFA', '#7C3AED'],
    trackColor = '#F3E8FF',
    children,
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const animValue = useRef(new Animated.Value(progress)).current;
    const [offset, setOffset] = useState(circumference * (1 - Math.max(0, Math.min(100, progress)) / 100));

    useEffect(() => {
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
    }, [progress, circumference, animValue]);

    const isGradient = Array.isArray(colors) && colors.length > 1;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <Defs>
                    {isGradient && (
                        <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors[0]} />
                            <Stop offset="100%" stopColor={colors[colors.length - 1]} />
                        </LinearGradient>
                    )}
                </Defs>
                
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />

                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isGradient ? 'url(#progressGrad)' : colors[0] || '#7C3AED'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
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
