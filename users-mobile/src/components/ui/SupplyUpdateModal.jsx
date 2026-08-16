import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Package, X, Check, AlertCircle, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePatientStore } from '../../store/usePatientStore';

const calcMonthlyDoseRequirement = (med, months = 1) => {
  if (!med) return Math.round(30 * months);

  const medNameLower = (med.name || '').trim().toLowerCase();
  let dailyDoses = 1;
  let fullMedObj = null;

  // 1. Fetch patient medications from global Zustand store to get true daily schedule
  try {
    const storeState = usePatientStore.getState ? usePatientStore.getState() : null;
    const allPatientMeds = storeState?.patient?.medications || 
                           storeState?.patientData?.medications || 
                           storeState?.medications || [];

    if (Array.isArray(allPatientMeds) && medNameLower) {
      fullMedObj = allPatientMeds.find(
        m => m.name && m.name.trim().toLowerCase() === medNameLower
      );
    }

    // Inspect schedule slots in Zustand store (morning, afternoon, evening, night)
    const schedule = storeState?.medicationSchedule;
    if (schedule && medNameLower) {
      let slotCount = 0;
      Object.values(schedule).forEach((slotMeds) => {
        if (Array.isArray(slotMeds)) {
          slotMeds.forEach((item) => {
            if (item.name && item.name.trim().toLowerCase() === medNameLower) {
              slotCount++;
            }
          });
        }
      });
      if (slotCount > 0) {
        dailyDoses = Math.max(dailyDoses, slotCount);
      }
    }

    // Inspect todayMeds or dashboardMeds list in store
    const todayList = storeState?.todayMeds || storeState?.dashboardMeds || [];
    if (Array.isArray(todayList) && medNameLower) {
      const matchingTodayCount = todayList.filter(
        item => item.name && item.name.trim().toLowerCase() === medNameLower
      ).length;
      if (matchingTodayCount > 0) {
        dailyDoses = Math.max(dailyDoses, matchingTodayCount);
      }
    }
  } catch (e) {}

  // Combine properties from med and fullMedObj
  const targetMed = fullMedObj ? { ...fullMedObj, ...med } : med;

  const freqStr = (typeof targetMed.frequency === 'string' ? targetMed.frequency : '') || 
                  (typeof targetMed.frequency_type === 'string' ? targetMed.frequency_type : '') ||
                  (typeof targetMed.instructions === 'string' ? targetMed.instructions : '') ||
                  (typeof med.frequency === 'string' ? med.frequency : '') ||
                  (typeof med.instructions === 'string' ? med.instructions : '');
  const lowerFreq = freqStr.toLowerCase();

  // Check weekly / alternate day / monthly overrides
  if (/once\s*a\s*week|weekly|1\/week|every\s*week|once\s*weekly/i.test(lowerFreq)) {
    return Math.max(1, Math.round(4 * months));
  }
  if (/twice\s*a\s*week|2x\/week|2\s*times\s*a\s*week/i.test(lowerFreq)) {
    return Math.max(1, Math.round(8 * months));
  }
  if (/twice\s*a\s*month|2x\/month|every\s*2\s*weeks|biweekly|2\s*times\s*a\s*month/i.test(lowerFreq)) {
    return Math.max(1, Math.round(2 * months));
  }
  if (/once\s*a\s*month|monthly|1\/month/i.test(lowerFreq)) {
    return Math.max(1, Math.round(1 * months));
  }
  if (/alternate\s*day/i.test(lowerFreq)) {
    return Math.max(1, Math.round(15 * months));
  }
  const everyXDaysMatch = lowerFreq.match(/every\s*(\d+)\s*days?/i);
  if (everyXDaysMatch && parseInt(everyXDaysMatch[1], 10) > 0) {
    const daysInterval = parseInt(everyXDaysMatch[1], 10);
    return Math.max(1, Math.round((30 / daysInterval) * months));
  }

  // Evaluate explicit array lengths & counts across targetMed & fullMedObj
  const timesArr = (Array.isArray(targetMed.times) && targetMed.times.length > 0) ? targetMed.times :
                   (Array.isArray(fullMedObj?.times) && fullMedObj.times.length > 0) ? fullMedObj.times : [];
  if (timesArr.length > 0) {
    dailyDoses = Math.max(dailyDoses, timesArr.length);
  }

  const scheduledTimesArr = (Array.isArray(targetMed.scheduledTimes) && targetMed.scheduledTimes.length > 0) ? targetMed.scheduledTimes :
                            (Array.isArray(targetMed.scheduled_times) && targetMed.scheduled_times.length > 0) ? targetMed.scheduled_times :
                            (Array.isArray(fullMedObj?.scheduledTimes) && fullMedObj.scheduledTimes.length > 0) ? fullMedObj.scheduledTimes : [];
  if (scheduledTimesArr.length > 0) {
    dailyDoses = Math.max(dailyDoses, scheduledTimesArr.length);
  }

  if (typeof targetMed.daily_doses_count === 'number' && targetMed.daily_doses_count > 0) {
    dailyDoses = Math.max(dailyDoses, targetMed.daily_doses_count);
  }
  if (typeof targetMed.times_per_day === 'number' && targetMed.times_per_day > 0) {
    dailyDoses = Math.max(dailyDoses, targetMed.times_per_day);
  }
  if (typeof targetMed.times_count === 'number' && targetMed.times_count > 0) {
    dailyDoses = Math.max(dailyDoses, targetMed.times_count);
  }
  if (targetMed.schedule && typeof targetMed.schedule === 'object') {
    const activeSlots = ['morning', 'afternoon', 'evening', 'night'].filter(s => !!targetMed.schedule[s]).length;
    if (activeSlots > 0) dailyDoses = Math.max(dailyDoses, activeSlots);
  }
  if (typeof targetMed.frequency === 'number' && targetMed.frequency > 0) {
    dailyDoses = Math.max(dailyDoses, targetMed.frequency);
  }

  // Regex matches on lowerFreq
  if (/twice|2x|2\/day|2\s*times|bid|b\.i\.d|two\s*times|2\s*doses|two\s*tablets|twice\s*daily/i.test(lowerFreq)) {
    dailyDoses = Math.max(dailyDoses, 2);
  } else if (/thrice|3x|3\/day|3\s*times|tid|t\.i\.d|three\s*times|3\s*doses|three\s*tablets|three\s*daily/i.test(lowerFreq)) {
    dailyDoses = Math.max(dailyDoses, 3);
  } else if (/4x|4\/day|4\s*times|qid|q\.i\.d|four\s*times|4\s*doses/i.test(lowerFreq)) {
    dailyDoses = Math.max(dailyDoses, 4);
  } else {
    const numMatch = lowerFreq.match(/(\d+)\s*(?:times|doses|tablets|pills|\/day|per\s*day)/i);
    if (numMatch && parseInt(numMatch[1], 10) > 0) {
      dailyDoses = Math.max(dailyDoses, parseInt(numMatch[1], 10));
    }
  }

  return Math.max(1, Math.round(30 * dailyDoses * months));
};

