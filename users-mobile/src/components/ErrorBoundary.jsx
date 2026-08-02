/**
 * ErrorBoundary.jsx — SEC-FIX-3
 *
 * Global React Error Boundary that prevents unhandled component errors
 * from crashing the entire app. Shows a recovery UI instead.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { RefreshCw, AlertTriangle } from 'lucide-react-native';
import * as SplashScreen from 'expo-splash-screen';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        SplashScreen.hideAsync().catch(() => { });
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        SplashScreen.hideAsync().catch(() => { });
        console.error('[ErrorBoundary] Caught:', error?.message);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.iconWrap}>
                        <AlertTriangle size={48} color="#EF4444" />
                    </View>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.subtitle}>
                        The app encountered an unexpected error. Your data is safe.
                    </Text>
                    <Pressable style={styles.button} onPress={this.handleReset}>
                        <RefreshCw size={18} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Try Again</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}

export class ContainerErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ContainerErrorBoundary] Caught in container:', error?.message);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={[styles.containerCompact, this.props.style]}>
                    <AlertTriangle size={28} color="#EF4444" style={{ marginBottom: 8 }} />
                    <Text style={styles.titleCompact}>
                        {this.props.title || 'Section Encountered an Issue'}
                    </Text>
                    <Text style={styles.subtitleCompact}>
                        {this.props.message || 'An unexpected error occurred loading this section. The rest of your app remains active.'}
                    </Text>
                    <Pressable style={styles.buttonCompact} onPress={this.handleReset}>
                        <RefreshCw size={14} color="#FFFFFF" />
                        <Text style={styles.buttonTextCompact}>Try Again</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    iconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#6366F1',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#6366F1',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    // Compact Container Fallback
    containerCompact: {
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
    },
    titleCompact: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitleCompact: {
        fontSize: 12.5,
        fontWeight: '500',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 14,
        paddingHorizontal: 10,
    },
    buttonCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#7C3AED',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    buttonTextCompact: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});
