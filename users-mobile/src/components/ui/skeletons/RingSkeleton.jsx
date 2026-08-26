import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import ShimmerBlock from './ShimmerBlock';
import { colors } from '../../../theme';

export default function RingSkeleton({
    size = 88,
    strokeWidth = 8,
    style,
}) {
    const radius = (size - strokeWidth) / 2;
    const centerBlockWidth = Math.round(size * 0.42);
    const centerBlockHeight = Math.max(14, Math.round(size * 0.18));

    return (
        <View style={[styles.container, { width: size, height: size }, style]}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={colors.surfaceMuted}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
            </Svg>

            <View style={styles.centerContainer}>
                <ShimmerBlock
                    width={centerBlockWidth}
                    height={centerBlockHeight}
                    borderRadius={centerBlockHeight / 2}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
