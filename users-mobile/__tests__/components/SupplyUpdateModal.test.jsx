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

// Mock Zustand store with realistic master patient medications and slot data
jest.mock('../../src/store/usePatientStore', () => {
  const storeState = {
    patient: {
      medications: [
        {
          _id: 'met_1',
          name: 'Metformin 500mg',
          dosage: '500mg',
          times: ['morning', 'night'],
          refillInfo: { totalDoses: 49, remainingDoses: 49, alertThreshold: 5 },
        },
      ],
    },
    dashboardMeds: [
      { id: 'met_morning', name: 'Metformin', type: 'morning', scheduled_time: 'morning' },
      { id: 'met_night', name: 'Metformin', type: 'night', scheduled_time: 'night' },
    ],
    medicationSchedule: {
      morning: [{ name: 'Metformin', time: '08:00' }],
      night: [{ name: 'Metformin', time: '20:00' }],
    },
  };

  const usePatientStoreMock = (selector) => (selector ? selector(storeState) : storeState);
  usePatientStoreMock.getState = () => storeState;
  return { usePatientStore: usePatientStoreMock };
});

describe('SupplyUpdateModal Integration with Supply Engine', () => {
  it('correctly calculates 24.5 days supply left and 60 tablets/month for Metformin 2x/day', () => {
    const medSlotItem = { _id: 'met_1', name: 'Metformin', dosage: '500mg', refillInfo: { remainingDoses: 49 } };
    const rx = derivePrescriptionModel(medSlotItem);

    expect(rx.quantityPerDose).toBe(1);
    expect(rx.dosesPerDay).toBe(2);
    expect(rx.dailyTabletConsumption).toBe(2);

    const { getByText } = render(
      <SupplyUpdateModal visible={true} onClose={() => {}} med={medSlotItem} onConfirm={jest.fn()} />
    );

    // Presets based on 2 tablets/day
    expect(getByText('≈ 60 Tablets')).toBeTruthy();
    expect(getByText('≈ 120 Tablets')).toBeTruthy();
    expect(getByText('≈ 180 Tablets')).toBeTruthy();

    // 49 Tablets remaining / 2 = 24.5 days estimated supply left (24 full days + 1 dose)
    expect(getByText('≈ 24.5 days estimated supply left (24 full days + 1 dose)')).toBeTruthy();
    expect(getByText('Based on: 1 tablet × 2 doses/day (2 tablets/day)')).toBeTruthy();
  });

  it('handles PRN medications safely in modal', () => {
    const prnItem = { name: 'Paracetamol', frequency: 'SOS as needed', refillInfo: { remainingDoses: 30 } };
    const { getByText } = render(
      <SupplyUpdateModal visible={true} onClose={() => {}} med={prnItem} onConfirm={jest.fn()} />
    );

    expect(getByText('As Needed (PRN) • Dosed on symptom occurrence')).toBeTruthy();
    expect(getByText('As Needed (PRN) medication — dosage frequency varies by symptom need.')).toBeTruthy();
  });
});
