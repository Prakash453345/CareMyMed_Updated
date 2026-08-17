import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Package, X, Check, AlertCircle, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePatientStore } from '../../store/usePatientStore';
import {
  derivePrescriptionModel as engineDerivePrescriptionModel,
  calculateDaysRemaining,
  calculateRefillPresets,
} from '../../utils/medicationSupplyEngine';

export function derivePrescriptionModel(med) {
  const storeState = typeof usePatientStore?.getState === 'function' ? usePatientStore.getState() : null;
  return engineDerivePrescriptionModel(med, storeState);
}

const calcMonthlyDoseRequirement = (med, months = 1) => {
  if (!med) return Math.round(30 * months);
  const storeState = typeof usePatientStore?.getState === 'function' ? usePatientStore.getState() : null;
  const rx = engineDerivePrescriptionModel(med, storeState);
  if (rx.isPRN) return Math.round(30 * months);
  const presets = calculateRefillPresets(rx.dailyTabletConsumption, [months]);
  return presets[0]?.tablets || Math.round(30 * months);
};

export default function SupplyUpdateModal({ visible, onClose, med, onConfirm }) {
  const storeState = typeof usePatientStore?.getState === 'function' ? usePatientStore.getState() : null;
  const rx = engineDerivePrescriptionModel(med, storeState);

  // Debug logging when modal opens
  useEffect(() => {
    if (visible && med) {
      console.log('SUPPLY DEBUG', {
        selectedMedication: med,
        masterMedication: rx.prescription,
        quantityPerDose: rx.quantityPerDose,
        dosesPerDay: rx.dosesPerDay,
        dailyConsumption: rx.dailyTabletConsumption,
        isPRN: rx.isPRN,
      });
    }
  }, [visible, med, rx]);

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

  const presets = rx.isPRN ? [
    { label: '30 Units', count: 30, desc: `30 ${displayUnit}` },
    { label: '60 Units', count: 60, desc: `60 ${displayUnit}` },
    { label: '90 Units', count: 90, desc: `90 ${displayUnit}` },
  ] : [
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

  const estDaysLeft = rx.isPRN || rx.dailyTabletConsumption <= 0
    ? null
    : calculateDaysRemaining(remainingDoses, rx.dailyTabletConsumption);

  const unitSingular = displayUnit.toLowerCase().replace(/s$/, '');

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
                  {rx.isPRN
                    ? 'As Needed (PRN) • Dosed on symptom occurrence'
                    : estDaysLeft !== null
                    ? `≈ ${estDaysLeft} ${estDaysLeft === 1 ? 'day' : 'days'} estimated supply left`
                    : 'Flexible schedule'}
                </Text>
              </View>
            </View>
          </View>

          {/* Transparent Prescription Breakdown Card */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>💡 Refill Requirement Formula</Text>
            <Text style={styles.breakdownText}>
              {rx.isPRN ? (
                "As Needed (PRN) medication — dosage frequency varies by symptom need."
              ) : (
                `Based on: ${rx.quantityPerDose} ${unitSingular}${rx.quantityPerDose === 1 ? '' : 's'} × ${rx.dosesPerDay} dose${rx.dosesPerDay === 1 ? '' : 's'}/day (${rx.dailyTabletConsumption} ${displayUnit.toLowerCase()}/day)`
              )}
            </Text>
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

          {/* Custom Input */}
          <View style={styles.customContainer}>
            <View style={styles.customHeader}>
              <Text style={styles.sectionLabel}>Or Enter Custom Quantity</Text>
              {isCustom && <Text style={styles.customBadge}>Custom Active</Text>}
            </View>
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepBtn}
                onPress={() => handleAdjustCustom(-5)}
                hitSlop={8}
              >
                <Minus size={18} color="#475569" strokeWidth={2.5} />
              </Pressable>

              <TextInput
                style={[styles.customInput, isCustom && styles.customInputActive]}
                keyboardType="number-pad"
                value={customQty}
                onChangeText={handleCustomChange}
                onFocus={() => setIsCustom(true)}
                selectTextOnFocus
              />

              <Pressable
                style={styles.stepBtn}
                onPress={() => handleAdjustCustom(5)}
                hitSlop={8}
              >
                <Plus size={18} color="#475569" strokeWidth={2.5} />
              </Pressable>

              <Text style={styles.inputUnit}>{displayUnit}</Text>
            </View>
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={14} color="#EF4444" />
              <Text style={styles.errorTxt}>{errorMsg}</Text>
            </View>
          )}

          {/* Action Button */}
          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || selectedQty <= 0}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.submitBtnTxt}>
                  Add {selectedQty} {displayUnit}
                </Text>
              </>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  handlebar: {
    width: 36,
    height: 5,
    borderRadius: 3,
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
    width: 42,
    height: 42,
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
  breakdownCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderColor: '#C7D2FE',
    borderWidth: 1,
    gap: 3,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  breakdownText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3730A3',
    lineHeight: 17,
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
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  chipTitleSelected: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  chipSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipSubSelected: {
    color: '#6366F1',
  },
  customContainer: {
    gap: 8,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  customInputActive: {
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorTxt: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  submitBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
