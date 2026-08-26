import React, { useEffect, useRef, useState, useCallback } from "react";
import CustomAlert from '../components/ui/CustomAlert';
import AlertManager from '../utils/AlertManager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';

import {
    View, Text, StyleSheet, Animated, ActivityIndicator,
    TouchableOpacity, Pressable, Image, Platform, DeviceEventEmitter, AppState
} from "react-native";
import Constants from 'expo-constants';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LayoutDashboard, Users, Pill, ShieldPlus, UserCircle, Bell, MessageSquare } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import {
    sendDailyWelcomeNotification,
    registerForPushNotificationsAsync,
    sendSeamlessExperienceNotification,
} from "../utils/notifications";
import { apiService } from "../lib/api";
import { colors, layout, elevation } from "../theme";
import usePatientStore from '../store/usePatientStore';
import NetInfo from '@react-native-community/netinfo';
import OfflineSyncService from '../lib/OfflineSyncService';
import { navigate } from '../lib/navigationRef';
import { routeNotification, flushPendingNotifications } from '../utils/NotificationRouter';
import GlobalSyncBanner from '../components/ui/GlobalSyncBanner';
import AchievementCelebration from '../components/adherence/AchievementCelebration';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { useGuide } from '../context/GuideContext';

import PatientSignupScreen from "../screens/onboarding/PatientSignupScreen";
import LoginScreen from "../screens/onboarding/LoginScreen";
import ResetPasswordScreen from "../screens/onboarding/ResetPasswordScreen";
import VerifyEmailScreen from "../screens/onboarding/VerifyEmailScreen";
import MFAVerifyScreen from "../screens/auth/MFAVerifyScreen";
import MFASetupScreen from "../screens/settings/MFASetupScreen";
import DeveloperObservabilityScreen from "../screens/settings/DeveloperObservabilityScreen";
import PatientDiagnosticsScreen from "../screens/settings/PatientDiagnosticsScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import CompanionSignupScreen from '../screens/onboarding/CompanionSignupScreen';
import BrandedSplashScreen from '../components/ui/BrandedSplashScreen';

import CompanionHomeScreen from '../screens/app/CompanionHomeScreen';
import CompanionDashboardScreen from '../screens/app/CompanionDashboardScreen';
import CompanionAlertsScreen from '../screens/app/CompanionAlertsScreen';
import CompanionProfileScreen from '../screens/app/CompanionProfileScreen';
import CompanionChatListScreen from '../screens/app/CompanionChatListScreen';
import CompanionAnalyticsScreen from '../screens/app/CompanionAnalyticsScreen';
import CareCircleScreen from '../screens/app/CareCircleScreen';

import PatientHomeScreen from "../screens/patient/HomeScreen";
import MyCallerScreen from "../screens/patient/MyCallerScreen";
import MedicationsScreen from "../screens/patient/MedicationsScreen";
import HealthProfileScreen from "../screens/patient/HealthProfileScreen";
import NotificationsScreen from "../screens/patient/NotificationsScreen";
import PatientProfileScreen from "../screens/patient/ProfileScreen";
import WaitingScreen from "../screens/patient/WaitingScreen";
import VitalsHistoryScreen from "../screens/patient/VitalsHistoryScreen";
import LocationSearchScreen from "../screens/patient/LocationSearchScreen";
import AddAddressScreen from "../screens/patient/AddAddressScreen";
import HealthConnectSetupScreen from "../screens/patient/HealthConnectSetupScreen";
import AdherenceScreen from "../screens/patient/AdherenceScreen";
import ChatbotScreen from "../screens/patient/ChatbotScreen";
import ChatHistoryScreen from "../screens/patient/ChatHistoryScreen";
import CallHistoryScreen from "../screens/patient/CallHistoryScreen";
import PremiumShowcaseScreen from "../screens/patient/PremiumShowcaseScreen";
import PrescriptionVerificationScreen from "../screens/patient/PrescriptionVerificationScreen";
import ChatFAB from "../components/ui/ChatFAB";
import HealthCopilotScreen from "../screens/patient/HealthCopilotScreen";
import InterventionCenterScreen from "../screens/app/InterventionCenterScreen";
import BottomSheetProvider from "../components/ui/BottomSheetProvider";
import LivingGlassProvider from "../livingGlass/runtime/LivingGlassRuntime";
import { withRecoverableBoundary } from "../components/RecoverableBoundary";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Resilient Wrapped Screens (prevents full-screen app error takeovers) ─────
const ResilientHomeScreen = withRecoverableBoundary(PatientHomeScreen, { featureName: 'PatientHome', screenName: 'HomeScreen' });
const ResilientMyCallerScreen = withRecoverableBoundary(MyCallerScreen, { featureName: 'MyCaller', screenName: 'MyCallerScreen' });
const ResilientMedicationsScreen = withRecoverableBoundary(MedicationsScreen, { featureName: 'Medications', screenName: 'MedicationsScreen' });
const ResilientHealthProfileScreen = withRecoverableBoundary(HealthProfileScreen, { featureName: 'HealthProfile', screenName: 'HealthProfileScreen' });
const ResilientProfileScreen = withRecoverableBoundary(PatientProfileScreen, { featureName: 'Profile', screenName: 'ProfileScreen' });
const ResilientSettingsScreen = withRecoverableBoundary(SettingsScreen, { featureName: 'Settings', screenName: 'SettingsScreen' });
const ResilientChatbotScreen = withRecoverableBoundary(ChatbotScreen, { featureName: 'Chatbot', screenName: 'ChatbotScreen' });

