import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import GuidedTour from '../GuidedTour';

jest.mock('../../../theme', () => ({
  useReduceMotion: () => false,
}));

jest.mock('../../../utils/haptics', () => ({
  HapticPatterns: {
    selection: jest.fn(),
  },
}));

jest.mock('../../../lib/TourService', () => ({
  TourService: {
    markTourSeen: jest.fn().mockResolvedValue(),
  },
}));

describe('GuidedTour Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockSteps = [
    {
      title: 'Health Score',
      desc: 'Calculates your daily health grade based on active conditions and vitals.',
      spotlightTop: 100,
      spotlightLeft: 16,
      spotlightWidth: 320,
      spotlightHeight: 140,
      borderRadius: 24,
    },
    {
      title: 'Emergency Alerts',
      desc: 'Add severe allergies and active conditions so your SOS contact is aware.',
      spotlightTop: 260,
      spotlightLeft: 16,
      spotlightWidth: 320,
      spotlightHeight: 120,
      borderRadius: 20,
    },
  ];

  it('renders modal with step title and description when visible is true', () => {
    const { getByText } = render(
      <GuidedTour visible={true} steps={mockSteps} onClose={jest.fn()} />
    );

    expect(getByText('Health Score')).toBeTruthy();
    expect(
      getByText('Calculates your daily health grade based on active conditions and vitals.')
    ).toBeTruthy();
  });

  it('advances to next step when Next button is pressed', async () => {
    const { getByText } = render(
      <GuidedTour visible={true} steps={mockSteps} onClose={jest.fn()} />
    );

    expect(getByText('Health Score')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Next'));
      jest.advanceTimersByTime(500);
    });

    expect(getByText('Emergency Alerts')).toBeTruthy();
  });

  it('calls onClose when Got it button is pressed on final step', async () => {
    const onCloseMock = jest.fn();
    const { getByText } = render(
      <GuidedTour visible={true} steps={[mockSteps[0]]} onClose={onCloseMock} />
    );

    await act(async () => {
      fireEvent.press(getByText('Got it'));
      jest.advanceTimersByTime(500);
    });

    expect(onCloseMock).toHaveBeenCalled();
  });
});
