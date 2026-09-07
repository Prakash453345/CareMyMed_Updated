import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import ChatHistoryScreen from '../../src/screens/patient/ChatHistoryScreen';
import useChatStore from '../../src/store/useChatStore';
import { apiService } from '../../src/lib/api';

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const dummy = () => React.createElement(View);
  return {
    ArrowLeft: dummy,
    ArrowRight: dummy,
    MessageSquare: dummy,
    Plus: dummy,
    ChevronRight: dummy,
    Bot: dummy,
    Sparkles: dummy,
    Pill: dummy,
    Activity: dummy,
    TrendingUp: dummy,
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }) => React.createElement(View, { style }, children),
  };
});

// Mock Navigation
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(true),
    }),
    useFocusEffect: (callback) => {
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
    useIsFocused: () => true,
    useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
  };
});

// Mock Auth Context
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    userRole: 'patient',
  }),
}));

// Mock Patient Store
jest.mock('../../src/store/usePatientStore', () => {
  const mockStore = (selector) => {
    const state = {
      patient: { _id: 'patient-abc', first_name: 'Puneeth' },
      companionSelectedPatientId: null,
    };
    return selector(state);
  };
  return mockStore;
});

// Mock API layer
jest.mock('../../src/lib/api', () => ({
  apiService: {
    chatbot: {
      getSessions: jest.fn().mockResolvedValue({
        data: [
          { _id: 'session-1', title: 'Medication Check', updated_at: new Date().toISOString() },
          { _id: 'session-2', title: 'Vitals Review', updated_at: new Date().toISOString() },
        ],
      }),
      getSession: jest.fn().mockResolvedValue({ data: { messages: [] } }),
      deleteSession: jest.fn().mockResolvedValue({ data: { success: true } }),
    },
  },
  handleApiError: (err) => ({ message: err.message || 'API Error' }),
}));

describe('ChatHistoryScreen Single Source of Truth & Rollback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.setState({
      sessions: [
        { _id: 'session-1', title: 'Medication Check', updated_at: new Date().toISOString() },
        { _id: 'session-2', title: 'Vitals Review', updated_at: new Date().toISOString() },
      ],
      deletedSessionIds: new Set(),
      isLoading: false,
    });
  });

  it('renders sessions from useChatStore single source of truth', async () => {
    const { getByText } = render(<ChatHistoryScreen />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(getByText('Medication Check')).toBeTruthy();
    expect(getByText('Vitals Review')).toBeTruthy();
  });

  it('restores deleted session to UI when deletion API fails and store rolls back', async () => {
    apiService.chatbot.deleteSession.mockRejectedValueOnce(new Error('Network connection dropped'));

    const { getByText } = render(<ChatHistoryScreen />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(getByText('Medication Check')).toBeTruthy();

    // Trigger delete via store directly (mimicking alert confirm action)
    await act(async () => {
      try {
        await useChatStore.getState().deleteSession('session-1');
      } catch {
        // Ignored
      }
    });

    // After failure rollback, session-1 must remain in rendered UI
    expect(getByText('Medication Check')).toBeTruthy();
    expect(useChatStore.getState().sessions).toHaveLength(2);
  });
});
