import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useMotion } from '../../theme/MotionProvider';

function ShimmerBlock({ width, height, borderRadius = 8, style }) {
    const { reduceMotion } = useMotion();
    const animValue = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        if (reduceMotion) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(animValue, { toValue: 0.7, duration: 600, useNativeDriver: true }),
                Animated.timing(animValue, { toValue: 0.3, duration: 600, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [reduceMotion, animValue]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: '#E2E8F0',
                    opacity: reduceMotion ? 0.5 : animValue,
                },
                style,
            ]}
        />
    );
}

export default function SkeletonCard({
    lines = 2,
    hasCircle = false,
    hasChart = false,
    variant,
    style,
}) {
    if (variant === 'briefing') {
        return (
            <View style={[styles.card, style]}>
                <View style={styles.row}>
                    <ShimmerBlock width={40} height={40} borderRadius={20} />
                    <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                        <ShimmerBlock width="70%" height={14} />
                        <ShimmerBlock width="90%" height={12} />
                    </View>
                </View>
                <ShimmerBlock width="100%" height={60} borderRadius={12} style={{ marginTop: 16 }} />
                <ShimmerBlock width="40%" height={12} style={{ marginTop: 12 }} />
            </View>
        );
    }

    if (variant === 'adherence') {
        return (
            <View style={[styles.card, style]}>
                <View style={styles.row}>
                    <ShimmerBlock width={36} height={36} borderRadius={10} />
                    <View style={{ flex: 1, marginLeft: 12, gap: 4 }}>
                        <ShimmerBlock width={140} height={14} />
                        <ShimmerBlock width={100} height={10} />
                    </View>
                </View>
                <View style={[styles.row, { marginTop: 16 }]}>
                    <View style={{ flex: 1, gap: 8 }}>
                        <ShimmerBlock width={60} height={32} />
                        <ShimmerBlock width={90} height={16} borderRadius={8} />
                    </View>
                    <ShimmerBlock width={80} height={80} borderRadius={40} />
                </View>
                {hasChart && (
                    <View style={{ marginTop: 16, gap: 8 }}>
                        <ShimmerBlock width={120} height={12} />
                        <View style={styles.row}>
                            {[50, 80, 35, 70, 95, 25, 60].map((h, i) => (
                                <ShimmerBlock key={i} width={14} height={h * 0.7} borderRadius={4} />
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.card, style]}>
            <View style={styles.row}>
                {hasCircle && <ShimmerBlock width={36} height={36} borderRadius={18} />}
                <View style={{ flex: 1, gap: 6, marginLeft: hasCircle ? 12 : 0 }}>
                    {Array.from({ length: Math.min(lines, 5) }).map((_, i) => (
                        <ShimmerBlock
                            key={i}
                            width={i === 0 ? '70%' : i === lines - 1 ? '40%' : '90%'}
                            height={i === 0 ? 14 : 11}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 16,
        gap: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
