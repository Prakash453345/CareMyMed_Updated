import React from 'react';
import { render, act } from '@testing-library/react-native';
import SettingsScreen from '../../src/screens/settings/SettingsScreen';

// Mock translation hook
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options) => {
            if (options && options.defaultValue) return options.defaultValue;
            return key;
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => {},
    },
}));

// Mock navigation
const navigationMock = { goBack: jest.fn(), navigate: jest.fn() };

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn().mockResolvedValue('false'),
    setItemAsync: jest.fn().mockResolvedValue(true),
    deleteItemAsync: jest.fn().mockResolvedValue(true),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

// Mock UI components
jest.mock('../../src/components/ui/TabScreenTransition', () => {
    const React = require('react');
    const { View } = require('react-native');
    return ({ children }) => React.createElement(View, null, children);
});

jest.mock('../../src/components/ui/AnimatedCard', () => {
    const React = require('react');
    const { View } = require('react-native');
    return ({ children, style }) => React.createElement(View, { style }, children);
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        LinearGradient: ({ children, style }) => React.createElement(View, { style }, children),
    };
});

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
    const React = require('react');
    const { View } = require('react-native');
    const dummy = () => React.createElement(View);
    return new Proxy({}, {
        get: (target, prop) => dummy,
    });
});

// Mock Patient Store
jest.mock('../../src/store/usePatientStore', () => {
    const mockStore = (selector) => {
        const state = {
            patient: { _id: 'p-123', name: 'Test Patient', language: 'en_IN', push_notifications_enabled: true, medication_reminders_enabled: true },
            reduceMotion: false,
            setReduceMotion: jest.fn(),
            setPatient: jest.fn(),
        };
        return selector ? selector(state) : state;
    };
    mockStore.getState = () => ({
        patient: { _id: 'p-123', name: 'Test Patient', language: 'en_IN', push_notifications_enabled: true, medication_reminders_enabled: true },
        reduceMotion: false,
        setReduceMotion: jest.fn(),
        setPatient: jest.fn(),
    });
    return mockStore;
});

// Mock HealthSyncService
jest.mock('../../src/services/HealthSyncService', () => ({
    getStatus: jest.fn().mockResolvedValue({
        enabled: true,
        connected: true,
        lastSync: new Date().toISOString(),
    }),
    syncVitals: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock API layer
jest.mock('../../src/lib/api', () => ({
    apiService: {
        patients: {
            updateMe: jest.fn().mockResolvedValue({ data: { patient: { _id: 'p-123' } } }),
        },
        auth: {
            changePassword: jest.fn().mockResolvedValue({ success: true }),
        },
    },
}));

// Mock AuthContext
jest.mock('../../src/context/AuthContext', () => ({
    useAuth: () => ({
        signOut: jest.fn(),
        userEmail: 'patient@caremymed.com',
    }),
}));

describe('SettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly and matches active settings structure', async () => {
        const { toJSON, getByText } = render(<SettingsScreen navigation={navigationMock} />);
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });
        expect(toJSON()).toBeTruthy();
        expect(getByText('Settings & Preferences')).toBeTruthy();
        expect(getByText(/Test Patient|Account Settings/i)).toBeTruthy();
        expect(getByText(/Protected/i)).toBeTruthy();
        expect(getByText('Security & Access')).toBeTruthy();
        expect(getByText('Notifications & Health Alarms')).toBeTruthy();
        expect(getByText('Connected Devices & Health Sync')).toBeTruthy();
        expect(getByText('Preferences & Interface')).toBeTruthy();
    });
});
