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

const calcDailyDoseRequirement = (med) => {
  if (!med) return 1;
  if (typeof med.daily_doses_count === 'number' && med.daily_doses_count > 0) {
    return med.daily_doses_count;
  }
  if (med.schedule && typeof med.schedule === 'object') {
    const slots = ['morning', 'afternoon', 'evening', 'night'];
    const activeSlots = slots.filter(s => !!med.schedule[s]).length;
    if (activeSlots > 0) return activeSlots;
  }
  if (typeof med.times_per_day === 'number' && med.times_per_day > 0) {
    return med.times_per_day;
  }
  if (typeof med.frequency === 'number' && med.frequency > 0) {
    return med.frequency;
  }
  if (typeof med.frequency === 'string') {
    const match = med.frequency.match(/(\d+)/);
    if (match && parseInt(match[1], 10) > 0) {
      return parseInt(match[1], 10);
    }
    if (/twice|2x/i.test(med.frequency)) return 2;
    if (/thrice|3x/i.test(med.frequency)) return 3;
  }
  return 1;
};

export default function SupplyUpdateModal({ visible, onClose, med, onConfirm }) {
  const dailyDoses = calcDailyDoseRequirement(med);
  const oneMonthCount = Math.round(30 * dailyDoses);
  const twoMonthsCount = Math.round(60 * dailyDoses);
  const threeMonthsCount = Math.round(90 * dailyDoses);

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
      const defaultQty = Math.round(30 * calcDailyDoseRequirement(med));
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

  const estDaysLeft = Math.max(0, Math.round(remainingDoses / (med?.daily_doses_count || 1)));

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
