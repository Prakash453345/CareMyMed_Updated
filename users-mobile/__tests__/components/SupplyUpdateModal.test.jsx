import React from 'react';
import { render } from '@testing-library/react-native';
import SupplyUpdateModal, { derivePrescriptionModel } from '../../src/components/ui/SupplyUpdateModal';

// Mock translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue || k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// Mock haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
}));

// Mock Zustand store
jest.mock('../../src/store/usePatientStore', () => {
  const storeState = {
    patient: {
      medications: [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          times: ['08:00', '20:00'],
          refillInfo: { totalDoses: 50, remainingDoses: 50, alertThreshold: 5 },
        },
      ],
    },
    medicationSchedule: {
      morning: [{ name: 'Metformin', time: '08:00' }],
      night: [{ name: 'Metformin', time: '20:00' }],
    },
  };

  const usePatientStoreMock = (selector) => (selector ? selector(storeState) : storeState);
  usePatientStoreMock.getState = () => storeState;
  return { usePatientStore: usePatientStoreMock };
});

describe('Normalized Prescription Model & Refill Calculation', () => {
  it('correctly calculates daily consumption for 1 tablet twice daily (2 tablets/day)', () => {
    const medItem = { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', refillInfo: { remainingDoses: 50 } };
    const rx = derivePrescriptionModel(medItem);

    expect(rx.quantityPerDose).toBe(1);
    expect(rx.dosesPerDay).toBe(2);
    expect(rx.dailyTabletConsumption).toBe(2);
    expect(rx.isPRN).toBe(false);

    const { getByText } = render(
      <SupplyUpdateModal visible={true} onClose={() => {}} med={medItem} onConfirm={jest.fn()} />
    );

    expect(getByText('≈ 60 Tablets')).toBeTruthy();
    expect(getByText('≈ 25 days estimated supply left')).toBeTruthy();
    expect(getByText('Based on: 1 tablet × 2 doses/day (2 tablets/day)')).toBeTruthy();
  });

  it('correctly multiplies quantityPerDose * dosesPerDay for 2 tablets twice daily (4 tablets/day)', () => {
    const medItem = { name: 'Metformin 1000mg', dosage: '2 tablets', frequency: 'Twice daily', refillInfo: { remainingDoses: 50 } };
    const rx = derivePrescriptionModel(medItem);

    expect(rx.quantityPerDose).toBe(2);
    expect(rx.dosesPerDay).toBe(2);
    expect(rx.dailyTabletConsumption).toBe(4);

    const { getByText } = render(
      <SupplyUpdateModal visible={true} onClose={() => {}} med={medItem} onConfirm={jest.fn()} />
    );

    // 1 Month = 30 days * 4 tablets/day = 120 tablets
    expect(getByText('≈ 120 Tablets')).toBeTruthy();
    // 50 tablets / 4 tablets/day = 12.5 -> 13 days
    expect(getByText('≈ 13 days estimated supply left')).toBeTruthy();
    expect(getByText('Based on: 2 tablets × 2 doses/day (4 tablets/day)')).toBeTruthy();
  });

  it('handles SOS / PRN medications safely without fake estimated days supply', () => {
    const medItem = { name: 'Paracetamol', dosage: '500mg', frequency: 'SOS as needed', refillInfo: { remainingDoses: 50 } };
    const rx = derivePrescriptionModel(medItem);

    expect(rx.isPRN).toBe(true);
    expect(rx.dailyTabletConsumption).toBe(0);

    const { getByText } = render(
      <SupplyUpdateModal visible={true} onClose={() => {}} med={medItem} onConfirm={jest.fn()} />
    );

    expect(getByText('As Needed (PRN) • Dosed on symptom occurrence')).toBeTruthy();
    expect(getByText('As Needed (PRN) medication — dosage frequency varies by symptom need.')).toBeTruthy();
  });

  it('parses Indian 1-0-1 notation accurately', () => {
    const medItem = { name: 'Pantoprazole', dosage: '40mg', frequency: '1-0-1', refillInfo: { remainingDoses: 30 } };
    const rx = derivePrescriptionModel(medItem);

    expect(rx.dosesPerDay).toBe(2);
    expect(rx.quantityPerDose).toBe(1);
    expect(rx.dailyTabletConsumption).toBe(2);
  });
});
