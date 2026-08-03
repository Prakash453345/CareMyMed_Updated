/**
 * RecoverableBoundary.jsx
 *
 * Core Error Boundary component for CareMyMed's Resilient Feature Architecture.
 * Isolates render exceptions within individual feature boundaries while preserving
 * parent navigation and sibling component states.
 *
 * Features:
 *  - Auto-retries on transient render failures (default 1 automatic retry)
 *  - Automatically resets error state when resetKeys change
 *  - Integrates telemetry logging via RecoveryManager
 *  - Decoupled rendering via FallbackRenderer or custom fallback
 */

import React from 'react';
import RecoveryManager, { ErrorSeverity } from '../services/RecoveryManager';
import FallbackRenderer from './FallbackRenderer';

function areKeysEqual(keysA = [], keysB = []) {
    if (keysA === keysB) return true;
    if (!Array.isArray(keysA) || !Array.isArray(keysB)) return false;
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) return false;
    }
    return true;
}

export default class RecoverableBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            retryCount: 0,
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        const {
            featureName = 'Feature',
            screenName = 'AppScreen',
            autoRetryCount = 1,
            onCatch,
        } = this.props;

        const currentRetry = this.state.retryCount;
        const willAutoRetry = currentRetry < autoRetryCount;

        // Log structured telemetry
        RecoveryManager.reportTelemetry({
            featureName,
            screenName,
            error,
            severity: ErrorSeverity.FEATURE_ERROR,
            recoveryStatus: willAutoRetry ? 'auto_retrying' : 'fallback_rendered',
            metadata: {
                componentStack: errorInfo?.componentStack,
                retryCount: currentRetry,
                autoRetryCount,
            },
        });

        if (typeof onCatch === 'function') {
            try {
                onCatch(error, errorInfo);
            } catch (e) {
                console.warn('[RecoverableBoundary] Error inside onCatch handler:', e);
            }
        }

        // Automatic retry logic for transient errors
        if (willAutoRetry) {
            this.autoRetryTimer = setTimeout(() => {
                this.setState((prevState) => ({
                    hasError: false,
                    error: null,
                    retryCount: prevState.retryCount + 1,
                }));
            }, 300);
        }
    }

    componentDidUpdate(prevProps) {
        // Reset boundary state if resetKeys changed
        if (this.state.hasError && this.props.resetKeys) {
            if (!areKeysEqual(prevProps.resetKeys, this.props.resetKeys)) {
                this.handleReset();
            }
        }
    }

    componentWillUnmount() {
        if (this.autoRetryTimer) {
            clearTimeout(this.autoRetryTimer);
        }
    }

    handleReset = async () => {
        const { featureName, onRetry } = this.props;

        this.setState({
            hasError: false,
            error: null,
            retryCount: 0,
        });

        // Trigger custom recovery handler from RecoveryManager if registered
        if (featureName) {
            await RecoveryManager.executeRecovery(featureName);
        }

        if (typeof onRetry === 'function') {
            try {
                onRetry();
            } catch (e) {
                console.warn('[RecoverableBoundary] Error inside onRetry callback:', e);
            }
        }
    };

    render() {
        const {
            hasError,
            error,
        } = this.state;

        const {
            children,
            fallback,
            featureName = 'Feature',
            fallbackTitle,
            fallbackMessage,
            compact = false,
            preset = 'generic',
            style,
        } = this.props;

        if (hasError) {
            if (typeof fallback === 'function') {
                return fallback(this.handleReset, error);
            }
            if (React.isValidElement(fallback)) {
                return fallback;
            }
            return (
                <FallbackRenderer
                    featureName={featureName}
                    fallbackTitle={fallbackTitle}
                    fallbackMessage={fallbackMessage}
                    preset={preset}
                    compact={compact}
                    style={style}
                    onRetry={this.handleReset}
                    error={error}
                />
            );
        }

        return children;
    }
}

/**
 * HOC Wrapper for RecoverableBoundary
 */
export function withRecoverableBoundary(WrappedComponent, boundaryProps = {}) {
    const ComponentWithBoundary = (props) => (
        <RecoverableBoundary {...boundaryProps} {...props.boundaryProps}>
            <WrappedComponent {...props} />
        </RecoverableBoundary>
    );
    ComponentWithBoundary.displayName = `WithRecoverableBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    return ComponentWithBoundary;
}

// Alias for semantic clarity in feature modules
export const ResilientFeature = RecoverableBoundary;
