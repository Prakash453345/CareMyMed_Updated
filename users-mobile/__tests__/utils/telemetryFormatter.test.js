const TELEMETRY_MESSAGES = {
    setup_opened: 'Wearable health setup was opened by the patient.',
    manual_sync_clicked: 'Patient initiated a manual health data sync.',
    manual_sync_completed: 'Manual health telemetry sync completed successfully.',
    setup_permission_denied: 'Wearable setup permissions were declined by the patient.',
    device_disconnected: 'Wearable device disconnected.',
    sync_failed: 'Health data synchronization failed.',
    sync_timeout: 'Health data synchronization timed out.',
};

const formatAlertDescription = (desc) => {
    if (!desc) return '';
    if (typeof desc === 'string' && desc.includes('Setup Telemetry:')) {
        const eventKey = desc.replace(/^.*Setup Telemetry:\s*/, '').trim();
        return TELEMETRY_MESSAGES[eventKey] || 'Wearable health activity was recorded.';
    }
    return desc;
};

describe('formatAlertDescription telemetry tests', () => {
    it('formats setup_opened correctly', () => {
        expect(formatAlertDescription('Setup Telemetry: setup_opened'))
            .toBe('Wearable health setup was opened by the patient.');
    });

    it('formats manual_sync_clicked correctly', () => {
        expect(formatAlertDescription('Setup Telemetry: manual_sync_clicked'))
            .toBe('Patient initiated a manual health data sync.');
    });

    it('formats manual_sync_completed correctly', () => {
        expect(formatAlertDescription('Setup Telemetry: manual_sync_completed'))
            .toBe('Manual health telemetry sync completed successfully.');
    });

    it('handles unknown telemetry event cleanly without leaking internal terminology', () => {
        expect(formatAlertDescription('Setup Telemetry: unknown_internal_event'))
            .toBe('Wearable health activity was recorded.');
    });

    it('passes standard alert descriptions through unmodified', () => {
        expect(formatAlertDescription('Patient missed evening blood pressure check'))
            .toBe('Patient missed evening blood pressure check');
    });
});
