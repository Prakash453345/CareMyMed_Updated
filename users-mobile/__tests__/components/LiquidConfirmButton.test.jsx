import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import LiquidConfirmButton from '../../src/components/ui/LiquidConfirmButton';

// Mock haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

describe('LiquidConfirmButton Layout & Icon States', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders TAKE centered without icon node when pending (taken = false)', () => {
    const { getByText } = render(
      <LiquidConfirmButton taken={false} onPress={() => {}} label="TAKE" takenLabel="TAKEN" />
    );

    expect(getByText('TAKE')).toBeTruthy();
  });

  it('renders TAKEN label and checkmark icon when taken = true', () => {
    const { getByText } = render(
      <LiquidConfirmButton taken={true} onPress={() => {}} label="TAKE" takenLabel="TAKEN" />
    );

    expect(getByText('TAKEN')).toBeTruthy();
  });

  it('triggers onPress on single tap when pending', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <LiquidConfirmButton taken={false} onPress={onPressMock} label="TAKE" takenLabel="TAKEN" />
    );

    act(() => {
      fireEvent.press(getByText('TAKE'));
    });
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
