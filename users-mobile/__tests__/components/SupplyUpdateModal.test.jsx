import React from 'react';
import { render } from '@testing-library/react-native';
import SupplyUpdateModal from '../../src/components/ui/SupplyUpdateModal';
import { usePatientStore } from '../../src/store/usePatientStore';

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

describe('SupplyUpdateModal Multi-Dose Calculation', () => {
  it('calculates 60 tablets per month and 25 days estimated supply left for Metformin (2x/day)', () => {
    const medSlotItem = { name: 'Metformin', dosage: '500mg', refillInfo: { remainingDoses: 50 } };
    const { getByText } = render(
      <SupplyUpdateModal visible={true} onClose={() => {}} med={medSlotItem} onConfirm={jest.fn()} />
    );

    // 1 Month preset should show 60 tablets (30 days * 2 doses/day)
    expect(getByText('≈ 60 Tablets')).toBeTruthy();

    // 2 Months preset should show 120 tablets (60 days * 2 doses/day)
    expect(getByText('≈ 120 Tablets')).toBeTruthy();

    // 3 Months preset should show 180 tablets (90 days * 2 doses/day)
    expect(getByText('≈ 180 Tablets')).toBeTruthy();

    // Current stock banner: 50 Tablets remaining ≈ 25 days estimated supply left (50 / 2 = 25)
    expect(getByText('≈ 25 days estimated supply left')).toBeTruthy();
  });
});
