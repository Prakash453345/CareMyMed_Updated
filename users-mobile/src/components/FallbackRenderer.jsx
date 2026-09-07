/**
 * FallbackRenderer.jsx
 *
 * Decoupled presentation component for feature fallbacks in CareMyMed.
 * Provides custom preset fallbacks (voice, chart, generic) with clear,
 * centered, premium UI cards and retry controls.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MicOff, ChartBar, TriangleAlert, RefreshCw, ShieldAlert } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
            <View style={[styles.compactContainer, styles.voiceCard, style]}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                        <MicOff size={18} color="#EF4444" />
                    </View>
                    <View style={styles.textWrap}>
                        <Text style={styles.compactTitleText}>
                            {fallbackTitle || 'Voice Recorder Unavailable'}
                        </Text>
                        <Text style={styles.compactSubtitleText}>
                            {fallbackMessage || 'Recording encountered an issue. You can try again or use text input.'}
                        </Text>
                    </View>
                    {onRetry && (
                        <Pressable style={styles.compactPrimaryButton} onPress={onRetry} hitSlop={8}>
                            <RefreshCw size={13} color="#FFFFFF" />
                            <Text style={styles.compactButtonText}>Retry</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        );
    }

    if (compact) {
        return (
            <View style={[styles.compactContainer, style]}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                        <TriangleAlert size={18} color="#F59E0B" />
                    </View>
                    <View style={styles.textWrap}>
                        <Text style={styles.compactTitleText}>
                            {fallbackTitle || `${featureName} Unavailable`}
                        </Text>
                        <Text style={styles.compactSubtitleText}>
                            {fallbackMessage || 'An isolated issue occurred. Rest of app is active.'}
                        </Text>
                    </View>
                    {onRetry && (
                        <Pressable style={styles.compactPrimaryButton} onPress={onRetry} hitSlop={8}>
                            <RefreshCw size={13} color="#FFFFFF" />
                            <Text style={styles.compactButtonText}>Retry</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        );
    }

    // Default Full-Screen Centered Component Fallback
    return (
        <View style={[styles.fullScreenWrapper, style]}>
            <View style={styles.centeredCardContainer}>
                {/* Header Icon Circle */}
                <LinearGradient
                    colors={preset === 'chart' ? ['#EEF2FF', '#E0E7FF'] : ['#FFFBEB', '#FEF3C7']}
                    style={styles.heroIconWrap}
                >
                    {preset === 'chart' ? (
                        <ChartBar size={32} color="#6366F1" strokeWidth={2} />
                    ) : (
                        <TriangleAlert size={32} color="#D97706" strokeWidth={2} />
                    )}
                </LinearGradient>

                <Text style={styles.heroTitle}>
                    {fallbackTitle || `${featureName} Unavailable`}
                </Text>
                
                <Text style={styles.heroSubtitle}>
                    {fallbackMessage || `We hit an isolated issue loading the ${featureName} section. The rest of your app remains active and secure.`}
                </Text>

                {onRetry && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.fullRetryButton,
                            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
                        ]}
                        onPress={onRetry}
                    >
                        <LinearGradient
                            colors={['#6366F1', '#4F46E5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientBtnInner}
                        >
                            <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.fullRetryButtonText}>
                                {`Reload ${featureName}`}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                )}

                <View style={styles.isolationBadge}>
                    <ShieldAlert size={13} color="#64748B" />
                    <Text style={styles.isolationBadgeTxt}>Isolated Component Safeguard Active</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenWrapper: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    centeredCardContainer: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 4,
    },
    heroIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    heroTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    heroSubtitle: {
        fontSize: 13.5,
        fontWeight: '400',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    fullRetryButton: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
    },
    gradientBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    fullRetryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    isolationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 18,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    isolationBadgeTxt: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748B',
    },
    compactContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        marginVertical: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    voiceCard: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
    },
    compactTitleText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    compactSubtitleText: {
        fontSize: 11,
        fontWeight: '400',
        color: '#64748B',
        lineHeight: 14,
    },
    compactPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#6366F1',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    compactButtonText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
});

