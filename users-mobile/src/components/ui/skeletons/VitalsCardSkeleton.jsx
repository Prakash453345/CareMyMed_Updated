import React from 'react';
import { View, StyleSheet } from 'react-native';
import ShimmerBlock from './ShimmerBlock';
import { spacing, radius, colors } from '../../../theme';

export default function VitalsCardSkeleton({ style }) {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.grid}>
                {/* Heart Rate / Vitals Box 1 */}
                <View style={styles.vitalBox}>
                    <View style={styles.boxHeader}>
                        <ShimmerBlock width={24} height={24} borderRadius={12} />
                        <ShimmerBlock width={70} height={12} borderRadius={4} style={{ marginLeft: spacing.xs }} />
                    </View>
                    <View style={styles.valueRow}>
                        <ShimmerBlock width={52} height={28} borderRadius={6} />
                        <ShimmerBlock width={30} height={12} borderRadius={4} style={{ marginLeft: spacing.xs, marginTop: 10 }} />
                    </View>
                </View>

                {/* Blood Pressure / Vitals Box 2 */}
                <View style={styles.vitalBox}>
                    <View style={styles.boxHeader}>
                        <ShimmerBlock width={24} height={24} borderRadius={12} />
                        <ShimmerBlock width={80} height={12} borderRadius={4} style={{ marginLeft: spacing.xs }} />
                    </View>
                    <View style={styles.valueRow}>
                        <ShimmerBlock width={64} height={28} borderRadius={6} />
                        <ShimmerBlock width={36} height={12} borderRadius={4} style={{ marginLeft: spacing.xs, marginTop: 10 }} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    grid: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    vitalBox: {
        flex: 1,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    boxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
});
