import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Simple unit simulation of TactileWheelPicker scroll logic
describe('TactileWheelPicker Scroll Architecture & Feedback Loop Protection', () => {
  it('derives active index from physical content offset on momentum scroll end with -2 placeholder offset', () => {
    const onValueChange = jest.fn();
    const itemHeight = 44;
    const items = [
      { label: 'Jan', value: '01' },
      { label: 'Feb', value: '02' },
      { label: 'Mar', value: '03' },
      { label: 'Apr', value: '04' },
      { label: 'May', value: '05' },
    ];

    let isUserScrolling = false;
    let selectedValue = '01';

    const handleScrollEnd = (yOffset) => {
      const dataIndex = Math.max(0, Math.min(items.length - 1, Math.round(yOffset / itemHeight) - 2));
      if (dataIndex >= 0 && dataIndex < items.length) {
        const item = items[dataIndex];
        if (item && item.value !== selectedValue) {
          isUserScrolling = true;
          selectedValue = item.value;
          onValueChange(item.value);
        }
      }
    };

    // User flicks to padded index 5 (offset 220 = (3 + 2) * 44) -> maps to data index 3 ('04')
    handleScrollEnd(220);

    expect(onValueChange).toHaveBeenCalledWith('04');
    expect(selectedValue).toBe('04');
    expect(isUserScrolling).toBe(true);
  });
});
