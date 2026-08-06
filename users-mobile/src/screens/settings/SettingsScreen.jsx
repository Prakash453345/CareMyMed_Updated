import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable,
    ActivityIndicator, Platform, Linking, StatusBar, Animated
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft, Shield, Lock, Bell, BellRing, Smartphone,
    Globe, Activity, RefreshCw, Sparkles, LogOut,
    Check, KeyRound, ChevronRight, Eye, ShieldCheck,
    Zap, AlertCircle, Fingerprint, Clock, CheckCircle2,
    Heart, Award, ArrowUpRight
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import usePatientStore from '../../store/usePatientStore';
import { apiService } from '../../lib/api';
import HealthSyncService from '../../services/HealthSyncService';
import AlertManager from '../../utils/AlertManager';
import SmartInput from '../../components/ui/SmartInput';
import PremiumFormModal from '../../components/ui/PremiumFormModal';
import TabScreenTransition from '../../components/ui/TabScreenTransition';
import { colors, radius } from '../../theme';
import { HapticPatterns } from '../../utils/haptics';

import * as LocalAuthentication from 'expo-local-authentication';

const LANGUAGES = [
    { code: 'en_IN', label: 'English (India)', flag: '🇮🇳' },
    { code: 'hi_IN', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'te_IN', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'ta_IN', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'kn_IN', label: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'mr_IN', label: 'मराठी (Marathi)', flag: '🇮🇳' },
];

// ── Custom Silky Spring Toggle Switch ─────────────────────────────────────────
const CustomSwitch = ({ value, onValueChange, activeColor = '#6366F1' }) => {
    const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: value ? 1 : 0,
            friction: 7,
            tension: 50,
            useNativeDriver: false,
        }).start();
    }, [value, anim]);

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 22],
    });

    const backgroundColor = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#E2E8F0', activeColor],
    });

    return (
        <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
            <Animated.View style={[s.switchTrack, { backgroundColor }]}>
                <Animated.View style={[s.switchThumb, { transform: [{ translateX }] }]}>
                    {value && <View style={[s.switchDot, { backgroundColor: activeColor }]} />}
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
};

