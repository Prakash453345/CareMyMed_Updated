import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import RecoverableBoundary, { withRecoverableBoundary } from '../../src/components/RecoverableBoundary';
import FallbackRenderer from '../../src/components/FallbackRenderer';

jest.mock('expo-av', () => ({
    Audio: {
        requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
        setAudioModeAsync: jest.fn().mockResolvedValue(null),
        Recording: {
            createAsync: jest.fn().mockResolvedValue({
                recording: {
                    getStatusAsync: jest.fn().mockResolvedValue({ isRecording: true }),
                    getURI: jest.fn().mockReturnValue('file://test.m4a'),
                    stopAndUnloadAsync: jest.fn().mockResolvedValue(),
                },
            }),
        },
    },
}));

jest.mock('@sentry/react-native', () => ({
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    withScope: jest.fn((cb) => cb({ setTag: jest.fn(), setExtra: jest.fn() })),
}));

// Component that reads state.shouldThrow by reference
const ProblemChild = ({ state }) => {
    if (state?.shouldThrow) {
        throw new Error('Test render crash inside child component');
    }
    return <Text>Working Child Component</Text>;
};

describe('RecoverableBoundary Component Tests', () => {
    let originalConsoleError;
    beforeAll(() => {
        originalConsoleError = console.error;
        console.error = jest.fn();
    });
    afterAll(() => {
        console.error = originalConsoleError;
    });

    it('renders children normally when no error occurs', () => {
        const state = { shouldThrow: false };
        const { getByText } = render(
            <RecoverableBoundary featureName="Test Card">
                <ProblemChild state={state} />
            </RecoverableBoundary>
        );

        expect(getByText('Working Child Component')).toBeTruthy();
    });

    it('catches render exception and displays FallbackRenderer with feature title and retry button', () => {
        const state = { shouldThrow: true };
        const { getByText } = render(
            <RecoverableBoundary featureName="Health Score" autoRetryCount={0}>
                <ProblemChild state={state} />
            </RecoverableBoundary>
        );

        expect(getByText("Health Score Unavailable")).toBeTruthy();
        expect(getByText("Retry Health Score")).toBeTruthy();
    });

    it('resets error state when Retry button is pressed', async () => {
        const state = { shouldThrow: true };
        const onRetryMock = jest.fn();

        const { getByText } = render(
            <RecoverableBoundary featureName="Voice Recorder" autoRetryCount={0} onRetry={onRetryMock}>
                <ProblemChild state={state} />
            </RecoverableBoundary>
        );

        expect(getByText("Voice Recorder Unavailable")).toBeTruthy();

        // Mutate state reference before press so re-render succeeds
        state.shouldThrow = false;
        await act(async () => {
            fireEvent.press(getByText("Retry Voice Recorder"));
        });

        expect(onRetryMock).toHaveBeenCalled();
        expect(getByText('Working Child Component')).toBeTruthy();
    });

    it('automatically resets error state when resetKeys change', () => {
        const state = { shouldThrow: true };
        const { getByText, queryByText, rerender } = render(
            <RecoverableBoundary
                featureName="Chart"
                autoRetryCount={0}
                resetKeys={['session-1']}
            >
                <ProblemChild state={state} />
            </RecoverableBoundary>
        );

        expect(getByText("Chart Unavailable")).toBeTruthy();

        // Mutate state reference & change resetKeys
        state.shouldThrow = false;
        rerender(
            <RecoverableBoundary
                featureName="Chart"
                autoRetryCount={0}
                resetKeys={['session-2']}
            >
                <ProblemChild state={state} />
            </RecoverableBoundary>
        );

        expect(queryByText("Chart Unavailable")).toBeNull();
        expect(getByText('Working Child Component')).toBeTruthy();
    });

    it('renders custom preset voice fallback from FallbackRenderer', () => {
        const { getByText } = render(
            <FallbackRenderer
                preset="voice"
                featureName="Voice Recorder"
                fallbackTitle="Microphone Unavailable"
                onRetry={jest.fn()}
            />
        );

        expect(getByText("Microphone Unavailable")).toBeTruthy();
        expect(getByText("Retry Voice")).toBeTruthy();
    });

    it('works correctly with withRecoverableBoundary HOC wrapper', () => {
        const state = { shouldThrow: true };
        const SafeComponent = withRecoverableBoundary(ProblemChild, { featureName: 'Wrapped Feature', autoRetryCount: 0 });
        
        const { getByText } = render(<SafeComponent state={state} />);
        expect(getByText("Wrapped Feature Unavailable")).toBeTruthy();
    });
});
