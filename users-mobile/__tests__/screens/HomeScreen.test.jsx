import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PatientHomeScreen from '../../src/screens/patient/HomeScreen';
import usePatientStore from '../../src/store/usePatientStore';
import { useAuth } from '../../src/context/AuthContext';

// Mock Auth
jest.mock('../../src/context/AuthContext', () => ({
    useAuth: jest.fn(),
}));

// Mock Navigation
const mockNavigate = jest.fn();
const mockNavigation = {
    navigate: mockNavigate,
    goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
    const React = require('react');
    return {
        useFocusEffect: (callback) => {
            React.useEffect(() => {
                callback();
            }, [callback]);
        },
        useIsFocused: () => true,
        useNavigation: () => mockNavigation,
    };
});

// Mock Safe Area Insets
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

// Mock i18n translation
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options) => options?.defaultValue || key,
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => {},
    },
}));

describe('PatientHomeScreen Reference Benchmark', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue({
            user: { id: 'u1', user_metadata: { full_name: 'Puneeth Pujala' } },
            profile: { fullName: 'Puneeth Pujala', completion_pct: 100 },
        });

        usePatientStore.setState({
            patient: {
                full_name: 'Puneeth Pujala',
                patient_health_state: { score: 88, label: 'Excellent' },
            },
            vitals: {
                heart_rate: '72',
                blood_pressure: { systolic: 120, diastolic: 80 },
            },
            dashboardMeds: [
                {
                    _id: 'med_1',
                    name: 'Metformin',
                    dosage: '500mg',
                    scheduledTime: '08:00 AM',
                    supply_remaining: 24,
                    taken: false,
                    isActive: true,
                },
                {
                    _id: 'med_2',
                    name: 'Lisinopril',
                    dosage: '10mg',
                    scheduledTime: '08:00 AM',
                    supply_remaining: 3,
                    taken: true,
                    isActive: true,
                },
            ],
            loading: false,
            fetchDashboard: jest.fn(),
            optimisticMarkSlotTaken: jest.fn(),
            updateMedSupply: jest.fn(),
        });
    });

    it('renders Zone 1 Orientation Header with greeting and formatted date', () => {
        const { getByText } = render(<PatientHomeScreen navigation={mockNavigation} />);

        expect(getByText(/Puneeth 👋/)).toBeTruthy();
    });

    it('renders Zone 2 Verified Health State Hero with score ring and status badge', () => {
        const { getByText } = render(<PatientHomeScreen navigation={mockNavigation} />);

        expect(getByText('88')).toBeTruthy();
        expect(getByText('Excellent')).toBeTruthy();
        expect(getByText('Health Today')).toBeTruthy();
    });

    it('renders Zone 2 Elderly-Friendly Setup Journey when profile completion is < 50%', () => {
        useAuth.mockReturnValue({
            user: { id: 'u1' },
            profile: { fullName: 'Puneeth Pujala', completion_pct: 35 },
        });

        const { getByText, queryByText } = render(<PatientHomeScreen navigation={mockNavigation} />);

        expect(getByText('Getting Started')).toBeTruthy();
        expect(getByText('Setting up your care profile: Step 2 of 4')).toBeTruthy();
        expect(getByText('Complete Setup')).toBeTruthy();
        // Should not show raw clinical score ring
        expect(queryByText('Health Today')).toBeNull();
    });

    it('renders Zone 3 Today Medications with dose list and supply count', () => {
        const { getByText } = render(<PatientHomeScreen navigation={mockNavigation} />);

        expect(getByText("Today's Medications")).toBeTruthy();
        expect(getByText('Metformin')).toBeTruthy();
        expect(getByText('24 left')).toBeTruthy();
        expect(getByText('3 left')).toBeTruthy();
    });

    it('renders Zone 4 Vitals with verified data and honest empty state when null', () => {
        const { getByText, getAllByText, rerender } = render(<PatientHomeScreen navigation={mockNavigation} />);

        // Verified vitals rendered
        expect(getByText('72')).toBeTruthy();
        expect(getByText('bpm')).toBeTruthy();
        expect(getByText('120/80')).toBeTruthy();
        expect(getByText('mmHg')).toBeTruthy();

        // When vitals are not recorded, render honest empty state ('—' and 'Not recorded')
        act(() => {
            usePatientStore.setState({ vitals: null });
        });

        rerender(<PatientHomeScreen navigation={mockNavigation} />);
        expect(getAllByText('Not recorded').length).toBe(2);
    });

    it('navigates to Medications when See All is clicked', () => {
        const { getByText } = render(<PatientHomeScreen navigation={mockNavigation} />);

        const seeAll = getByText('See all');
        fireEvent.press(seeAll);
        expect(mockNavigate).toHaveBeenCalledWith('Medications');
    });
});
