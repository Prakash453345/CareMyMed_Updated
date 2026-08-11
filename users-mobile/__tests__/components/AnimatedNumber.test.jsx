import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedNumber from '../../src/components/ui/AnimatedNumber';

// Mock MotionProvider
jest.mock('../../src/theme/MotionProvider', () => ({
    useMotion: () => ({ reduceMotion: true }),
}));

describe('AnimatedNumber robustness tests', () => {
    it('handles standard positive number correctly', () => {
        const { getByDisplayValue } = render(<AnimatedNumber value={85} suffix="%" />);
        expect(getByDisplayValue('85%')).toBeTruthy();
    });

    it('safely handles null value without throwing toFixed error', () => {
        const { getByDisplayValue } = render(<AnimatedNumber value={null} suffix="%" />);
        expect(getByDisplayValue('0%')).toBeTruthy();
    });

    it('safely handles undefined value', () => {
        const { getByDisplayValue } = render(<AnimatedNumber value={undefined} suffix="%" />);
        expect(getByDisplayValue('0%')).toBeTruthy();
    });

    it('safely handles NaN value', () => {
        const { getByDisplayValue } = render(<AnimatedNumber value={NaN} suffix="%" />);
        expect(getByDisplayValue('0%')).toBeTruthy();
    });

    it('safely handles Infinity value', () => {
        const { getByDisplayValue } = render(<AnimatedNumber value={Infinity} suffix="%" />);
        expect(getByDisplayValue('0%')).toBeTruthy();
    });
});
