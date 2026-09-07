import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SmartInput from '../SmartInput';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(),
}));

describe('SmartInput Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders input with label and placeholder correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <SmartInput label="Event / Surgery / Diagnosis *" placeholder="e.g. Knee Replacement" value="" onChangeText={() => {}} />
    );

    expect(getByText("Event / Surgery / Diagnosis *")).toBeTruthy();
    expect(getByPlaceholderText("e.g. Knee Replacement")).toBeTruthy();
  });

  it('triggers onChangeText when user types in field', () => {
    const onChangeMock = jest.fn();
    const { getByPlaceholderText } = render(
      <SmartInput label="Notes" placeholder="Write notes..." value="" onChangeText={onChangeMock} />
    );

    fireEvent.changeText(getByPlaceholderText("Write notes..."), "Dr. Gupta recommended surgery");
    expect(onChangeMock).toHaveBeenCalledWith("Dr. Gupta recommended surgery");
  });

  it('renders error message when error prop is provided', () => {
    const { getByText } = render(
      <SmartInput label="Phone" value="" error="Phone number is required" onChangeText={() => {}} />
    );

    expect(getByText("Phone number is required")).toBeTruthy();
  });

  it('handles focus and blur events without throwing', () => {
    const { getByPlaceholderText } = render(
      <SmartInput label="City" placeholder="Enter city" value="" onChangeText={() => {}} />
    );

    const input = getByPlaceholderText("Enter city");
    act(() => {
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');
    });
  });
});
