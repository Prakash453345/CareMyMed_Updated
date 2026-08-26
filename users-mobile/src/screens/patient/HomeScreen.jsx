import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    StatusBar,
    TouchableOpacity,
    Image,
    Platform,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
    Bell,
    CheckCircle2,
    Clock,
    Heart,
    Activity,
    Sparkles,
    Calendar,
    ChevronRight,
    Package,
    AlertCircle,
    User,
} from 'lucide-react-native';

import { colors, text, layout, TYPOGRAPHY, spacing, radius, RADIUS, elevation, touchTarget, useReduceMotion } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import usePatientStore from '../../store/usePatientStore';
import TabScreenTransition from '../../components/ui/TabScreenTransition';
import AnimatedCard from '../../components/ui/AnimatedCard';
import SectionHeader from '../../components/ui/SectionHeader';
import StatusChip from '../../components/ui/StatusChip';
import ProgressRing from '../../components/ui/ProgressRing';
import {
    RingSkeleton,
    MedRowSkeleton,
    VitalsCardSkeleton,
    ShimmerBlock,
} from '../../components/ui/skeletons';
import SupplyUpdateModal from '../../components/ui/SupplyUpdateModal';
import CelebrationOverlay from '../../components/ui/CelebrationOverlay';
import StreakCompanion from '../../components/ui/StreakCompanion';
import { HapticPatterns } from '../../utils/haptics';

// Daily clinical tips library
const DAILY_TIPS = [
    "💧 Stay hydrated! Drinking 8 glasses of water daily helps maintain healthy blood pressure and joint mobility.",
    "🚶‍♂️ A quick 10-minute walk after meals supports digestion and healthy post-meal glucose levels.",
    "🧂 Mindful sodium: Reducing extra table salt helps protect your cardiovascular system and kidneys.",
    "🥗 Colorful nutrition: Adding vibrant greens and vegetables provides essential fiber and vital antioxidants.",
    "😴 Restful recovery: Aim for 7–8 hours of uninterrupted sleep to support cellular repair and mental clarity.",
    "🫁 Deep breathing: Taking 5 slow, deep breaths activates the parasympathetic system and calms your heart rate.",
    "🍎 Healthy snacking: Choose fresh fruits or unsalted nuts for sustained, steady energy throughout the afternoon.",
];

