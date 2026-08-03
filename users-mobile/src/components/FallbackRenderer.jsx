/**
 * FallbackRenderer.jsx
 *
 * Decoupled presentation component for feature fallbacks in CareMyMed.
 * Provides custom preset fallbacks (voice, chart, generic) with clear,
 * themed UI cards and retry controls.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MicOff, BarChart2, AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react-native';

export default function FallbackRenderer({
    featureName = 'Feature',
    fallbackTitle,
    fallbackMessage,
    onRetry,
    compact = false,
    preset = 'generic',
    style,
    error,
}) {
    if (preset === 'voice') {
        return (
            <View style={[styles.cardContainer, styles.voiceCard, style]}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                        <MicOff size={20} color="#EF4444" />
                    </View>
                    <View style={styles.textWrap}>
                        <Text style={styles.titleText}>
                            {fallbackTitle || 'Voice Recorder Unavailable'}
                        </Text>
                        <Text style={styles.subtitleText}>
                            {fallbackMessage || 'Recording encountered an issue. You can try again or use text input.'}
                        </Text>
                    </View>
                </View>
                <View style={styles.buttonRow}>
                    {onRetry && (
                        <Pressable style={styles.primaryButton} onPress={onRetry}>
                            <RefreshCw size={14} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>Retry Voice</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        );
    }

    if (preset === 'chart') {
        return (
            <View style={[styles.cardContainer, compact && styles.compactContainer, style]}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
                        <BarChart2 size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.textWrap}>
                        <Text style={styles.titleText}>
                            {fallbackTitle || `Couldn't load ${featureName}`}
                        </Text>
                        <Text style={styles.subtitleText}>
                            {fallbackMessage || 'The chart visual hit an issue. Your underlying data is complete and safe.'}
                        </Text>
                    </View>
                </View>
                {onRetry && (
                    <Pressable style={[styles.primaryButton, { alignSelf: 'flex-start', marginTop: 12 }]} onPress={onRetry}>
                        <RefreshCw size={14} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Reload Chart</Text>
                    </Pressable>
                )}
            </View>
        );
    }

    // Default Generic Feature Fallback
    return (
        <View style={[styles.cardContainer, compact && styles.compactContainer, style]}>
            <View style={styles.headerRow}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <AlertTriangle size={compact ? 18 : 22} color="#F59E0B" />
                </View>
                <View style={styles.textWrap}>
                    <Text style={[styles.titleText, compact && styles.compactTitle]}>
                        {fallbackTitle || `${featureName} Unavailable`}
                    </Text>
                    <Text style={[styles.subtitleText, compact && styles.compactSubtitle]}>
                        {fallbackMessage || 'An isolated issue occurred in this component. The rest of the app remains active.'}
                    </Text>
                </View>
            </View>

            {onRetry && (
                <View style={{ marginTop: compact ? 8 : 12, alignItems: 'flex-start' }}>
                    <Pressable style={[styles.primaryButton, compact && styles.compactButton]} onPress={onRetry}>
                        <RefreshCw size={compact ? 12 : 14} color="#FFFFFF" />
                        <Text style={[styles.primaryButtonText, compact && styles.compactButtonText]}>
                            {`Retry ${featureName}`}
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    compactContainer: {
        padding: 12,
        borderRadius: 12,
        marginVertical: 4,
    },
    voiceCard: {
        backgroundColor: '#F8FAFC',
        borderColor: '#CBD5E1',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
    },
    titleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    subtitleText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#64748B',
        lineHeight: 16,
    },
    compactTitle: {
        fontSize: 13,
    },
    compactSubtitle: {
        fontSize: 11,
        lineHeight: 14,
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#6366F1',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    compactButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    compactButtonText: {
        fontSize: 11,
    },
});
