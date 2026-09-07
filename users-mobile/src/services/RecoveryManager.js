/**
 * RecoveryManager.js
 *
 * CareMyMed Resilient Feature Architecture — Centralized Recovery & Telemetry Service.
 * Provides unified recovery routines, error severity classifications, typed operational results,
 * and diagnostic telemetry reporting.
 */

import { Audio } from 'expo-av';
import * as Sentry from '@sentry/react-native';

export const ErrorSeverity = Object.freeze({
    INFO: 'INFO',
    WARNING: 'WARNING',
    FEATURE_ERROR: 'FEATURE_ERROR',
    SCREEN_ERROR: 'SCREEN_ERROR',
    ROOT_ERROR: 'ROOT_ERROR',
});

export const RecordingResultStatus = Object.freeze({
    SUCCESS: 'SUCCESS',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    EMPTY_AUDIO: 'EMPTY_AUDIO',
    INTERRUPTED: 'INTERRUPTED',
    ALREADY_STOPPED: 'ALREADY_STOPPED',
    ERROR: 'ERROR',
});

export class RecordingResult {
    constructor(status, uri = null, message = '') {
        this.status = status;
        this.uri = uri;
        this.message = message;
        this.isSuccess = status === RecordingResultStatus.SUCCESS;
    }

    static success(uri) {
        return new RecordingResult(RecordingResultStatus.SUCCESS, uri);
    }

    static permissionDenied(msg = 'Microphone permission was not granted.') {
        return new RecordingResult(RecordingResultStatus.PERMISSION_DENIED, null, msg);
    }

    static emptyAudio(msg = 'No audio data was captured.') {
        return new RecordingResult(RecordingResultStatus.EMPTY_AUDIO, null, msg);
    }

    static interrupted(msg = 'Audio recording was interrupted by system or call.') {
        return new RecordingResult(RecordingResultStatus.INTERRUPTED, null, msg);
    }

    static alreadyStopped(msg = 'Audio recording was already stopped.') {
        return new RecordingResult(RecordingResultStatus.ALREADY_STOPPED, null, msg);
    }

    static error(msg = 'An unexpected audio recording error occurred.') {
        return new RecordingResult(RecordingResultStatus.ERROR, null, msg);
    }
}

class RecoveryManagerService {
    constructor() {
        this.recoveryHandlers = new Map();
    }

    /**
     * Safely unloads and resets an Expo Audio.Recording instance.
     * Guaranteed never to throw unhandled exceptions.
     */
    async recoverVoiceRecorder(recordingInstance) {
        if (!recordingInstance) return null;
        try {
            const status = await recordingInstance.getStatusAsync().catch(() => null);
            let uri = null;
            try {
                uri = recordingInstance.getURI();
            } catch (e) {
                // Ignore URI extraction error
            }

            if (status && (status.isRecording || status.isLoaded)) {
                // Guard against premature stopAndUnloadAsync call on uninitialized native recorder (duration < 300ms)
                if (typeof status.durationMillis === 'number' && status.durationMillis < 300) {
                    await new Promise(resolve => setTimeout(resolve, 300 - status.durationMillis));
                }
                await recordingInstance.stopAndUnloadAsync().catch((stopErr) => {
                    console.warn('[RecoveryManager] stopAndUnloadAsync suppressed native error:', stopErr?.message);
                });
            }
            // Reset audio mode back to default playback mode safely
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                }).catch(() => {});
            } catch (e) {}

            return uri;
        } catch (error) {
            console.warn('[RecoveryManager] recoverVoiceRecorder encountered non-fatal error:', error?.message);
            return null;
        }
    }

    /**
     * Safely aborts active XMLHttpRequest / SSE stream.
     */
    recoverChatStream(xhrInstance) {
        if (!xhrInstance) return;
        try {
            if (typeof xhrInstance.abort === 'function') {
                xhrInstance.abort();
            }
        } catch (error) {
            console.warn('[RecoveryManager] recoverChatStream non-fatal error:', error?.message);
        }
    }

    /**
     * Register a named recovery callback for a feature context.
     */
    registerRecoveryHandler(featureName, handlerFn) {
        if (featureName && typeof handlerFn === 'function') {
            this.recoveryHandlers.set(featureName, handlerFn);
        }
    }

    /**
     * Unregister a named recovery callback.
     */
    unregisterRecoveryHandler(featureName) {
        if (featureName) {
            this.recoveryHandlers.delete(featureName);
        }
    }

    /**
     * Executes a registered recovery callback if present.
     */
    async executeRecovery(featureName, ...args) {
        const handler = this.recoveryHandlers.get(featureName);
        if (typeof handler === 'function') {
            try {
                return await handler(...args);
            } catch (error) {
                console.error(`[RecoveryManager] Custom recovery for "${featureName}" failed:`, error?.message);
            }
        }
        return false;
    }

    /**
     * Telemetry Logger — sends structured diagnostic events to console & Sentry
     */
    reportTelemetry({
        featureName = 'UnknownFeature',
        screenName = 'UnknownScreen',
        error = null,
        severity = ErrorSeverity.FEATURE_ERROR,
        recoveryStatus = 'unresolved',
        metadata = {},
    }) {
        const payload = {
            featureName,
            screenName,
            severity,
            recoveryStatus,
            errorMessage: error?.message || String(error || 'Unknown error'),
            timestamp: new Date().toISOString(),
            ...metadata,
        };

        if (__DEV__) {
            console.log(`[Telemetry:${severity}]`, JSON.stringify(payload, null, 2));
        }

        // Forward to Sentry if available
        try {
            if (Sentry && typeof Sentry.captureException === 'function') {
                Sentry.withScope((scope) => {
                    scope.setTag('feature_name', featureName);
                    scope.setTag('screen_name', screenName);
                    scope.setTag('error_severity', severity);
                    scope.setTag('recovery_status', recoveryStatus);
                    scope.setExtra('telemetry_metadata', metadata);

                    if (error instanceof Error) {
                        Sentry.captureException(error);
                    } else {
                        Sentry.captureMessage(`[${severity}] ${featureName}: ${payload.errorMessage}`);
                    }
                });
            }
        } catch (sentryErr) {
            // Never let telemetry failures crash the app
        }
    }
}

export const RecoveryManager = new RecoveryManagerService();
export default RecoveryManager;