// Resilient Companion Wrapped Screens
const ResilientCompanionHomeScreen = withRecoverableBoundary(CompanionHomeScreen, { featureName: 'CompanionHome', screenName: 'CompanionHomeScreen' });
const ResilientCompanionDashboardScreen = withRecoverableBoundary(CompanionDashboardScreen, { featureName: 'CompanionDashboard', screenName: 'CompanionDashboardScreen' });
const ResilientCompanionAlertsScreen = withRecoverableBoundary(CompanionAlertsScreen, { featureName: 'CompanionAlerts', screenName: 'CompanionAlertsScreen' });
const ResilientCompanionProfileScreen = withRecoverableBoundary(CompanionProfileScreen, { featureName: 'CompanionProfile', screenName: 'CompanionProfileScreen' });
const ResilientCompanionAnalyticsScreen = withRecoverableBoundary(CompanionAnalyticsScreen, { featureName: 'CompanionAnalytics', screenName: 'CompanionAnalyticsScreen' });
const ResilientCareCircleScreen = withRecoverableBoundary(CareCircleScreen, { featureName: 'CareCircle', screenName: 'CareCircleScreen' });
const ResilientInterventionCenterScreen = withRecoverableBoundary(InterventionCenterScreen, { featureName: 'InterventionCenter', screenName: 'InterventionCenterScreen' });
const ResilientCompanionChatListScreen = withRecoverableBoundary(CompanionChatListScreen, { featureName: 'CompanionChatList', screenName: 'CompanionChatListScreen' });
const ResilientChatHistoryScreen = withRecoverableBoundary(ChatHistoryScreen, { featureName: 'ChatHistory', screenName: 'ChatHistoryScreen' });

export const TAB_BAR_HEIGHT = layout.TAB_BAR_HEIGHT;
export const TAB_BAR_BOTTOM = layout.TAB_BAR_BOTTOM;
export const TAB_BAR_CLEARANCE = layout.TAB_BAR_CLEARANCE;

// ── Stale notification threshold: ignore responses older than 30 seconds ──
// BUG 12 FIX: getLastNotificationResponseAsync() is called on every mount.
// If the app is already running (not in killed state), this returns a stale
// old notification and causes a spurious navigate() call. We reject any

const STALE_NOTIFICATION_MS = 30_000;

function isStaleNotification(response) {
    if (!response) return true;
    const deliveredAt = response.notification.date * 1000;
    return Date.now() - deliveredAt > STALE_NOTIFICATION_MS;
}

