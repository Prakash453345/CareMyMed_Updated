import React from 'react';
import { render } from '@testing-library/react-native';
import CompanionDashboardScreen from '../../src/screens/app/CompanionDashboardScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: { patientId: 'p-123', patientName: 'Puneeth' },
    }),
    useFocusEffect: (callback) => {
      React.useEffect(() => {
        callback();
      }, []);
    },
    useIsFocused: () => true,
  };
});

// Mock apiService
jest.mock('../../src/lib/api', () => ({
  apiService: {
    companion: {
      getPatientStatus: jest.fn().mockResolvedValue({
        data: {
          patient: {
            name: 'Puneeth',
            adherence_rate: 85,
            current_streak: 5,
          },
          companion_insights: {
            summary: 'Everything looks good.',
            visibility_score: 90,
            visibility_label: 'High',
            risk_level: 'low',
          },
          recent_alerts: [],
          refill_alerts: [],
          medication_schedule: [],
        },
      }),
      getInterventions: jest.fn().mockResolvedValue({
        data: { active_interventions: [] },
      }),
      getPatientHealthHistory: jest.fn().mockResolvedValue({ data: {} }),
      refreshInsights: jest.fn().mockResolvedValue({ data: { success: true } }),
    },
  },
}));

describe('CompanionDashboardScreen', () => {
  it('renders without throwing', () => {
    try {
      const { toJSON } = render(<CompanionDashboardScreen />);
      console.log('RENDER SUCCESSFUL:', toJSON());
    } catch (e) {
      console.error('RENDER CAUGHT ERROR:', e);
      throw e;
    }
  });
});
