import RecoveryManager, {
    RecordingResult,
    RecordingResultStatus,
    ErrorSeverity,
} from '../../src/services/RecoveryManager';

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

describe('RecoveryManager Unit Tests', () => {
    describe('RecordingResult Factory Methods', () => {
        it('creates a success result with URI', () => {
            const res = RecordingResult.success('file://audio.m4a');
            expect(res.status).toBe(RecordingResultStatus.SUCCESS);
            expect(res.uri).toBe('file://audio.m4a');
            expect(res.isSuccess).toBe(true);
        });

        it('creates permissionDenied result', () => {
            const res = RecordingResult.permissionDenied('No mic permission');
            expect(res.status).toBe(RecordingResultStatus.PERMISSION_DENIED);
            expect(res.uri).toBeNull();
            expect(res.isSuccess).toBe(false);
            expect(res.message).toBe('No mic permission');
        });

        it('creates emptyAudio result', () => {
            const res = RecordingResult.emptyAudio();
            expect(res.status).toBe(RecordingResultStatus.EMPTY_AUDIO);
            expect(res.isSuccess).toBe(false);
        });

        it('creates interrupted result', () => {
            const res = RecordingResult.interrupted('OS call');
            expect(res.status).toBe(RecordingResultStatus.INTERRUPTED);
            expect(res.isSuccess).toBe(false);
            expect(res.message).toBe('OS call');
        });

        it('creates alreadyStopped result', () => {
            const res = RecordingResult.alreadyStopped();
            expect(res.status).toBe(RecordingResultStatus.ALREADY_STOPPED);
            expect(res.isSuccess).toBe(false);
        });

        it('creates generic error result', () => {
            const res = RecordingResult.error('Hardware failure');
            expect(res.status).toBe(RecordingResultStatus.ERROR);
            expect(res.isSuccess).toBe(false);
            expect(res.message).toBe('Hardware failure');
        });
    });

    describe('Audio & Stream Recovery Routines', () => {
        it('recovers voice recorder safely without throwing when null or undefined', async () => {
            const resultNull = await RecoveryManager.recoverVoiceRecorder(null);
            expect(resultNull).toBeNull();

            const resultUndef = await RecoveryManager.recoverVoiceRecorder(undefined);
            expect(resultUndef).toBeNull();
        });

        it('recovers mock recording instance', async () => {
            const mockRec = {
                getStatusAsync: jest.fn().mockResolvedValue({ isRecording: true }),
                getURI: jest.fn().mockReturnValue('file://test.m4a'),
                stopAndUnloadAsync: jest.fn().mockResolvedValue(),
            };

            const uri = await RecoveryManager.recoverVoiceRecorder(mockRec);
            expect(mockRec.getStatusAsync).toHaveBeenCalled();
            expect(mockRec.stopAndUnloadAsync).toHaveBeenCalled();
            expect(uri).toBe('file://test.m4a');
        });

        it('recovers chat stream XHR safely', () => {
            const mockXhr = { abort: jest.fn() };
            RecoveryManager.recoverChatStream(mockXhr);
            expect(mockXhr.abort).toHaveBeenCalled();

            // Calling with null does not throw
            expect(() => RecoveryManager.recoverChatStream(null)).not.toThrow();
        });
    });

    describe('Custom Recovery Handlers Registration', () => {
        it('registers and executes feature recovery handler', async () => {
            const handler = jest.fn().mockResolvedValue(true);
            RecoveryManager.registerRecoveryHandler('Voice Recorder', handler);

            const result = await RecoveryManager.executeRecovery('Voice Recorder');
            expect(handler).toHaveBeenCalled();
            expect(result).toBe(true);

            RecoveryManager.unregisterRecoveryHandler('Voice Recorder');
            const resultAfterUnregister = await RecoveryManager.executeRecovery('Voice Recorder');
            expect(resultAfterUnregister).toBe(false);
        });
    });

    describe('Telemetry Reporting', () => {
        it('reports telemetry without throwing exceptions', () => {
            expect(() => {
                RecoveryManager.reportTelemetry({
                    featureName: 'TestFeature',
                    screenName: 'TestScreen',
                    error: new Error('Simulated telemetry error'),
                    severity: ErrorSeverity.FEATURE_ERROR,
                    recoveryStatus: 'test',
                });
            }).not.toThrow();
        });
    });
});