export default function PatientHomeScreen({ navigation }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { reduceMotion } = useReduceMotion();
    const { user, profile } = useAuth();

    // Patient Store
    const patient = usePatientStore(s => s.patient);
    const vitals = usePatientStore(s => s.vitals);
    const meds = usePatientStore(s => s.dashboardMeds || []);
    const storeLoading = usePatientStore(s => s.loading);
    const fetchDashboard = usePatientStore(s => s.fetchDashboard);
    const optimisticMarkSlotTaken = usePatientStore(s => s.optimisticMarkSlotTaken);
    const updateMedSupply = usePatientStore(s => s.updateMedSupply);

    // Screen State
    const [refreshing, setRefreshing] = useState(false);
    const [supplyModalMed, setSupplyModalMed] = useState(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    // Initial and focus fetch
    useFocusEffect(
        useCallback(() => {
            fetchDashboard(false);
        }, [fetchDashboard])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchDashboard(true);
        } finally {
            setRefreshing(false);
        }
    }, [fetchDashboard]);

    // Name & Greeting Context
    const firstName = useMemo(() => {
        const full = profile?.fullName || user?.user_metadata?.full_name || patient?.full_name || '';
        return full.split(' ')[0] || 'there';
    }, [profile, user, patient]);

    const greetingContext = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Good morning', timeSlot: 'morning' };
        if (hour < 17) return { text: 'Good afternoon', timeSlot: 'afternoon' };
        return { text: 'Good evening', timeSlot: 'evening' };
    }, []);

    const formattedDate = useMemo(() => {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    }, []);

    // Health Score & Completion
    const completionPct = profile?.completion_pct ?? patient?.completion_pct ?? 100;
    const isLowProfileCompletion = completionPct < 50;

    const healthScore = useMemo(() => {
        return patient?.patient_health_state?.score ??
            patient?.health_score?.score ??
            patient?.healthScoreCache ??
            85;
    }, [patient]);

    const healthLabel = useMemo(() => {
        if (healthScore >= 85) return 'Excellent';
        if (healthScore >= 70) return 'Good';
        if (healthScore >= 55) return 'Fair';
        return 'Needs Attention';
    }, [healthScore]);

    const healthVariant = useMemo(() => {
        if (healthScore >= 85) return 'success';
        if (healthScore >= 70) return 'brand';
        if (healthScore >= 55) return 'warning';
        return 'danger';
    }, [healthScore]);

    // Medication Metrics & Actionable List
    const { scheduledMeds, takenCount, allMedsTaken } = useMemo(() => {
        const scheduled = meds.filter(m => m.isActive !== false);
        const taken = scheduled.filter(m => m.taken).length;
        return {
            scheduledMeds: scheduled,
            takenCount: taken,
            allMedsTaken: scheduled.length > 0 && taken === scheduled.length,
        };
    }, [meds]);

    // Handle marking medication taken with celebration trigger
    const handleMarkTaken = useCallback((med) => {
        HapticPatterns.selection();
        const slotKey = med.scheduledTime || med.type || 'morning';
        optimisticMarkSlotTaken(slotKey);

        if (scheduledMeds.length > 0 && takenCount + 1 >= scheduledMeds.length) {
            HapticPatterns.allDone();
            setShowCelebration(true);
        }
    }, [scheduledMeds, takenCount, optimisticMarkSlotTaken]);

    // Daily tip
    const dailyTip = useMemo(() => {
        const dayOfYear = Math.floor(Date.now() / 86400000);
        return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
    }, []);

    const isLoading = storeLoading && meds.length === 0;

    return (
        <TabScreenTransition>
            <View style={styles.screenContainer}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* ── ZONE 1: ORIENTATION ("WHERE AM I?") ───────────────────────────────── */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                <View style={[styles.headerBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Profile')}
                            activeOpacity={0.8}
                            hitSlop={touchTarget.hitSlop}
                            style={styles.avatarWrapper}
                        >
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <User size={20} color={colors.primary} />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.greetingCol}>
                            <Text style={styles.greetingText}>
                                {greetingContext.text}, <Text style={styles.greetingName}>{firstName} 👋</Text>
                            </Text>
                            <View style={styles.dateRow}>
                                <Calendar size={12} color={text.muted} style={{ marginRight: 4 }} />
                                <Text style={styles.dateText}>{formattedDate}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                        activeOpacity={0.75}
                        hitSlop={touchTarget.hitSlop}
                        style={styles.notificationButton}
                    >
                        <Bell size={20} color={text.primary} strokeWidth={2.0} />
                        {unreadNotifications > 0 && <View style={styles.notificationBadge} />}
                    </TouchableOpacity>
                </View>

                {/* Main Scroll Content */}
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + layout.TAB_BAR_HEIGHT + 32 }
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    {/* ── ZONE 2: HEALTH STATE ("HOW AM I?") ───────────────────────────── */}
                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    <View style={styles.zoneWrapper}>
                        {isLoading ? (
                            <AnimatedCard style={styles.heroCard}>
                                <View style={styles.heroLoadingRow}>
                                    <RingSkeleton size={88} strokeWidth={8} />
                                    <View style={styles.heroLoadingText}>
                                        <ShimmerBlock width={140} height={20} borderRadius={6} />
                                        <ShimmerBlock width={190} height={14} borderRadius={4} style={{ marginTop: 8 }} />
                                    </View>
                                </View>
                            </AnimatedCard>
                        ) : isLowProfileCompletion ? (
                            /* Elderly-Friendly Setup Journey Card (No Hollow Clinical Rings) */
                            <AnimatedCard
                                onPress={() => navigation.navigate('Profile')}
                                style={styles.heroCard}
                            >
                                <View style={styles.setupCardContent}>
                                    <View style={styles.setupHeader}>
                                        <View style={styles.setupIconBox}>
                                            <Sparkles size={22} color={colors.primary} />
                                        </View>
                                        <View style={styles.setupTitleCol}>
                                            <Text style={styles.setupTitle}>Getting Started</Text>
                                            <Text style={styles.setupSubtitle}>Setting up your care profile: Step 2 of 4</Text>
                                        </View>
                                    </View>

                                    <View style={styles.setupProgressTrack}>
                                        <View style={[styles.setupProgressFill, { width: `${Math.max(25, completionPct)}%` }]} />
                                    </View>

                                    <View style={styles.setupActionRow}>
                                        <Text style={styles.setupHelpText}>Complete profile for personalized daily insights</Text>
                                        <View style={styles.setupButton}>
                                            <Text style={styles.setupButtonText}>Complete Setup</Text>
                                            <ChevronRight size={14} color="#FFFFFF" />
                                        </View>
                                    </View>
                                </View>
                            </AnimatedCard>
                        ) : (
                            /* Verified Health State Hero Signature */
                            <AnimatedCard
                                onPress={() => navigation.navigate('HealthProfile')}
                                style={styles.heroCard}
                            >
                                <View style={styles.heroContentRow}>
                                    <ProgressRing
                                        size={88}
                                        strokeWidth={8}
                                        progress={healthScore}
                                        ringColors={[colors.primary, colors.accent]}
                                    >
                                        <Text style={styles.heroScoreNumber}>{healthScore}</Text>
                                    </ProgressRing>

                                    <View style={styles.heroDetailsCol}>
                                        <View style={styles.heroBadgeRow}>
                                            <StatusChip
                                                label={healthLabel}
                                                variant={healthVariant}
                                                size="sm"
                                            />
                                            <Text style={styles.heroEyebrow}>Health Today</Text>
                                        </View>

                                        <Text style={styles.heroSummaryText}>
                                            {allMedsTaken
                                                ? 'All medications logged for today. Stable routine.'
                                                : scheduledMeds.length > 0
                                                    ? `${scheduledMeds.length - takenCount} medication${scheduledMeds.length - takenCount !== 1 ? 's' : ''} scheduled today.`
                                                    : 'Baseline indicators active. No current prescriptions.'}
                                        </Text>
                                    </View>
                                </View>
                            </AnimatedCard>
                        )}
                    </View>

                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    {/* ── ZONE 3: ACTION ("WHAT DO I NEED TO DO?") ──────────────────────── */}
                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    <View style={styles.zoneWrapper}>
                        <SectionHeader
                            title="Today's Medications"
                            subtitle={
                                scheduledMeds.length === 0
                                    ? 'No medications scheduled today'
                                    : allMedsTaken
                                        ? 'All done for today! 🎉'
                                        : `${takenCount} of ${scheduledMeds.length} taken today`
                            }
                            actionText={scheduledMeds.length > 0 ? 'See all' : undefined}
                            onAction={() => navigation.navigate('Medications')}
                        />

                        {isLoading ? (
                            <AnimatedCard style={{ padding: spacing.md }}>
                                <MedRowSkeleton count={2} />
                            </AnimatedCard>
                        ) : scheduledMeds.length === 0 ? (
                            <AnimatedCard style={styles.emptyActionCard}>
                                <View style={styles.emptyIconCircle}>
                                    <CheckCircle2 size={24} color={colors.success} />
                                </View>
                                <Text style={styles.emptyActionTitle}>No Prescriptions Today</Text>
                                <Text style={styles.emptyActionSubtitle}>
                                    You have no active medications requiring logging today.
                                </Text>
                            </AnimatedCard>
                        ) : (
                            <AnimatedCard style={styles.medsContainerCard}>
                                {scheduledMeds.map((med, index) => {
                                    const isLowSupply = med.supply_remaining != null && med.supply_remaining <= 5;
                                    const isDone = !!med.taken;

                                    return (
                                        <View key={med._id || index}>
                                            <View style={styles.medRow}>
                                                {/* Left Status / Check Toggle */}
                                                <TouchableOpacity
                                                    onPress={() => handleMarkTaken(med)}
                                                    hitSlop={touchTarget.hitSlop}
                                                    activeOpacity={0.7}
                                                    style={[
                                                        styles.medCheckButton,
                                                        isDone && styles.medCheckButtonDone
                                                    ]}
                                                >
                                                    {isDone ? (
                                                        <CheckCircle2 size={22} color={colors.success} />
                                                    ) : (
                                                        <View style={styles.medUncheckedRing} />
                                                    )}
                                                </TouchableOpacity>

                                                {/* Content */}
                                                <View style={styles.medInfoCol}>
                                                    <Text
                                                        style={[
                                                            styles.medNameText,
                                                            isDone && styles.medTextCrossed
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {med.name || 'Medication'}
                                                    </Text>
                                                    <View style={styles.medMetaRow}>
                                                        <Clock size={11} color={text.muted} style={{ marginRight: 3 }} />
                                                        <Text style={styles.medMetaText}>
                                                            {med.scheduledTime || med.type || 'Scheduled'}
                                                        </Text>
                                                        {med.dosage ? (
                                                            <Text style={styles.medMetaText}> • {med.dosage}</Text>
                                                        ) : null}
                                                    </View>
                                                </View>

                                                {/* Supply Pill Badge */}
                                                {med.supply_remaining != null && (
                                                    <TouchableOpacity
                                                        onPress={() => setSupplyModalMed(med)}
                                                        hitSlop={touchTarget.hitSlop}
                                                        activeOpacity={0.7}
                                                        style={[
                                                            styles.supplyChip,
                                                            isLowSupply && styles.supplyChipLow
                                                        ]}
                                                    >
                                                        {isLowSupply ? (
                                                            <AlertCircle size={11} color={colors.danger} style={{ marginRight: 3 }} />
                                                        ) : (
                                                            <Package size={11} color={text.secondary} style={{ marginRight: 3 }} />
                                                        )}
                                                        <Text style={[styles.supplyText, isLowSupply && styles.supplyTextLow]}>
                                                            {med.supply_remaining} left
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {index < scheduledMeds.length - 1 && <View style={styles.rowDivider} />}
                                        </View>
                                    );
                                })}
                            </AnimatedCard>
                        )}
                    </View>

                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    {/* ── ZONE 4: UNDERSTANDING ("WHAT HAVE I LEARNED?") ────────────────── */}
                    {/* ═════════════════════════════════════════════════════════════════════ */}
                    
                    {/* 4.1 Whole-Health Streak Calendar */}
                    <View style={styles.zoneWrapper}>
                        <SectionHeader
                            title="35-Day Health Streak"
                            subtitle="Daily adherence and telemetry consistency"
                            actionText="Details"
                            onAction={() => navigation.navigate('Adherence')}
                        />
                        <AnimatedCard style={{ padding: spacing.md }}>
                            <StreakCompanion compact />
                        </AnimatedCard>
                    </View>

                    {/* 4.2 Vitals Telemetry Card (Honest Empty State — Zero Deceptive Placeholders) */}
                    <View style={styles.zoneWrapper}>
                        <SectionHeader
                            title="Latest Vitals"
                            subtitle="Heart rate and blood pressure"
                            actionText="History"
                            onAction={() => navigation.navigate('VitalsHistory')}
                        />

                        {isLoading ? (
                            <AnimatedCard style={{ padding: spacing.md }}>
                                <VitalsCardSkeleton />
                            </AnimatedCard>
                        ) : (
                            <AnimatedCard
                                onPress={() => navigation.navigate('VitalsHistory')}
                                style={{ padding: spacing.md }}
                            >
                                <View style={styles.vitalsGrid}>
                                    {/* Heart Rate Box */}
                                    <View style={styles.vitalBox}>
                                        <View style={styles.vitalBoxHeader}>
                                            <Heart size={16} color={colors.danger} />
                                            <Text style={styles.vitalBoxLabel}>Heart Rate</Text>
                                        </View>
                                        <View style={styles.vitalValueRow}>
                                            <Text style={styles.vitalNumber}>
                                                {vitals?.heart_rate ? vitals.heart_rate : '—'}
                                            </Text>
                                            <Text style={styles.vitalUnit}>
                                                {vitals?.heart_rate ? 'bpm' : 'Not recorded'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Blood Pressure Box */}
                                    <View style={styles.vitalBox}>
                                        <View style={styles.vitalBoxHeader}>
                                            <Activity size={16} color={colors.primary} />
                                            <Text style={styles.vitalBoxLabel}>Blood Pressure</Text>
                                        </View>
                                        <View style={styles.vitalValueRow}>
                                            <Text style={styles.vitalNumber}>
                                                {vitals?.blood_pressure?.systolic && vitals?.blood_pressure?.diastolic
                                                    ? `${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic}`
                                                    : '—'}
                                            </Text>
                                            <Text style={styles.vitalUnit}>
                                                {vitals?.blood_pressure?.systolic ? 'mmHg' : 'Not recorded'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </AnimatedCard>
                        )}
                    </View>

                    {/* 4.3 Daily Clinical Health Tip */}
                    <View style={styles.zoneWrapper}>
                        <AnimatedCard
                            onPress={() => navigation.navigate('HealthCopilot')}
                            style={styles.tipCard}
                        >
                            <View style={styles.tipRow}>
                                <View style={styles.tipIconBox}>
                                    <Sparkles size={18} color={colors.primary} />
                                </View>
                                <View style={styles.tipContentCol}>
                                    <Text style={styles.tipHeaderTitle}>Daily Health Tip</Text>
                                    <Text style={styles.tipBodyText}>{dailyTip}</Text>
                                </View>
                            </View>
                        </AnimatedCard>
                    </View>
                </ScrollView>

                {/* Modals & Overlays */}
                {supplyModalMed && (
                    <SupplyUpdateModal
                        visible={!!supplyModalMed}
                        medicine={supplyModalMed}
                        onClose={() => setSupplyModalMed(null)}
                        onSave={async (medId, newCount) => {
                            await updateMedSupply(medId, newCount);
                            setSupplyModalMed(null);
                        }}
                    />
                )}

                {showCelebration && (
                    <CelebrationOverlay
                        visible={showCelebration}
                        onDismiss={() => setShowCelebration(false)}
                    />
                )}
            </View>
        </TabScreenTransition>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: colors.canvas, // Canonical warm canvas #FAFAF9
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.screen,
        paddingBottom: spacing.md,
        backgroundColor: colors.canvas,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.pill,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        marginRight: spacing.md,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: RADIUS.pill,
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primarySoft,
    },
    greetingCol: {
        justifyContent: 'center',
    },
    greetingText: {
        ...TYPOGRAPHY.body,
        color: text.secondary,
    },
    greetingName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: text.primary,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dateText: {
        ...TYPOGRAPHY.caption,
        color: text.muted,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.pill,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...elevation.card,
    },
    notificationBadge: {
        position: 'absolute',
        top: 10,
        right: 11,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.danger,
    },
    scrollContent: {
        paddingHorizontal: spacing.screen,
        paddingTop: spacing.xs,
    },
    zoneWrapper: {
        marginBottom: spacing.xl,
    },

    // Zone 2 Hero Styles
    heroCard: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...elevation.cardElevated,
    },
    heroContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroScoreNumber: {
        fontFamily: 'Inter_800ExtraBold',
        fontSize: 28,
        color: text.primary,
        letterSpacing: -0.5,
    },
    heroDetailsCol: {
        flex: 1,
        marginLeft: spacing.lg,
        justifyContent: 'center',
    },
    heroBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs + 2,
    },
    heroEyebrow: {
        ...TYPOGRAPHY.chip,
        color: text.muted,
        fontSize: 12,
    },
    heroSummaryText: {
        ...TYPOGRAPHY.small,
        color: text.secondary,
        lineHeight: 20,
    },
    heroLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroLoadingText: {
        flex: 1,
        marginLeft: spacing.lg,
    },

    // Low Profile Setup Card
    setupCardContent: {
        width: '100%',
    },
    setupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    setupIconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    setupTitleCol: {
        flex: 1,
    },
    setupTitle: {
        ...TYPOGRAPHY.h3,
        color: text.primary,
    },
    setupSubtitle: {
        ...TYPOGRAPHY.caption,
        color: text.secondary,
        marginTop: 2,
    },
    setupProgressTrack: {
        height: 6,
        backgroundColor: colors.surfaceMuted,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    setupProgressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    setupActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    setupHelpText: {
        ...TYPOGRAPHY.caption,
        color: text.muted,
        flex: 1,
        marginRight: spacing.sm,
    },
    setupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.button,
    },
    setupButtonText: {
        ...TYPOGRAPHY.caption,
        color: text.inverse,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginRight: 2,
    },

    // Zone 3 Medication Action Styles
    medsContainerCard: {
        padding: spacing.md,
    },
    medRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    medCheckButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    medCheckButtonDone: {
        opacity: 0.85,
    },
    medUncheckedRing: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: text.muted,
    },
    medInfoCol: {
        flex: 1,
        marginRight: spacing.sm,
    },
    medNameText: {
        ...TYPOGRAPHY.bodyMedium,
        color: text.primary,
    },
    medTextCrossed: {
        textDecorationLine: 'line-through',
        color: text.muted,
    },
    medMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    medMetaText: {
        ...TYPOGRAPHY.caption,
        color: text.muted,
    },
    supplyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    supplyChipLow: {
        backgroundColor: colors.dangerLight,
        borderColor: 'transparent',
    },
    supplyText: {
        ...TYPOGRAPHY.caption,
        fontSize: 11,
        color: text.secondary,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    supplyTextLow: {
        color: colors.danger,
    },
    rowDivider: {
        height: 1,
        backgroundColor: colors.divider,
        marginVertical: 2,
    },
    emptyActionCard: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.successLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    emptyActionTitle: {
        ...TYPOGRAPHY.title,
        color: text.primary,
        marginBottom: 4,
    },
    emptyActionSubtitle: {
        ...TYPOGRAPHY.small,
        color: text.muted,
        textAlign: 'center',
    },

    // Zone 4 Vitals Grid Styles
    vitalsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    vitalBox: {
        flex: 1,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: radius.sheet,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    vitalBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.sm,
    },
    vitalBoxLabel: {
        ...TYPOGRAPHY.caption,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        color: text.secondary,
    },
    vitalValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    vitalNumber: {
        fontFamily: 'Inter_700Bold',
        fontSize: 22,
        color: text.primary,
        marginRight: 4,
    },
    vitalUnit: {
        ...TYPOGRAPHY.caption,
        color: text.muted,
        fontSize: 11,
    },

    // Health Tip Card Styles
    tipCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    tipIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    tipContentCol: {
        flex: 1,
    },
    tipHeaderTitle: {
        ...TYPOGRAPHY.caption,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: colors.primary,
        marginBottom: 2,
    },
    tipBodyText: {
        ...TYPOGRAPHY.small,
        color: text.secondary,
        lineHeight: 20,
    },
});
