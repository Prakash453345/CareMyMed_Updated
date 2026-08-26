import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Image,
    Dimensions,
    StatusBar,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Activity, ShieldCheck, Sparkles } from 'lucide-react-native';
import { colors, TYPOGRAPHY } from '../../theme';
import usePatientStore from '../../store/usePatientStore';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SPLASH_DURATION_MS = 1900; // 1.9s anti-flicker fixed floor

export default function BrandedSplashScreen({ isReady, onFinish }) {
    const insets = useSafeAreaInsets();
    const { profile, user } = useAuth();
    const patient = usePatientStore(s => s.patient);

    // Derived Context Information (Swiggy-style top context beat)
    const locationOrOrg = patient?.city ||
        profile?.city ||
        patient?.organization_id?.name ||
        patient?.organization?.name ||
        'CareConnect Health Network';

    const healthScore = patient?.patient_health_state?.score ??
        patient?.health_score?.score ??
        patient?.healthScoreCache ??
        null;

    const healthStatusSubtitle = healthScore
        ? `Health Score: ${healthScore} • Monitoring Active`
        : 'Care Plan Synchronized • Daily Routine Active';

    // Animation Drivers
    const containerOpacity = useRef(new Animated.Value(1)).current;
    const topContextTranslateY = useRef(new Animated.Value(-20)).current;
    const topContextOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.85)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const haloScale = useRef(new Animated.Value(0.8)).current;
    const haloOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const statusOpacity = useRef(new Animated.Value(0)).current;

    const [syncMessage, setSyncMessage] = useState('Connecting to secure care network...');
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    useEffect(() => {
        // Step 1: Minimum fixed floor timer (1.9s)
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, MIN_SPLASH_DURATION_MS);

        // Step 2: Dynamic status ticker messages
        const msgTimer1 = setTimeout(() => {
            setSyncMessage('Syncing medication & vitals plan...');
        }, 750);

        const msgTimer2 = setTimeout(() => {
            setSyncMessage('Care plan ready');
        }, 1500);

        // Step 3: Coordinated Animation Orchestration
        // Beat 1 (0-400ms): Brand background mounted
        // Beat 2 (300-900ms): Logo + Radial Halo pulse in
        Animated.parallel([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 7,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
                toValue: 0.25,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(haloScale, {
                toValue: 1.15,
                friction: 6,
                tension: 30,
                useNativeDriver: true,
            }),
        ]).start();

        // Beat 3 (500-1100ms): Top Context card slides in (Swiggy Moment) & brand text fades
        const animTimer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(topContextOpacity, {
                    toValue: 1,
                    duration: 450,
                    useNativeDriver: true,
                }),
                Animated.spring(topContextTranslateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 45,
                    useNativeDriver: true,
                }),
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(statusOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 400);

        return () => {
            clearTimeout(timer);
            clearTimeout(msgTimer1);
            clearTimeout(msgTimer2);
            clearTimeout(animTimer);
        };
    }, []);

    // Step 4: Dismiss with smooth 220ms ease-out cross-fade once ready and 1.9s elapsed
    useEffect(() => {
        if (minTimeElapsed && isReady) {
            Animated.timing(containerOpacity, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start(() => {
                onFinish?.();
            });
        }
    }, [minTimeElapsed, isReady, onFinish]);

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[
                styles.container,
                { opacity: containerOpacity }
            ]}
        >
            <StatusBar barStyle="light-content" backgroundColor="#7C3AED" translucent />

            {/* ── TOP CONTEXT BEAT (Swiggy-Style Personalized Context Header) ── */}
            <Animated.View
                style={[
                    styles.topContextWrapper,
                    {
                        paddingTop: Math.max(insets.top + 16, 44),
                        opacity: topContextOpacity,
                        transform: [{ translateY: topContextTranslateY }],
                    }
                ]}
            >
                <View style={styles.topIconPill}>
                    <MapPin size={14} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.topLocationTitle} numberOfLines={1}>
                    {locationOrOrg}
                </Text>
                <Text style={styles.topSubtitleText} numberOfLines={1}>
                    {healthStatusSubtitle}
                </Text>
            </Animated.View>

            {/* ── CENTER BRAND MARK BEAT ── */}
            <View style={styles.centerBrandContainer}>
                {/* Radial Glow Halo Pulse */}
                <Animated.View
                    style={[
                        styles.haloGlow,
                        {
                            opacity: haloOpacity,
                            transform: [{ scale: haloScale }],
                        }
                    ]}
                />

                {/* Official CareMyMed Brand Logo */}
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }],
                        }
                    ]}
                >
                    <Image
                        source={require('../../../assets/logo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Brand Name Title (No Truncation) */}
                <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 18 }}>
                    <Text style={styles.brandTitleText}>CareMyMed</Text>
                    <Text style={styles.brandTaglineText}>Intelligent Healthcare Management</Text>
                </Animated.View>
            </View>

            {/* ── BOTTOM STATUS TICKER BEAT ── */}
            <Animated.View
                style={[
                    styles.bottomStatusWrapper,
                    {
                        paddingBottom: Math.max(insets.bottom + 24, 36),
                        opacity: statusOpacity,
                    }
                ]}
            >
                <Text style={styles.statusTickerText}>{syncMessage}</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#7C3AED', // Canonical brand purple
        zIndex: 99999,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topContextWrapper: {
        alignItems: 'center',
        paddingHorizontal: 24,
        width: '100%',
    },
    topIconPill: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    topLocationTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 17,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    topSubtitleText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.82)',
        textAlign: 'center',
        marginTop: 3,
    },
    centerBrandContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    haloGlow: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    logoWrapper: {
        width: 104,
        height: 104,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 8,
    },
    logoImage: {
        width: 76,
        height: 76,
    },
    brandTitleText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 30,
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    brandTaglineText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.78)',
        marginTop: 4,
        letterSpacing: 0.2,
    },
    bottomStatusWrapper: {
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%',
    },
    statusTickerText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.88)',
        letterSpacing: 0.1,
    },
});
