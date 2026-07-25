import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Switch, Pressable,
    ActivityIndicator, Platform, Linking, StatusBar, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft, Shield, Lock, Bell, BellRing, Smartphone,
    Globe, Activity, RefreshCw, Moon, Sparkles, LogOut,
    Check, AlertCircle, KeyRound, ChevronRight, Zap, Eye
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
import TabScreenTransition from '../../components/ui/TabScreenTransition';
import AnimatedCard from '../../components/ui/AnimatedCard';

let LocalAuthentication = null;
try {
    LocalAuthentication = require('expo-local-authentication');
} catch (e) {
    LocalAuthentication = null;
}

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
    const { signOut, userEmail } = useAuth();
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
                // Check Biometrics
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

                // Check Notifications
                const perms = await Notifications.getPermissionsAsync();
                setNotifPermissionGranted(perms.status === 'granted');

                // Check Health Sync
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

    // Sync state updates when patient store changes
    useEffect(() => {
        if (patient) {
            if (patient.medication_reminders_enabled !== undefined) setMedReminders(patient.medication_reminders_enabled);
            if (patient.push_notifications_enabled !== undefined) setPushEnabled(patient.push_notifications_enabled);
            if (patient.language) setSelectedLang(patient.language);
        }
    }, [patient]);

    // ── Handlers ──
    const handleToggleBiometrics = async (val) => {
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
        setMedReminders(val);
        try {
            const res = await apiService.patients.updateMe({ medication_reminders_enabled: val });
            if (res.data?.patient) setPatient(res.data.patient);
        } catch (err) {
            console.warn('Failed to update medication reminder setting:', err.message);
        }
    };

    const handleTogglePushNotifications = async (val) => {
        setPushEnabled(val);
        try {
            const res = await apiService.patients.updateMe({ push_notifications_enabled: val });
            if (res.data?.patient) setPatient(res.data.patient);
        } catch (err) {
            console.warn('Failed to update push notification setting:', err.message);
        }
    };

    const handleManualHealthSync = async () => {
        setIsSyncing(true);
        try {
            const res = await HealthSyncService.syncVitals();
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
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

                {/* ── Top Header ── */}
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
                        <ChevronLeft size={22} color="#0F172A" strokeWidth={2.5} />
                    </Pressable>
                    <View style={styles.headerTitleGroup}>
                        <Text style={styles.headerTitle}>Settings & Preferences</Text>
                        <Text style={styles.headerSub}>Manage security, alarms & health sync</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ── Section 1: Security & Authentication ── */}
                    <Text style={styles.sectionHeading}>Security & Access</Text>
                    <View style={styles.cardContainer}>
                        {/* Biometrics Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Smartphone size={18} color="#4F46E5" strokeWidth={2.5} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>{biometricType} Login</Text>
                                <Text style={styles.settingSub}>Use Face ID or Fingerprint for instant unlock</Text>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                onValueChange={handleToggleBiometrics}
                                trackColor={{ false: '#CBD5E1', true: '#818CF8' }}
                                thumbColor={biometricEnabled ? '#4F46E5' : '#F8FAFC'}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Change Password Row */}
                        <Pressable style={styles.settingRow} onPress={() => setCpModalVisible(true)}>
                            <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
                                <KeyRound size={18} color="#7C3AED" strokeWidth={2.5} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Change Password</Text>
                                <Text style={styles.settingSub}>Update account access credential</Text>
                            </View>
                            <ChevronRight size={18} color="#94A3B8" />
                        </Pressable>
                    </View>

                    {/* ── Section 2: Notifications & Health Alarms ── */}
                    <Text style={styles.sectionHeading}>Notifications & Health Alarms</Text>
                    <View style={styles.cardContainer}>
                        {/* Pill Reminders Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#ECFEFF' }]}>
                                <BellRing size={18} color="#0891B2" strokeWidth={2.5} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Medication Reminders</Text>
                                <Text style={styles.settingSub}>Push alarms for daily dose schedules</Text>
                            </View>
                            <Switch
                                value={medReminders}
                                onValueChange={handleToggleMedReminders}
                                trackColor={{ false: '#CBD5E1', true: '#67E8F9' }}
                                thumbColor={medReminders ? '#0891B2' : '#F8FAFC'}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Daily Briefing Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0F9FF' }]}>
                                <Sparkles size={18} color="#0284C7" strokeWidth={2.5} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Daily Health Briefing</Text>
                                <Text style={styles.settingSub}>Morning status & trend alert updates</Text>
                            </View>
                            <Switch
                                value={pushEnabled}
                                onValueChange={handleTogglePushNotifications}
                                trackColor={{ false: '#CBD5E1', true: '#38BDF8' }}
                                thumbColor={pushEnabled ? '#0284C7' : '#F8FAFC'}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* OS System Notification Settings */}
                        <Pressable style={styles.settingRow} onPress={() => Linking.openSettings()}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                                <Bell size={18} color="#D97706" strokeWidth={2.5} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Device Notification Settings</Text>
                                <Text style={styles.settingSub}>
                                    {notifPermissionGranted ? 'System permissions enabled' : 'Permissions blocked in OS settings'}
                                </Text>
                            </View>
                            <ChevronRight size={18} color="#94A3B8" />
                        </Pressable>
                    </View>

                    {/* ── Section 3: Preferences & Wearable Sync ── */}
                    <Text style={styles.sectionHeading}>Preferences & Wearable Sync</Text>
                    <View style={styles.cardContainer}>
                        {/* Health Sync Row */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#FFF1F2' }]}>
                                <Activity size={18} color="#F43F5E" strokeWidth={2.5} />
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
                                    <ActivityIndicator size="small" color="#F43F5E" />
                                ) : (
                                    <>
                                        <RefreshCw size={12} color="#F43F5E" strokeWidth={2.5} />
                                        <Text style={styles.syncActionTxt}>Sync</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>

                        <View style={styles.divider} />

                        {/* App Language */}
                        <Pressable style={styles.settingRow} onPress={() => setLanguageModalVisible(true)}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                                <Globe size={18} color="#16A34A" strokeWidth={2.5} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>App Language</Text>
                                <Text style={styles.settingSub}>
                                    {LANGUAGES.find(l => l.code === selectedLang)?.label || 'English'}
                                </Text>
                            </View>
                            <ChevronRight size={18} color="#94A3B8" />
                        </Pressable>

                        <View style={styles.divider} />

                        {/* Reduce Motion */}
                        <View style={styles.settingRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#FAF5FF' }]}>
                                <Eye size={18} color="#9333EA" strokeWidth={2.5} />
                            </View>
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingTitle}>Reduce Motion</Text>
                                <Text style={styles.settingSub}>Minimize screen animations & transitions</Text>
                            </View>
                            <Switch
                                value={!!reduceMotion}
                                onValueChange={(val) => setReduceMotion(val)}
                                trackColor={{ false: '#CBD5E1', true: '#C084FC' }}
                                thumbColor={reduceMotion ? '#9333EA' : '#F8FAFC'}
                            />
                        </View>
                    </View>

                    {/* ── Sign Out CTA ── */}
                    <Pressable style={styles.signOutCard} onPress={handleSignOut}>
                        <LogOut size={18} color="#EF4444" strokeWidth={2.5} />
                        <Text style={styles.signOutTxt}>Sign Out of CareMyMed</Text>
                    </Pressable>

                    <Text style={styles.versionFooter}>CareMyMed v1.0.0 • Production Build</Text>
                </ScrollView>

                {/* ── Change Password Modal ── */}
                <Modal visible={cpModalVisible} transparent animationType="fade" onRequestClose={() => setCpModalVisible(false)}>
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <Text style={styles.modalSub}>Enter current and new access credentials</Text>

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

                            <View style={styles.modalActions}>
                                <Pressable style={styles.cancelBtn} onPress={() => setCpModalVisible(false)}>
                                    <Text style={styles.cancelTxt}>Cancel</Text>
                                </Pressable>
                                <Pressable style={styles.saveBtn} onPress={handleChangePassword} disabled={savingCp}>
                                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.saveGradient}>
                                        {savingCp ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveTxt}>Update</Text>}
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* ── Language Selector Modal ── */}
                <Modal visible={languageModalVisible} transparent animationType="slide" onRequestClose={() => setLanguageModalVisible(false)}>
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Select Language</Text>
                            <Text style={styles.modalSub}>Choose preferred language for app interface</Text>

                            <ScrollView style={{ maxHeight: 260 }}>
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
                            </ScrollView>

                            <Pressable style={[styles.cancelBtn, { marginTop: 14 }]} onPress={() => setLanguageModalVisible(false)}>
                                <Text style={styles.cancelTxt}>Close</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </View>
        </TabScreenTransition>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 14,
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
    },
    backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    headerTitleGroup: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
    headerSub: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 1 },

    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionHeading: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14, marginBottom: 8, marginLeft: 4 },

    cardContainer: {
        backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4,
        borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12,
        shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    settingTextGroup: { flex: 1 },
    settingTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    settingSub: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#F1F5F9' },

    syncActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF1F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FECDD3' },
    syncActionTxt: { fontSize: 11, fontWeight: '800', color: '#F43F5E' },

    signOutCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#FEF2F2', borderRadius: 18, paddingVertical: 14, marginTop: 14,
        borderWidth: 1, borderColor: '#FEE2E2',
    },
    signOutTxt: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
    versionFooter: { textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 20 },

    /* Modals */
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
    modalSub: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2, marginBottom: 14 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    cancelTxt: { fontSize: 13, fontWeight: '800', color: '#64748B' },
    saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    saveGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
    saveTxt: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

    langItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 4 },
    langItemSel: { backgroundColor: '#EEF2FF' },
    langTxt: { fontSize: 14, fontWeight: '600', color: '#334155' },
    langTxtSel: { color: '#4F46E5', fontWeight: '800' },
});
