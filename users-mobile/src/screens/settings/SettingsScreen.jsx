import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Switch, Pressable,
    ActivityIndicator, Platform, Linking, StatusBar
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft, Shield, Lock, Bell, BellRing, Smartphone,
    Globe, Activity, RefreshCw, Moon, Sparkles, LogOut,
    Check, KeyRound, ChevronRight, Eye
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
import { colors } from '../../theme';
import { HapticPatterns } from '../../utils/haptics';

import * as LocalAuthentication from 'expo-local-authentication';

const LANGUAGES = [
    { code: 'en_IN', label: 'English (India)' },
    { code: 'hi_IN', label: 'हिन्दी (Hindi)' },
    { code: 'te_IN', label: 'తెలుగు (Telugu)' },
    { code: 'ta_IN', label: 'தமிழ் (Tamil)' },
    { code: 'kn_IN', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'mr_IN', label: 'मराठी (Marathi)' },
];

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

    return (
        <TabScreenTransition>
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                {/* ── Ambient Background Decorations ── */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg height="100%" width="100%" viewBox="0 0 400 850" preserveAspectRatio="none">
                        <Defs>
                            <SvgLinearGradient id="settingsTopBg" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#EEF2FF" stopOpacity="0.85" />
                                <Stop offset="100%" stopColor="#F8FAFC" stopOpacity="0" />
                            </SvgLinearGradient>
                        </Defs>
                        <Path d="M140 0 C220 100, 300 130, 400 100 L400 0 Z" fill="url(#settingsTopBg)" />
                        <Path
                            d="M-20 160 C80 210, 180 140, 280 210 C340 250, 380 220, 420 280"
                            stroke="#E2E8F0"
                            strokeWidth="1.5"
                            fill="none"
                            opacity="0.35"
                        />
                    </Svg>
                </View>

                {/* ── Brand Header ── */}
                <View style={styles.header}>
                    <Pressable
                        onPress={() => {
                            HapticPatterns.selection();
                            navigation.goBack();
                        }}
                        style={styles.backBtn}
                        hitSlop={12}
                    >
                        <ChevronLeft size={22} color="#0F172A" strokeWidth={2.5} />
                    </Pressable>
                    <View style={styles.headerTitleGroup}>
                        <Text style={styles.headerTitle}>Settings & Preferences</Text>
                        <Text style={styles.headerSub}>Manage security, alarms & health sync</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ── Section 1: Security & Access ── */}
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionBadge} />
                        <Text style={styles.sectionHeading}>Security & Access</Text>
                    </View>
                    <View style={styles.cardContainer}>
                        {/* Biometrics Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Smartphone size={18} color="#6366F1" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>{biometricType} Login</Text>
                                <Text style={styles.settingSub}>Use Face ID or Fingerprint for instant unlock</Text>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                onValueChange={handleToggleBiometrics}
                                trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
                                thumbColor={biometricEnabled ? '#4F46E5' : '#FFFFFF'}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Change Password Row */}
                        <Pressable style={styles.settingRow} onPress={() => {
                            HapticPatterns.selection();
                            setCpModalVisible(true);
                        }}>
                            <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
                                <KeyRound size={18} color="#7C3AED" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Change Password</Text>
                                <Text style={styles.settingSub}>Update account access credentials</Text>
                            </View>
                            <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                        </Pressable>
                    </View>

                    {/* ── Section 2: Notifications & Health Alarms ── */}
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.sectionBadge, { backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.sectionHeading}>Notifications & Health Alarms</Text>
                    </View>
                    <View style={styles.cardContainer}>
                        {/* Medication Reminders Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                                <BellRing size={18} color="#3B82F6" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Medication Reminders</Text>
                                <Text style={styles.settingSub}>Push alarms for daily dose schedules</Text>
                            </View>
                            <Switch
                                value={medReminders}
                                onValueChange={handleToggleMedReminders}
                                trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                                thumbColor={medReminders ? '#2563EB' : '#FFFFFF'}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Daily Briefing Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0F9FF' }]}>
                                <Sparkles size={18} color="#0284C7" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Daily Health Briefing</Text>
                                <Text style={styles.settingSub}>Morning status & trend alert updates</Text>
                            </View>
                            <Switch
                                value={pushEnabled}
                                onValueChange={handleTogglePushNotifications}
                                trackColor={{ false: '#E2E8F0', true: '#BAE6FD' }}
                                thumbColor={pushEnabled ? '#0284C7' : '#FFFFFF'}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* OS System Notification Settings */}
                        <Pressable style={styles.settingRow} onPress={() => {
                            HapticPatterns.selection();
                            Linking.openSettings();
                        }}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                                <Bell size={18} color="#D97706" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Device Notification Settings</Text>
                                <Text style={styles.settingSub}>
                                    {notifPermissionGranted ? 'System permissions enabled' : 'Permissions blocked in OS settings'}
                                </Text>
                            </View>
                            <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                        </Pressable>
                    </View>

                    {/* ── Section 3: Preferences & Wearable Sync ── */}
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.sectionBadge, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.sectionHeading}>Preferences & Wearable Sync</Text>
                    </View>
                    <View style={styles.cardContainer}>
                        {/* Health Sync Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                                <Activity size={18} color="#10B981" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Wearable Health Sync</Text>
                                <Text style={styles.settingSub}>
                                    {lastSyncStr ? `Last synced at ${lastSyncStr}` : 'Health Connect / HealthKit integration'}
                                </Text>
                            </View>
                            <Pressable 
                                style={[styles.syncActionBtn, isSyncing && { opacity: 0.6 }]} 
                                onPress={handleManualHealthSync}
                                disabled={isSyncing}
                            >
                                {isSyncing ? (
                                    <ActivityIndicator size="small" color="#10B981" />
                                ) : (
                                    <>
                                        <RefreshCw size={12} color="#10B981" strokeWidth={2.5} />
                                        <Text style={styles.syncActionTxt}>Sync</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>

                        <View style={styles.divider} />

                        {/* App Language */}
                        <Pressable style={styles.settingRow} onPress={() => {
                            HapticPatterns.selection();
                            setLanguageModalVisible(true);
                        }}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                                <Globe size={18} color="#16A34A" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>App Language</Text>
                                <Text style={styles.settingSub}>
                                    {LANGUAGES.find(l => l.code === selectedLang)?.label || 'English'}
                                </Text>
                            </View>
                            <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                        </Pressable>

                        <View style={styles.divider} />

                        {/* Reduce Motion */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#FAF5FF' }]}>
                                <Eye size={18} color="#9333EA" strokeWidth={2.4} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Reduce Motion</Text>
                                <Text style={styles.settingSub}>Minimize screen animations & transitions</Text>
                            </View>
                            <Switch
                                value={!!reduceMotion}
                                onValueChange={(val) => {
                                    HapticPatterns.selection();
                                    setReduceMotion(val);
                                }}
                                trackColor={{ false: '#E2E8F0', true: '#E9D5FF' }}
                                thumbColor={reduceMotion ? '#9333EA' : '#FFFFFF'}
                            />
                        </View>
                    </View>

                    {/* ── Sign Out Card ── */}
                    <Pressable style={styles.signOutCard} onPress={handleSignOut}>
                        <LogOut size={18} color="#EF4444" strokeWidth={2.4} />
                        <Text style={styles.signOutTxt}>Sign Out of CareMyMed</Text>
                    </Pressable>

                    <Text style={styles.versionFooter}>CareMyMed v1.0.0 • Production Build</Text>
                </ScrollView>

                {/* ── Change Password Modal (PremiumFormModal System) ── */}
                <PremiumFormModal
                    visible={cpModalVisible}
                    onClose={() => setCpModalVisible(false)}
                    title="Change Password"
                    subtitle="Enter current and new access credentials"
                    icon={Lock}
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

                {/* ── Language Selector Modal (PremiumFormModal System) ── */}
                <PremiumFormModal
                    visible={languageModalVisible}
                    onClose={() => setLanguageModalVisible(false)}
                    title="Select Language"
                    subtitle="Choose preferred language for app interface"
                    icon={Globe}
                    iconColor="#16A34A"
                    iconBg="#F0FDF4"
                    showFooter={false}
                >
                    <View style={{ gap: 4, paddingVertical: 4 }}>
                        {LANGUAGES.map(lang => {
                            const isSel = lang.code === selectedLang;
                            return (
                                <Pressable
                                    key={lang.code}
                                    style={[styles.langItem, isSel && styles.langItemSel]}
                                    onPress={() => handleSelectLanguage(lang.code)}
                                >
                                    <Text style={[styles.langTxt, isSel && styles.langTxtSel]}>{lang.label}</Text>
                                    {isSel && <Check size={18} color="#4F46E5" strokeWidth={3} />}
                                </Pressable>
                            );
                        })}
                    </View>
                </PremiumFormModal>
            </View>
        </TabScreenTransition>
    );
}

const styles = StyleSheet.create({
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

    scrollContent: { padding: 20, paddingBottom: 44 },
    
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        marginBottom: 10,
        marginLeft: 2,
    },
    sectionBadge: {
        width: 4,
        height: 14,
        borderRadius: 2,
        backgroundColor: '#6366F1',
    },
    sectionHeading: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },

    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 10,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    settingTextGroup: { flex: 1 },
    settingTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
    settingSub: { fontSize: 11.5, fontWeight: '500', color: '#64748B', marginTop: 2, lineHeight: 15 },
    divider: { height: 1, backgroundColor: '#F1F5F9' },

    syncActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    syncActionTxt: { fontSize: 11.5, fontWeight: '800', color: '#10B981' },

    signOutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 20,
        paddingVertical: 15,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    signOutTxt: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
    versionFooter: { textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 22 },

    langItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 6,
    },
    langItemSel: {
        backgroundColor: '#EEF2FF',
        borderColor: '#C7D2FE',
    },
    langTxt: { fontSize: 14, fontWeight: '600', color: '#334155' },
    langTxtSel: { color: '#4F46E5', fontWeight: '800' },
});
