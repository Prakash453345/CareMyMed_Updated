import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, text, RADIUS, spacing, touchTarget, TYPOGRAPHY } from '../../theme';

export default function StatusChip({
    label,
    icon: Icon,
    variant = 'neutral', // 'neutral' | 'success' | 'warning' | 'danger' | 'brand'
    size = 'md', // 'sm' | 'md'
    onPress,
    style,
    textStyle,
}) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'success':
                return {
                    bg: colors.successLight,
                    border: 'transparent',
                    text: '#065F46',
                    iconColor: colors.success,
                };
            case 'warning':
                return {
                    bg: colors.warningLight,
                    border: 'transparent',
                    text: '#92400E',
                    iconColor: colors.warning,
                };
            case 'danger':
                return {
                    bg: colors.dangerLight,
                    border: 'transparent',
                    text: '#991B1B',
                    iconColor: colors.danger,
                };
            case 'brand':
                return {
                    bg: colors.primarySoft,
                    border: 'transparent',
                    text: colors.primary,
                    iconColor: colors.primary,
                };
            case 'neutral':
            default:
                return {
                    bg: colors.surfaceSecondary,
                    border: colors.borderLight,
                    text: text.secondary,
                    iconColor: text.muted,
                };
        }
    };

    const config = getVariantStyles();
    const isSmall = size === 'sm';

    const content = (
        <View
            style={[
                styles.chip,
                {
                    backgroundColor: config.bg,
                    borderColor: config.border,
                    paddingHorizontal: isSmall ? spacing.sm : spacing.md,
                    paddingVertical: isSmall ? 4 : 6,
                },
                style,
            ]}
        >
            {Icon && (
                <Icon
                    size={isSmall ? 12 : 14}
                    color={config.iconColor}
                    strokeWidth={2.2}
                    style={{ marginRight: 5 }}
                />
            )}
            <Text
                style={[
                    styles.label,
                    {
                        color: config.text,
                        fontSize: isSmall ? 11 : 13,
                        lineHeight: isSmall ? 14 : 18,
                    },
                    textStyle,
                ]}
            >
                {label}
            </Text>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                hitSlop={touchTarget.hitSlop}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});