function CustomTabBar({ state, descriptors, navigation }) {
    const insets = useSafeAreaInsets();
    const dynamicBottom = insets.bottom > 0 ? insets.bottom : layout.TAB_BAR_BOTTOM;
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { currentStepId } = useGuide();

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('FORM_MODAL_VISIBLE', (visible) => {
            setIsModalVisible(visible);
        });
        return () => sub.remove();
    }, []);

    if (isModalVisible) return null;

    return (
        <View style={[styles.tabBarContainer, { bottom: dynamicBottom }]}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const focused = state.index === index;
                const isHighlighted = (currentStepId === 'care_team_tab' || currentStepId === 'care_team_contacts') && route.name === 'MyCaller';
                const onPress = () => {
                    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                };
                const IconComponent = options.tabBarIconComponent;
                return (
                    <TouchableOpacity
                        key={route.key} onPress={onPress} style={styles.tabItem}
                        activeOpacity={0.75} testID={`tab-${route.name}`} accessibilityLabel={route.name}
                    >
                        <TabSlot focused={focused} isHighlighted={isHighlighted} IconConfig={IconComponent} />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function TabSlot({ focused, isHighlighted = false, IconConfig }) {
    const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: isHighlighted ? 1.08 : focused ? 1 : 0.92,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
        }).start();
    }, [focused, isHighlighted, scaleAnim]);

    return (
        <Animated.View style={[
            styles.tabSlot, 
            focused && styles.tabSlotActive, 
            isHighlighted && styles.tabSlotHighlighted,
            { transform: [{ scale: scaleAnim }] }
        ]}>
            {IconConfig ? (
                <IconConfig
                    color={focused || isHighlighted ? colors.surface : colors.textMuted}
                    size={20}
                    strokeWidth={focused || isHighlighted ? 2.2 : 2.0}
                />
            ) : null}
        </Animated.View>
    );
}

function PatientTabNavigator() {
    const insets = useSafeAreaInsets();
    const dynamicBottom = insets.bottom > 0 ? insets.bottom : layout.TAB_BAR_BOTTOM;
    const fabBottom = dynamicBottom + layout.TAB_BAR_HEIGHT + 16;
    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: colors.canvas } }}>
                <Tab.Screen name="PatientHome" component={ResilientHomeScreen} options={{ tabBarIconComponent: LayoutDashboard }} />
                <Tab.Screen name="MyCaller" component={ResilientMyCallerScreen} options={{ tabBarIconComponent: Users }} />
                <Tab.Screen name="Medications" component={ResilientMedicationsScreen} options={{ tabBarIconComponent: Pill }} />
                <Tab.Screen name="HealthProfile" component={ResilientHealthProfileScreen} options={{ tabBarIconComponent: ShieldPlus }} />
                <Tab.Screen name="Profile" component={ResilientProfileScreen} options={{ tabBarIconComponent: UserCircle }} />
            </Tab.Navigator>
            <ChatFAB onPress={() => navigate('ChatHistory')} bottomOffset={fabBottom} />
        </View>
    );
}

function CompanionTabNavigator() {
    return (
        <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: colors.canvas } }}>
            <Tab.Screen name="CompanionDashboard" component={ResilientCompanionDashboardScreen} options={{ tabBarIconComponent: LayoutDashboard }} />
            <Tab.Screen name="CompanionAlerts" component={ResilientCompanionAlertsScreen} options={{ tabBarIconComponent: Bell }} />
            <Tab.Screen name="CompanionChatList" component={ResilientCompanionChatListScreen} options={{ tabBarIconComponent: MessageSquare }} />
            <Tab.Screen name="Profile" component={ResilientCompanionProfileScreen} options={{ tabBarIconComponent: UserCircle }} />
        </Tab.Navigator>
    );
}

const CompanionMainStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: "fade" }}>
        <Stack.Screen name="CompanionHome" component={ResilientCompanionHomeScreen} />
        <Stack.Screen name="CompanionTabs" component={CompanionTabNavigator} />
        <Stack.Screen name="CompanionAnalytics" component={ResilientCompanionAnalyticsScreen} />
        <Stack.Screen name="CareCircle" component={ResilientCareCircleScreen} />
        <Stack.Screen name="ChatHistory" component={ResilientChatHistoryScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
        <Stack.Screen name="Chatbot" component={ResilientChatbotScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
        <Stack.Screen name="InterventionCenter" component={ResilientInterventionCenterScreen} />
    </Stack.Navigator>
);

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: "fade", animationDuration: 300 }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PatientSignup" component={PatientSignupScreen} />
        <Stack.Screen name="CompanionSignup" component={CompanionSignupScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="MFAVerify" component={MFAVerifyScreen} />
    </Stack.Navigator>
);

const PatientOnboardingStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: "fade" }}>
        <Stack.Screen name="PatientSignupOnboarding" component={PatientSignupScreen} />
    </Stack.Navigator>
);

const MainAppStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: "slide_from_right", animationDuration: 250 }}>
        <Stack.Screen name="PatientTabs" component={PatientTabNavigator} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="VitalsHistory" component={VitalsHistoryScreen} options={{ animation: "fade_from_bottom" }} />
        <Stack.Screen name="Adherence" component={AdherenceScreen} options={{ animation: "fade_from_bottom" }} />
        <Stack.Screen name="Chatbot" component={ResilientChatbotScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
        <Stack.Screen name="ChatHistory" component={ResilientChatHistoryScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
        <Stack.Screen name="CallHistory" component={CallHistoryScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
        <Stack.Screen name="HealthCopilot" component={HealthCopilotScreen} options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
        <Stack.Screen name="LocationSearch" component={LocationSearchScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="AddAddress" component={AddAddressScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="HealthConnectSetup" component={HealthConnectSetupScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="PrescriptionVerification" component={PrescriptionVerificationScreen} options={{ presentation: "modal" }} />
        <Stack.Screen name="DeveloperObservability" component={DeveloperObservabilityScreen} />
        <Stack.Screen name="PatientDiagnostics" component={PatientDiagnosticsScreen} />
        <Stack.Screen name="Settings" component={ResilientSettingsScreen} />
        <Stack.Screen name="MFASetup" component={MFASetupScreen} />
    </Stack.Navigator>
);

export default function AppNavigator() {
    const { user, profile, isBootstrapping, subscriptionStatus, onboardingComplete, isSwitching } = useAuth();
    const patient = usePatientStore(state => state.patient);
    const refreshDashboard = usePatientStore(state => state.refreshDashboard);
    const hasNotifiedForUserRef = useRef(null);
    const [showBrandedSplash, setShowBrandedSplash] = useState(true);
    const debounceTimeoutRef = useRef(null);

    const refreshDashboardDebounced = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            if (usePatientStore.getState().patient) {
                console.log('[AppNavigator] App returned to foreground — refreshing dashboard');
                refreshDashboard();
            }
        }, 1000);
    }, [refreshDashboard]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                refreshDashboardDebounced();
            }
        });
        return () => subscription.remove();
    }, [refreshDashboardDebounced]);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            if (state.isConnected && state.isInternetReachable !== false) {
                if (__DEV__) console.log('[OfflineSync] Network restored, flushing queue...');
                OfflineSyncService.flushQueue();
            }
        });
        NetInfo.fetch().then(state => { if (state.isConnected) OfflineSyncService.flushQueue(); });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const initLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem('@user_preferred_language');
                if (savedLang) {
                    await i18n.changeLanguage(savedLang);
                }
            } catch (e) {
                console.warn('[AppNavigator] Failed to load local preferred language:', e);
            }
        };
        initLanguage();
    }, []);

    useEffect(() => {
        SplashScreen.hideAsync().catch(() => { });
    }, []);

    useEffect(() => {
        let isMounted = true;
        const applyCaptureSetting = async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            if (!isMounted) return;

            if (user) {
                if (patient?.allow_screenshots === false) {
                    await ScreenCapture.preventScreenCaptureAsync().catch(err => console.warn('preventScreenCaptureAsync failed', err));
                } else {
                    await ScreenCapture.allowScreenCaptureAsync().catch(err => console.warn('allowScreenCaptureAsync failed', err));
                }
            } else {
                await ScreenCapture.allowScreenCaptureAsync().catch(() => { });
            }
        };

        applyCaptureSetting();
        return () => { isMounted = false; };
    }, [user, patient?.allow_screenshots]);

    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            const type = notification.request.content.data?.type;
            const patientStore = usePatientStore.getState();
            patientStore.fetchDashboard(true);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const actionId = response.actionIdentifier;
            const content = response.notification.request.content;

            if (actionId === 'TAKEN') {
                const slotKey = content.data?.slot;
                if (slotKey) usePatientStore.getState().optimisticMarkSlotTaken(slotKey);
                return;
            }

            if (actionId === 'SNOOZE') {
                Notifications.scheduleNotificationAsync({
                    content,
                    trigger: { type: 'timeInterval', seconds: 10 * 60, channelId: 'meds' },
                });
                return;
            }

            const data = content.data;
            if (data) routeNotification(data);
        });

        Notifications.getLastNotificationResponseAsync().then(response => {
            if (response && !isStaleNotification(response)) {
                const data = response.notification.request.content.data;
                if (data) setTimeout(() => routeNotification(data), 500);
            }
        });

        const tokenListener = Notifications.addPushTokenListener(async (tokenData) => {
            const newPushToken = tokenData.data;
            if (!newPushToken) return;

            try {
                await apiService.patients.updateMe({ expo_push_token: newPushToken });
            } catch (err) {
                console.error('❌ Failed to sync rotated token:', err);
            }
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
            tokenListener?.remove();
        };
    }, []);

    useEffect(() => {
        const setupNotifications = async () => {
            if (!user || !onboardingComplete) return;
            if (profile?.role === 'companion') return;
            const setupKey = `${user.id}_${profile?.role || 'patient'}`;
            if (hasNotifiedForUserRef.current === setupKey) return;

            hasNotifiedForUserRef.current = setupKey;

            try {
                const { token, granted, isNewGrant } = await registerForPushNotificationsAsync();
                if (token) {
                    const updates = { expo_push_token: token };
                    if (isNewGrant) updates.push_notifications_enabled = true;
                    await apiService.patients.updateMe(updates);
                }
                if (isNewGrant) sendSeamlessExperienceNotification();
                else if (granted) {
                    const name = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
                    sendDailyWelcomeNotification(name);
                }
            } catch (err) {
                console.warn('Notification setup failed:', err.message);
            }
        };

        setupNotifications();
    }, [onboardingComplete, user, profile]);

    useEffect(() => {
        if (user) {
            flushPendingNotifications();
        }
    }, [user, onboardingComplete]);

    const alertRef = useCallback((ref) => {
        if (ref) AlertManager.setRef(ref);
    }, []);

    const renderContent = () => {
        if (isBootstrapping) {
            return <CustomAlert ref={alertRef} />;
        }

        if (isSwitching) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
                    <Text style={styles.loadingText}>Switching workspace...</Text>
                    <CustomAlert ref={alertRef} />
                </View>
            );
        }

        if (!user) return (
            <>
                <AuthStack />
                <CustomAlert ref={alertRef} />
            </>
        );
        if (!onboardingComplete && profile?.role !== 'companion') return (
            <>
                <PatientOnboardingStack />
                <CustomAlert ref={alertRef} />
            </>
        );

        if (profile?.role === 'companion') {
            return (
                <LivingGlassProvider>
                    <BottomSheetProvider>
                        <View style={{ flex: 1 }}>
                            <GlobalSyncBanner />
                            <CompanionMainStack />
                            <CustomAlert ref={alertRef} />
                        </View>
                    </BottomSheetProvider>
                </LivingGlassProvider>
            );
        }

        if (subscriptionStatus !== 'active') {
            return (
                <>
                    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
                        <Stack.Screen name="Payment" component={PremiumShowcaseScreen} />
                        <Stack.Screen name="WaitingRoom" component={WaitingScreen} />
                        <Stack.Screen name="Profile" component={PatientProfileScreen} options={{ presentation: "modal" }} />
                    </Stack.Navigator>
                    <CustomAlert ref={alertRef} />
                </>
            );
        }

        return (
            <LivingGlassProvider>
                <BottomSheetProvider>
                    <View style={{ flex: 1 }}>
                        <GlobalSyncBanner />
                        <MainAppStack />
                        <CustomAlert ref={alertRef} />
                        <AchievementCelebration />
                    </View>
                </BottomSheetProvider>
            </LivingGlassProvider>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            {renderContent()}
            {showBrandedSplash && (
                <BrandedSplashScreen
                    isReady={!isBootstrapping}
                    isNewUser={!onboardingComplete}
                    onFinish={() => setShowBrandedSplash(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        position: "absolute",
        left: 24,
        right: 24,
        height: TAB_BAR_HEIGHT,
        backgroundColor: colors.surface,
        borderRadius: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...elevation.modal,
    },
    tabItem: {
        width: 44,
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
    },
    tabSlot: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    tabSlotActive: {
        backgroundColor: colors.primary,
        ...elevation.cardElevated,
    },
    tabSlotHighlighted: {
        borderWidth: 2,
        borderColor: colors.primary,
        ...elevation.floating,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.canvas,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: colors.textSecondary,
    },
});