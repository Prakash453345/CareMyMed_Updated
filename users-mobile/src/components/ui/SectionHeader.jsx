import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, text, TYPOGRAPHY, spacing, touchTarget } from '../../theme';

export default function SectionHeader({
    title,
    subtitle,
    badge,
    actionText,
    onAction,
    rightElement,
    style,
}) {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.titleRow}>
                <View style={styles.leftCol}>
                    <View style={styles.headingWithBadge}>
                        <Text style={styles.title} numberOfLines={1}>
                            {title}
                        </Text>
                        {badge && <View style={styles.badgeWrapper}>{badge}</View>}
                    </View>
                    {subtitle ? (
                        <Text style={styles.subtitle} numberOfLines={2}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>

                {rightElement ? (
                    rightElement
                ) : actionText && onAction ? (
                    <TouchableOpacity
                        onPress={onAction}
                        hitSlop={touchTarget.hitSlop}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.actionText}>{actionText}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    leftCol: {
        flex: 1,
        marginRight: spacing.sm,
    },
    headingWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
    },
    title: {
        ...TYPOGRAPHY.h3,
        color: text.primary,
    },
    subtitle: {
        ...TYPOGRAPHY.small,
        color: text.secondary,
        marginTop: 2,
    },
    badgeWrapper: {
        marginLeft: spacing.xs,
    },
    actionButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    actionText: {
        ...TYPOGRAPHY.chip,
        color: colors.primary,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});