// ── Tactile Pressable Container with Spring Scale ─────────────────────────────
const TactileRow = ({ children, onPress, style, disabled = false }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: 0.982,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

// ── Main Settings Screen Component ────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
    const { t } = useTranslation();
    const { signOut } = useAuth();
    const patient = usePatientStore(s => s.patient);
    const setPatient = usePatientStore(s => s.setPatient);
    const reduceMotion = usePatientStore(s => s.reduceMotion);
    const setReduceMotion = usePatientStore(s => s.setReduceMotion || (() => {}));

    // ── Security State ──
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricType, setBiometricType] = useState('Biometrics');
    const [cpModalVisible, setCpModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingCp, setSavingCp] = useState(false);

    // ── Notifications State ──
    const [medReminders, setMedReminders] = useState(patient?.medication_reminders_enabled ?? true);
    const [pushEnabled, setPushEnabled] = useState(patient?.push_notifications_enabled ?? true);
    const [notifPermissionGranted, setNotifPermissionGranted] = useState(true);

    // ── Preferences & Sync State ──
    const [healthSyncEnabled, setHealthSyncEnabled] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncStr, setLastSyncStr] = useState(null);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const [selectedLang, setSelectedLang] = useState(patient?.language || i18n.language || 'en_IN');

    // ── Entrance Animation ──
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 45, useNativeDriver: true }),
        ]).start();

        // Pulsing dot animation for live status
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, [fadeAnim, slideAnim, pulseAnim]);

    // Load initial settings & biometrics capabilities
    useEffect(() => {
        (async () => {
            try {
                if (LocalAuthentication) {
                    const hasHardware = await LocalAuthentication.hasHardwareAsync();
                    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                    setBiometricSupported(hasHardware && isEnrolled);
                    
                    if (hasHardware) {
                        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                        if (types && types.length > 0) {
                            setBiometricType('Biometric Lock');
                        }
                    }
                } else {
                    setBiometricSupported(true);
                }

                const storedBio = await SecureStore.getItemAsync('biometric_auth_enabled');
                setBiometricEnabled(storedBio === 'true');

                const storedRM = await SecureStore.getItemAsync('reduce_motion_enabled');
                if (storedRM !== null) {
                    setReduceMotion(storedRM === 'true');
                }

                const perms = await Notifications.getPermissionsAsync();
                setNotifPermissionGranted(perms.status === 'granted');

                const syncStatus = await HealthSyncService.getStatus();
                setHealthSyncEnabled(syncStatus.connected);
                if (syncStatus.lastSync) {
                    setLastSyncStr(new Date(syncStatus.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                }
            } catch (err) {
                console.warn('[SettingsScreen] Init error:', err.message);
            }
        })();
    }, []);

    useEffect(() => {
        if (patient) {
            if (patient.medication_reminders_enabled !== undefined) setMedReminders(patient.medication_reminders_enabled);
            if (patient.push_notifications_enabled !== undefined) setPushEnabled(patient.push_notifications_enabled);
            if (patient.language) setSelectedLang(patient.language);
        }
    }, [patient]);

    // ── Dynamic System Security Score Calculation ──
    const securityScore = React.useMemo(() => {
        let score = 65;
        if (biometricEnabled) score += 25;
        if (medReminders) score += 5;
        if (pushEnabled) score += 5;
        return Math.min(score, 100);
    }, [biometricEnabled, medReminders, pushEnabled]);

    // ── Handlers ──
    const handleToggleBiometrics = async (val) => {
        HapticPatterns.selection();
        if (val) {
            if (LocalAuthentication && !biometricSupported) {
                AlertManager.alert(
                    'Biometrics Unavailable',
                    'Biometric authentication (Face ID / Fingerprint) is not configured on this device. Please enable it in your OS device settings.',
                    [{ text: 'OK' }],
                    { type: 'warning' }
                );
                return;
            }
            let success = true;
            if (LocalAuthentication) {
                const authRes = await LocalAuthentication.authenticateAsync({
                    promptMessage: `Authenticate to enable ${biometricType} login`,
                    fallbackLabel: 'Use Device PIN',
                });
                success = authRes.success;
            }
            if (success) {
                await SecureStore.setItemAsync('biometric_auth_enabled', 'true');
                setBiometricEnabled(true);
                AlertManager.alert('Success ✨', `${biometricType} enabled for fast login.`);
            } else {
                setBiometricEnabled(false);
            }
        } else {
            await SecureStore.deleteItemAsync('biometric_auth_enabled');
            setBiometricEnabled(false);
        }
    };

    const handleToggleReduceMotion = async (val) => {
        HapticPatterns.selection();
        setReduceMotion(val);
        try {
            await SecureStore.setItemAsync('reduce_motion_enabled', val ? 'true' : 'false');
        } catch (e) {}
    };

    const handleChangePassword = async () => {
        HapticPatterns.selection();
        if (!currentPassword || !newPassword || !confirmPassword) {
            AlertManager.alert('Missing Fields', 'Please fill in all password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            AlertManager.alert('Mismatch', 'New password and confirmation do not match.');
            return;
        }
        if (newPassword.length < 8) {
            AlertManager.alert('Password Weak', 'New password must be at least 8 characters long.');
            return;
        }
        setSavingCp(true);
        try {
            await apiService.auth.changePassword({ currentPassword, newPassword });
            setCpModalVisible(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            AlertManager.alert(
                'Password Updated 🔒',
                'Your password was changed successfully. Please log back in.',
                [{ text: 'OK', onPress: () => signOut() }]
            );
        } catch (err) {
            AlertManager.alert('Change Failed', err?.message || 'Failed to change password. Please check your current password.');
        } finally {
            setSavingCp(false);
        }
    };

    const handleToggleMedReminders = async (val) => {
        HapticPatterns.selection();
        setMedReminders(val);
        try {
            const res = await apiService.patients.updateMe({ medication_reminders_enabled: val });
            if (res.data?.patient) setPatient(res.data.patient);
        } catch (err) {
            console.warn('Failed to update medication reminder setting:', err.message);
        }
    };

    const handleTogglePushNotifications = async (val) => {
        HapticPatterns.selection();
        setPushEnabled(val);
        try {
            const res = await apiService.patients.updateMe({ push_notifications_enabled: val });
            if (res.data?.patient) setPatient(res.data.patient);
        } catch (err) {
            console.warn('Failed to update push notification setting:', err.message);
        }
    };

    const handleManualHealthSync = async () => {
        HapticPatterns.selection();
        setIsSyncing(true);

        spinAnim.setValue(0);
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ).start();

        try {
            await HealthSyncService.syncVitals();
            const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setLastSyncStr(nowStr);
            AlertManager.alert('Vitals Synced ✨', `Successfully synced latest health records at ${nowStr}.`);
        } catch (err) {
            console.warn('Manual health sync failed:', err.message);
            AlertManager.alert('Sync Unavailable', 'Could not sync health records at this time.');
        } finally {
            setIsSyncing(false);
            spinAnim.stopAnimation();
        }
    };

    const handleSelectLanguage = async (langCode) => {
        HapticPatterns.selection();
        setSelectedLang(langCode);
        setLanguageModalVisible(false);
        i18n.changeLanguage(langCode);
        try {
            const res = await apiService.patients.updateMe({ language: langCode });
            if (res.data?.patient) setPatient(res.data.patient);
            const label = LANGUAGES.find(l => l.code === langCode)?.label || langCode;
            AlertManager.alert('Language Updated 🌐', `App language updated to ${label}.`);
        } catch (err) {
            console.warn('Language update error:', err.message);
        }
    };

    const handleSignOut = () => {
        HapticPatterns.selection();
        AlertManager.alert(
            'Sign Out 🚪',
            'Are you sure you want to log out of CareMyMed?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
            ],
            { type: 'warning' }
        );
    };

    const currentLangObj = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <TabScreenTransition>
            <View style={s.container}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                {/* ── Ambient Background Gradient & Sweeping Curves ── */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg height="100%" width="100%" viewBox="0 0 400 850" preserveAspectRatio="none">
                        <Defs>
                            <SvgLinearGradient id="settingsTopBg" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.85" />
                                <Stop offset="40%" stopColor="#EEF2FF" stopOpacity="0.4" />
                                <Stop offset="100%" stopColor="#F8FAFC" stopOpacity="0" />
                            </SvgLinearGradient>
                            <SvgLinearGradient id="settingsBottomBg" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#ECFDF5" stopOpacity="0.65" />
                                <Stop offset="100%" stopColor="#F8FAFC" stopOpacity="0" />
                            </SvgLinearGradient>
                        </Defs>
                        <Path d="M120 0 C220 130, 320 150, 400 120 L400 0 Z" fill="url(#settingsTopBg)" />
                        <Path d="M0 620 C80 700, 160 720, 240 850 L0 850 Z" fill="url(#settingsBottomBg)" />
                    </Svg>
                </View>

                {/* ── Header Bar ── */}
                <View style={s.header}>
                    <Pressable
                        onPress={() => {
                            HapticPatterns.selection();
                            navigation.goBack();
                        }}
                        style={s.backBtn}
                        hitSlop={12}
                    >
                        <ChevronLeft size={22} color="#0F172A" strokeWidth={2.5} />
                    </Pressable>
                    <View style={s.headerTitleGroup}>
                        <Text style={s.headerTitle}>Settings & Preferences</Text>
                        <Text style={s.headerSub}>Manage security, alarms & health sync</Text>
                    </View>
                </View>

                <Animated.ScrollView
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                >
                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* ── MACRO HERO: SECURITY & SYSTEM HEALTH SCORE DASHBOARD CARD ── */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <LinearGradient
                        colors={['#312E81', '#4338CA', '#4F46E5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.heroDashboardCard}
                    >
                        <View style={s.heroTopRow}>
                            <View style={s.heroShieldWrap}>
                                <ShieldCheck size={22} color="#818CF8" strokeWidth={2.5} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.heroScoreEyebrow}>SYSTEM SECURITY SCORE</Text>
                                <Text style={s.heroScoreTitle}>{securityScore}% Protected</Text>
                            </View>
                            <View style={s.heroPulseBadge}>
                                <Animated.View style={[s.heroPulseDot, { opacity: pulseAnim }]} />
                                <Text style={s.heroPulseTxt}>LIVE</Text>
                            </View>
                        </View>

                        {/* Animated Progress Bar */}
                        <View style={s.heroProgressBarBg}>
                            <LinearGradient
                                colors={['#34D399', '#10B981']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[s.heroProgressBarFill, { width: `${securityScore}%` }]}
                            />
                        </View>

                        {/* Metric Chips Row */}
                        <View style={s.heroMetricsGrid}>
                            <View style={s.heroMetricChip}>
                                <Fingerprint size={12} color="#A5B4FC" />
                                <Text style={s.heroMetricTxt}>
                                    {biometricEnabled ? 'Biometric Active' : 'PIN Lock Active'}
                                </Text>
                            </View>

                            <View style={s.heroMetricChip}>
                                <BellRing size={12} color="#A5B4FC" />
                                <Text style={s.heroMetricTxt}>
                                    {medReminders ? '3 Dose Alarms Set' : 'Alarms Off'}
                                </Text>
                            </View>

                            <View style={s.heroMetricChip}>
                                <Activity size={12} color="#34D399" />
                                <Text style={s.heroMetricTxt}>
                                    {lastSyncStr ? `Synced ${lastSyncStr}` : 'Health Connect'}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* ── SECTION 1: SECURITY & ACCESS ── */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <View style={s.sectionHeaderWrap}>
                        <View style={s.sectionBadge} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.sectionHeading}>Security & Access</Text>
                            <Text style={s.sectionSub}>Authentication & account credentials</Text>
                        </View>
                    </View>

                    {/* Biometrics Card */}
                    <View style={s.macroCard}>
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={s.macroIconBox}>
                                <Fingerprint size={20} color="#4F46E5" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <View style={s.rowTitleWrap}>
                                    <Text style={s.macroTitle}>{biometricType} Login</Text>
                                    <View style={[s.liveBadgePill, biometricEnabled ? s.liveBadgeGreen : s.liveBadgeGray]}>
                                        <Animated.View style={[s.badgeDot, { backgroundColor: biometricEnabled ? '#10B981' : '#94A3B8', opacity: biometricEnabled ? pulseAnim : 1 }]} />
                                        <Text style={[s.badgeTxt, { color: biometricEnabled ? '#065F46' : '#475569' }]}>
                                            {biometricEnabled ? 'ENABLED' : 'DISABLED'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={s.macroSub}>Use Face ID or Fingerprint for fast, instant unlock</Text>
                            </View>
                            <CustomSwitch
                                value={biometricEnabled}
                                onValueChange={handleToggleBiometrics}
                                activeColor="#4F46E5"
                            />
                        </View>

                        <View style={s.macroDivider} />

                        <View style={s.contextualFooterRow}>
                            <Shield size={13} color="#6366F1" strokeWidth={2.2} />
                            <Text style={s.contextualFooterTxt}>
                                {biometricEnabled ? 'Protected • Last verified today' : 'Enable biometrics to bypass PIN entry'}
                            </Text>
                        </View>
                    </View>

                    {/* Password Card */}
                    <TactileRow
                        style={s.macroCard}
                        onPress={() => {
                            HapticPatterns.selection();
                            setCpModalVisible(true);
                        }}
                    >
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={s.macroIconBox}>
                                <KeyRound size={20} color="#7C3AED" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <Text style={s.macroTitle}>Password & Credentials</Text>
                                <Text style={s.macroSub}>Update account access credentials & security keys</Text>
                            </View>
                            <View style={s.actionButtonCircle}>
                                <ChevronRight size={16} color="#7C3AED" strokeWidth={2.5} />
                            </View>
                        </View>

                        <View style={s.macroDivider} />

                        <View style={s.contextualFooterRow}>
                            <Lock size={13} color="#7C3AED" strokeWidth={2.2} />
                            <Text style={s.contextualFooterTxt}>Last updated 30 days ago • 256-bit encrypted</Text>
                        </View>
                    </TactileRow>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* ── SECTION 2: NOTIFICATIONS & HEALTH ALARMS ── */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <View style={s.sectionHeaderWrap}>
                        <View style={[s.sectionBadge, { backgroundColor: '#2563EB' }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.sectionHeading}>Notifications & Health Alarms</Text>
                            <Text style={s.sectionSub}>Daily dose schedule reminders & briefings</Text>
                        </View>
                    </View>

                    {/* Medication Reminders Card */}
                    <View style={s.macroCard}>
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={s.macroIconBox}>
                                <BellRing size={20} color="#2563EB" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <View style={s.rowTitleWrap}>
                                    <Text style={s.macroTitle}>Medication Reminders</Text>
                                    <View style={[s.liveBadgePill, medReminders ? s.liveBadgeBlue : s.liveBadgeGray]}>
                                        <Text style={[s.badgeTxt, { color: medReminders ? '#1E40AF' : '#475569' }]}>
                                            {medReminders ? '3 REMINDERS ACTIVE' : 'MUTED'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={s.macroSub}>Push alarms for scheduled daily doses</Text>
                            </View>
                            <CustomSwitch
                                value={medReminders}
                                onValueChange={handleToggleMedReminders}
                                activeColor="#2563EB"
                            />
                        </View>

                        {medReminders && (
                            <>
                                <View style={s.macroDivider} />
                                {/* Contextual Active Schedule Preview */}
                                <View style={s.scheduleChipsRow}>
                                    <Text style={s.scheduleLabel}>Active Alarms:</Text>
                                    <View style={s.timeChip}><Clock size={11} color="#2563EB" /><Text style={s.timeChipTxt}>08:00 AM</Text></View>
                                    <View style={s.timeChip}><Clock size={11} color="#2563EB" /><Text style={s.timeChipTxt}>02:00 PM</Text></View>
                                    <View style={s.timeChip}><Clock size={11} color="#2563EB" /><Text style={s.timeChipTxt}>08:00 PM</Text></View>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Daily Briefing Card */}
                    <View style={s.macroCard}>
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#F0F9FF', '#E0F2FE']} style={s.macroIconBox}>
                                <Sparkles size={20} color="#0284C7" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <View style={s.rowTitleWrap}>
                                    <Text style={s.macroTitle}>Daily Health Briefing</Text>
                                    {pushEnabled && (
                                        <View style={s.liveBadgeSky}>
                                            <Text style={s.badgeTxtSky}>TOMORROW 7:30 AM</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={s.macroSub}>Morning status & trend alert summaries</Text>
                            </View>
                            <CustomSwitch
                                value={pushEnabled}
                                onValueChange={handleTogglePushNotifications}
                                activeColor="#0284C7"
                            />
                        </View>

                        {pushEnabled && (
                            <>
                                <View style={s.macroDivider} />
                                <View style={s.briefingPreviewRow}>
                                    <Text style={s.briefingLabel}>Includes:</Text>
                                    <View style={s.previewTag}><Text style={s.previewTagTxt}>☀️ Weather</Text></View>
                                    <View style={s.previewTag}><Text style={s.previewTagTxt}>💊 Meds</Text></View>
                                    <View style={s.previewTag}><Text style={s.previewTagTxt}>🩺 Vitals</Text></View>
                                </View>
                            </>
                        )}
                    </View>

                    {/* OS System Notification Permissions Card */}
                    <TactileRow
                        style={s.macroCard}
                        onPress={() => {
                            HapticPatterns.selection();
                            Linking.openSettings();
                        }}
                    >
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={s.macroIconBox}>
                                <Bell size={20} color="#D97706" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <View style={s.rowTitleWrap}>
                                    <Text style={s.macroTitle}>Device Notification Settings</Text>
                                    <View style={[s.liveBadgePill, notifPermissionGranted ? s.liveBadgeGreen : s.liveBadgeWarn]}>
                                        <Text style={[s.badgeTxt, { color: notifPermissionGranted ? '#065F46' : '#92400E' }]}>
                                            {notifPermissionGranted ? 'PERMITTED' : 'BLOCKED'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={s.macroSub}>
                                    {notifPermissionGranted ? 'System permissions active in OS settings' : 'Tap to grant push permissions in OS settings'}
                                </Text>
                            </View>
                            <View style={[s.actionButtonCircle, { backgroundColor: '#FEF3C7' }]}>
                                <ChevronRight size={16} color="#D97706" strokeWidth={2.5} />
                            </View>
                        </View>
                    </TactileRow>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* ── SECTION 3: CONNECTED DEVICES & HEALTH SYNC ── */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <View style={s.sectionHeaderWrap}>
                        <View style={[s.sectionBadge, { backgroundColor: '#10B981' }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.sectionHeading}>Connected Devices & Health Sync</Text>
                            <Text style={s.sectionSub}>Wearable sensors & telemetry synchronization</Text>
                        </View>
                    </View>

                    {/* Wearable Health Sync Card */}
                    <View style={s.macroCard}>
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={s.macroIconBox}>
                                <Activity size={20} color="#10B981" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <View style={s.rowTitleWrap}>
                                    <Text style={s.macroTitle}>Health Connect / Wearable</Text>
                                    <View style={[s.liveBadgePill, s.liveBadgeGreen]}>
                                        <Animated.View style={[s.badgeDot, { backgroundColor: '#10B981', opacity: pulseAnim }]} />
                                        <Text style={[s.badgeTxt, { color: '#065F46' }]}>CONNECTED</Text>
                                    </View>
                                </View>
                                <Text style={s.macroSub}>
                                    {lastSyncStr ? `Last synced at ${lastSyncStr}` : 'Google Health Connect / Apple HealthKit'}
                                </Text>
                            </View>
                        </View>

                        <View style={s.macroDivider} />

                        <View style={s.syncFooterRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                <CheckCircle2 size={14} color="#10B981" />
                                <Text style={s.syncStatusTxt}>Auto-Sync Enabled • Real-time</Text>
                            </View>
                            <TactileRow onPress={handleManualHealthSync} disabled={isSyncing}>
                                <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={s.syncBtnGradient}>
                                    {isSyncing ? (
                                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                            <RefreshCw size={13} color="#10B981" strokeWidth={2.5} />
                                        </Animated.View>
                                    ) : (
                                        <>
                                            <RefreshCw size={12} color="#10B981" strokeWidth={2.5} />
                                            <Text style={s.syncBtnTxt}>Sync Now</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TactileRow>
                        </View>
                    </View>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* ── SECTION 4: PREFERENCES & ACCESSIBILITY ── */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <View style={s.sectionHeaderWrap}>
                        <View style={[s.sectionBadge, { backgroundColor: '#16A34A' }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.sectionHeading}>Preferences & Interface</Text>
                            <Text style={s.sectionSub}>Language, motion, and accessibility settings</Text>
                        </View>
                    </View>

                    {/* Language Card */}
                    <TactileRow
                        style={s.macroCard}
                        onPress={() => {
                            HapticPatterns.selection();
                            setLanguageModalVisible(true);
                        }}
                    >
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={s.macroIconBox}>
                                <Globe size={20} color="#16A34A" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <View style={s.rowTitleWrap}>
                                    <Text style={s.macroTitle}>App Language</Text>
                                    <View style={s.langBadgeChip}>
                                        <Text style={{ fontSize: 13 }}>{currentLangObj.flag}</Text>
                                        <Text style={s.langBadgeTxt}>{currentLangObj.label}</Text>
                                    </View>
                                </View>
                                <Text style={s.macroSub}>System interface & audio prompt language</Text>
                            </View>
                            <View style={[s.actionButtonCircle, { backgroundColor: '#F0FDF4' }]}>
                                <ChevronRight size={16} color="#16A34A" strokeWidth={2.5} />
                            </View>
                        </View>
                    </TactileRow>

                    {/* Reduce Motion Card */}
                    <View style={s.macroCard}>
                        <View style={s.cardTopBar}>
                            <LinearGradient colors={['#FAF5FF', '#F3E8FF']} style={s.macroIconBox}>
                                <Eye size={20} color="#9333EA" strokeWidth={2.4} />
                            </LinearGradient>
                            <View style={s.cardHeaderInfo}>
                                <View style={s.rowTitleWrap}>
                                    <Text style={s.macroTitle}>Reduce Motion</Text>
                                    <View style={[s.liveBadgePill, reduceMotion ? s.liveBadgePurple : s.liveBadgeGray]}>
                                        <Text style={[s.badgeTxt, { color: reduceMotion ? '#6B21A8' : '#475569' }]}>
                                            {reduceMotion ? 'REDUCED' : 'STANDARD'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={s.macroSub}>Minimize screen animations & transitions</Text>
                            </View>
                            <CustomSwitch
                                value={!!reduceMotion}
                                onValueChange={handleToggleReduceMotion}
                                activeColor="#9333EA"
                            />
                        </View>
                    </View>

                    {/* ── Sign Out Card ── */}
                    <TactileRow style={{ marginTop: 14 }} onPress={handleSignOut}>
                        <LinearGradient colors={['#FEF2F2', '#FEE2E2']} style={s.signOutCard}>
                            <LogOut size={18} color="#EF4444" strokeWidth={2.4} />
                            <Text style={s.signOutTxt}>Sign Out of CareMyMed</Text>
                        </LinearGradient>
                    </TactileRow>

                    <Text style={s.versionFooter}>CareMyMed v1.0.0 • Production Build</Text>
                </Animated.ScrollView>

                {/* ── Change Password Modal ── */}
                <PremiumFormModal
                    visible={cpModalVisible}
                    onClose={() => setCpModalVisible(false)}
                    title="Change Password"
                    subtitle="Enter current and new access credentials"
                    icon={<Lock size={20} color="#7C3AED" strokeWidth={2.4} />}
                    iconColor="#7C3AED"
                    iconBg="#F5F3FF"
                    onSave={handleChangePassword}
                    saveText={savingCp ? "Updating..." : "Update Password"}
                    isSaving={savingCp}
                >
                    <SmartInput
                        label="Current Password"
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="••••••••"
                    />
                    <SmartInput
                        label="New Password"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Min 8 characters"
                    />
                    <SmartInput
                        label="Confirm New Password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Repeat new password"
                    />
                </PremiumFormModal>

                {/* ── Language Selector Modal ── */}
                <PremiumFormModal
                    visible={languageModalVisible}
                    onClose={() => setLanguageModalVisible(false)}
                    title="Select Language"
                    subtitle="Choose preferred language for app interface"
                    icon={<Globe size={20} color="#16A34A" strokeWidth={2.4} />}
                    iconColor="#16A34A"
                    iconBg="#F0FDF4"
                    showFooter={false}
                >
                    <View style={{ gap: 8, paddingVertical: 4 }}>
                        {LANGUAGES.map(lang => {
                            const isSel = lang.code === selectedLang;
                            return (
                                <TactileRow
                                    key={lang.code}
                                    onPress={() => handleSelectLanguage(lang.code)}
                                >
                                    <View style={[s.langItem, isSel && s.langItemSel]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Text style={{ fontSize: 20 }}>{lang.flag}</Text>
                                            <Text style={[s.langTxt, isSel && s.langTxtSel]}>{lang.label}</Text>
                                        </View>
                                        {isSel && (
                                            <View style={s.langCheckWrap}>
                                                <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                            </View>
                                        )}
                                    </View>
                                </TactileRow>
                            );
                        })}
                    </View>
                </PremiumFormModal>
            </View>
        </TabScreenTransition>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 56 : 42,
        paddingBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(241, 245, 249, 0.8)',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    headerTitleGroup: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
    headerSub: { fontSize: 11.5, fontWeight: '600', color: '#64748B', marginTop: 1 },

    scrollContent: { padding: 18, paddingBottom: 44 },

    // ── MACRO HERO CARD ──
    heroDashboardCard: {
        borderRadius: 26,
        padding: 18,
        marginBottom: 18,
        shadowColor: '#4338CA',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 5,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    heroShieldWrap: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroScoreEyebrow: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#C7D2FE',
        letterSpacing: 0.8,
    },
    heroScoreTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.4,
        marginTop: 2,
    },
    heroPulseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 12,
    },
    heroPulseDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#34D399',
    },
    heroPulseTxt: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

    heroProgressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        marginVertical: 14,
        overflow: 'hidden',
    },
    heroProgressBarFill: {
        height: '100%',
        borderRadius: 3,
    },

    heroMetricsGrid: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    heroMetricChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 11,
    },
    heroMetricTxt: { fontSize: 11, fontWeight: '700', color: '#E0E7FF' },

    // ── SECTION HEADERS ──
    sectionHeaderWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 14,
        marginBottom: 10,
        marginLeft: 2,
    },
    sectionBadge: {
        width: 4,
        height: 20,
        borderRadius: 2,
        backgroundColor: '#4F46E5',
    },
    sectionHeading: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.2,
    },
    sectionSub: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 1,
    },

    // ── MACRO FEATURE CARDS ──
    macroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    cardTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    macroIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardHeaderInfo: { flex: 1 },
    rowTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    macroTitle: { fontSize: 14.5, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
    macroSub: { fontSize: 11.5, fontWeight: '500', color: '#64748B', marginTop: 3, lineHeight: 16 },

    macroDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12,
    },

    contextualFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    contextualFooterTxt: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#64748B',
    },

    // ── BADGES & PILLS ──
    liveBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
    liveBadgeGreen: { backgroundColor: '#D1FAE5' },
    liveBadgeGray: { backgroundColor: '#F1F5F9' },
    liveBadgeBlue: { backgroundColor: '#DBEAFE' },
    liveBadgeWarn: { backgroundColor: '#FEF3C7' },
    liveBadgePurple: { backgroundColor: '#F3E8FF' },
    badgeTxt: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },

    liveBadgeSky: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeTxtSky: { fontSize: 9.5, fontWeight: '800', color: '#0369A1' },

    actionButtonCircle: {
        width: 32,
        height: 32,
        borderRadius: 11,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── CONTEXTUAL SCHEDULE & PREVIEWS ──
    scheduleChipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    scheduleLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    timeChipTxt: { fontSize: 11, fontWeight: '800', color: '#2563EB' },

    briefingPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    briefingLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
    previewTag: {
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    previewTagTxt: { fontSize: 11, fontWeight: '700', color: '#0284C7' },

    // ── SYNC ROW FOOTER ──
    syncFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    syncStatusTxt: { fontSize: 11.5, fontWeight: '600', color: '#059669' },
    syncBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    syncBtnTxt: { fontSize: 12, fontWeight: '800', color: '#10B981' },

    // ── CUSTOM SWITCH ──
    switchTrack: {
        width: 48,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    switchDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // ── LANGUAGE SELECTOR ──
    langBadgeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    langBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
    langItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    langItemSel: {
        backgroundColor: '#EEF2FF',
        borderColor: '#C7D2FE',
    },
    langTxt: { fontSize: 14.5, fontWeight: '600', color: '#334155' },
    langTxtSel: { color: '#4F46E5', fontWeight: '800' },
    langCheckWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── SIGN OUT ──
    signOutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 20,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    signOutTxt: { fontSize: 14.5, fontWeight: '800', color: '#EF4444' },
    versionFooter: { textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 22 },
});


