import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import GuidedTour from '../../src/components/ui/GuidedTour';
import { TourService } from '../../src/lib/TourService';
import { HapticPatterns } from '../../src/utils/haptics';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/lib/TourService', () => ({
  TourService: {
    markTourSeen: jest.fn().mockResolvedValue(undefined),
    isTourSeen: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../../src/theme', () => ({
  colors: {
    primary: '#6366F1',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
  },
  useReduceMotion: () => true,
}));

jest.mock('../../src/theme/motion', () => ({
  useReduceMotion: () => true,
}));

jest.mock('../../src/utils/haptics', () => ({
  HapticPatterns: {
    selection: jest.fn(),
  },
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    X: (props) => React.createElement(View, { testID: 'icon-x', ...props }),
    ChevronRight: (props) => React.createElement(View, { testID: 'icon-chevron', ...props }),
    Sparkles: (props) => React.createElement(View, { testID: 'icon-sparkles', ...props }),
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const MockIcon = () => null;

const makeSteps = (count = 1) =>
  Array.from({ length: count }, (_, i) => ({
    title: `Step ${i + 1}`,
    desc: `Description for step ${i + 1}`,
    icon: MockIcon,
    iconColor: '#6366F1',
    ref: { current: null },
    visible: true,
  }));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GuidedTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when visible is false', () => {
      const { toJSON } = render(
        <GuidedTour visible={false} steps={makeSteps()} tourKey="test" onClose={jest.fn()} />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders nothing when steps array is empty', () => {
      const { toJSON } = render(
        <GuidedTour visible={true} steps={[]} tourKey="test" onClose={jest.fn()} />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders the tour when visible with valid steps', () => {
      const { getByText } = render(
        <GuidedTour visible={true} steps={makeSteps(2)} tourKey="test" onClose={jest.fn()} />
      );
      expect(getByText('Step 1')).toBeTruthy();
      expect(getByText('Description for step 1')).toBeTruthy();
    });
  });

  describe('Navigation Flow', () => {
    it('advances through steps on Next press', async () => {
      const { getByText } = render(
        <GuidedTour visible={true} steps={makeSteps(2)} tourKey="test" onClose={jest.fn()} />
      );

      expect(getByText('Step 1')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Next'));
      });

      expect(getByText('Step 2')).toBeTruthy();
    });

    it('marks tour seen and calls onClose on last step press', async () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <GuidedTour visible={true} steps={makeSteps(1)} tourKey="test" onClose={onClose} />
      );

      await act(async () => {
        fireEvent.press(getByText('Got it'));
      });

      expect(TourService.markTourSeen).toHaveBeenCalledWith('test');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback', () => {
    it('triggers haptics on show', () => {
      render(
        <GuidedTour visible={true} steps={makeSteps(1)} tourKey="test" onClose={jest.fn()} />
      );
      expect(HapticPatterns.selection).toHaveBeenCalled();
    });
  });

  describe('Non-Overlapping Layout Geometry (calculateTooltipLayout)', () => {
    const { calculateTooltipLayout } = require('../../src/components/ui/GuideOverlay');

    it('positions tooltip card strictly BELOW target when target is in upper screen half', () => {
      const targetRect = { x: 20, y: 120, width: 350, height: 180 };
      const layout = calculateTooltipLayout(targetRect, 390, 844, 'auto', 130);

      expect(layout.placement).toBe('below');
      expect(layout.top).toBeGreaterThanOrEqual(targetRect.y + targetRect.height + 16);
    });

    it('positions tooltip card strictly ABOVE target when target is in lower screen half', () => {
      const targetRect = { x: 20, y: 550, width: 350, height: 160 };
      const layout = calculateTooltipLayout(targetRect, 390, 844, 'auto', 130);

      const tooltipBottom = layout.top + 130;
      expect(layout.placement).toBe('above');
      expect(tooltipBottom).toBeLessThanOrEqual(targetRect.y - 16);
    });

    it('guarantees 100% Zero Target Overlap invariant across top, middle, and bottom targets', () => {
      const testCases = [
        { x: 10, y: 80, width: 370, height: 100 },   // Top screen header
        { x: 10, y: 320, width: 370, height: 200 },  // Middle caller card
        { x: 10, y: 680, width: 370, height: 90 },   // Bottom navigation / manager
      ];

      testCases.forEach((targetRect) => {
        const layout = calculateTooltipLayout(targetRect, 390, 844, 'auto', 130);
        const tooltipTop = layout.top;
        const tooltipBottom = layout.top + 130;
        const targetTop = targetRect.y;
        const targetBottom = targetRect.y + targetRect.height;

        const isStrictlyAbove = tooltipBottom <= targetTop - 16;
        const isStrictlyBelow = tooltipTop >= targetBottom + 16;

        expect(isStrictlyAbove || isStrictlyBelow).toBe(true);
      });
    });
  });
});
