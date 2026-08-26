import React from 'react';
import { View, StyleSheet } from 'react-native';
import ShimmerBlock from './ShimmerBlock';
import { radius } from '../../../theme';

export default function PillCardSkeleton({
    width = 110,
    height = 36,
    borderRadius = radius.pill,
    style,
}) {
    return (
        <View style={[styles.container, style]}>
            <ShimmerBlock
                width={width}
                height={height}
                borderRadius={borderRadius}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