export default function SupplyUpdateModal({ visible, onClose, med, onConfirm }) {
  const oneMonthCount = calcMonthlyDoseRequirement(med, 1);
  const twoMonthsCount = calcMonthlyDoseRequirement(med, 2);
  const threeMonthsCount = calcMonthlyDoseRequirement(med, 3);

  const [selectedQty, setSelectedQty] = useState(oneMonthCount);
  const [customQty, setCustomQty] = useState(String(oneMonthCount));
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const displayUnit = med?.unit || med?.dosage_form || 'Tablets';
  const remainingDoses = med?.refillInfo?.remainingDoses ?? med?.refillInfo?.totalDoses ?? 0;
  const isLowSupply = remainingDoses <= (med?.refillInfo?.alertThreshold || 5);

  useEffect(() => {
    if (visible && med) {
      const defaultQty = calcMonthlyDoseRequirement(med, 1);
      setSelectedQty(defaultQty);
      setCustomQty(String(defaultQty));
      setIsCustom(false);
      setIsSubmitting(false);
      setErrorMsg(null);
    }
  }, [visible, med]);

  if (!med) return null;

  const presets = [
    { label: '1 Month', count: oneMonthCount, desc: `≈ ${oneMonthCount} ${displayUnit}` },
    { label: '2 Months', count: twoMonthsCount, desc: `≈ ${twoMonthsCount} ${displayUnit}` },
    { label: '3 Months', count: threeMonthsCount, desc: `≈ ${threeMonthsCount} ${displayUnit}` },
  ];

  const handleSelectPreset = (count) => {
    try { Haptics.selectionAsync(); } catch (e) {}
    setIsCustom(false);
    setSelectedQty(count);
  };

  const handleCustomChange = (text) => {
    setCustomQty(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedQty(parsed);
    }
  };

  const handleAdjustCustom = (diff) => {
    try { Haptics.selectionAsync(); } catch (e) {}
    setIsCustom(true);
    const curr = parseInt(customQty, 10) || 30;
    const next = Math.max(1, curr + diff);
    setCustomQty(String(next));
    setSelectedQty(next);
  };

  const handleSubmit = async () => {
    if (selectedQty <= 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
      await onConfirm(med, selectedQty);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err?.response?.data?.error || err?.message || 'Could not update supply. Please check your connection.');
    }
  };

  const monthlyRate = oneMonthCount / 30;
  const estDaysLeft = Math.max(0, Math.round(remainingDoses / (monthlyRate || 1)));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Handlebar */}
          <View style={styles.handlebar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Package size={22} color="#6366F1" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Update Supply</Text>
                <Text style={styles.medSubTitle}>{med.name} • {med.dosage || 'Dose'}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Current Stock Banner */}
          <View style={[styles.stockBanner, isLowSupply && styles.stockBannerLow]}>
            <View style={styles.stockBannerLeft}>
              {isLowSupply ? (
                <AlertCircle size={16} color="#EF4444" strokeWidth={2.5} />
              ) : (
                <Package size={16} color="#6366F1" strokeWidth={2.5} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.stockTitle, isLowSupply && { color: '#EF4444' }]}>
                  {remainingDoses} {displayUnit} remaining
                </Text>
                <Text style={styles.stockSub}>
                  ≈ {estDaysLeft} {estDaysLeft === 1 ? 'day' : 'days'} estimated supply left
                </Text>
              </View>
            </View>
          </View>

          {/* Presets */}
          <Text style={styles.sectionLabel}>Select Supply Added</Text>
          <View style={styles.presetRow}>
            {presets.map((p) => {
              const isSelected = !isCustom && selectedQty === p.count;
              return (
                <Pressable
                  key={p.count}
                  onPress={() => handleSelectPreset(p.count)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipTitle, isSelected && styles.chipTitleSelected]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.chipSub, isSelected && styles.chipSubSelected]}>
                    {p.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom Stepper */}
          <View style={styles.customContainer}>
            <Text style={styles.customLabel}>Custom Quantity</Text>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => handleAdjustCustom(-5)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <Minus size={18} color="#475569" strokeWidth={2.5} />
              </Pressable>
              <TextInput
                style={styles.stepperInput}
                keyboardType="number-pad"
                value={isCustom ? customQty : String(selectedQty)}
                onChangeText={(txt) => {
                  setIsCustom(true);
                  handleCustomChange(txt);
                }}
                maxLength={4}
              />
              <Pressable
                onPress={() => handleAdjustCustom(5)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <Plus size={18} color="#475569" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.stepperUnit}>{displayUnit}</Text>
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={14} color="#EF4444" />
              <Text style={styles.errorTxt}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Confirm Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContentRow}>
                <Check size={18} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.confirmBtnText}>
                  Confirm +{selectedQty} {displayUnit}
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  handlebar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  medSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stockBannerLow: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  stockBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  stockSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  chipTitleSelected: {
    color: '#4F46E5',
  },
  chipSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  chipSubSelected: {
    color: '#6366F1',
  },
  customContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 64,
    textAlign: 'center',
  },
  stepperUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
  },
  errorTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
