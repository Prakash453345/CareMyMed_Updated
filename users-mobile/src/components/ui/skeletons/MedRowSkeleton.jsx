import React from 'react';
import { View, StyleSheet } from 'react-native';
import ShimmerBlock from './ShimmerBlock';
import { spacing, radius, colors } from '../../../theme';

export default function MedRowSkeleton({ count = 3, style }) {
    return (
        <View style={[styles.container, style]}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.rowWrapper}>
                    <View style={styles.row}>
                        {/* 44x44 rounded icon chip */}
                        <ShimmerBlock
                            width={44}
                            height={44}
                            borderRadius={radius.input}
                        />

                        {/* Title and subtitle bars */}
                        <View style={styles.content}>
                            <ShimmerBlock width={120} height={16} borderRadius={4} />
                            <ShimmerBlock width={85} height={12} borderRadius={4} style={{ marginTop: 6 }} />
                        </View>

                        {/* Trailing pill count badge */}
                        <ShimmerBlock
                            width={54}
                            height={24}
                            borderRadius={radius.pill}
                        />
                    </View>
                    {index < count - 1 && <View style={styles.divider} />}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    rowWrapper: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
    },
    content: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginVertical: spacing.xs,
    },
});
