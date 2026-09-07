import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, TextInput, Animated } from 'react-native';

export default function AnimatedCounter({
    value = 0,
    decimals = 0,
    prefix = '',
    suffix = '',
    useGrouping = true,
    fromValue,
    style,
    ...props
}) {
    const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : (Number(value) || 0);
    const safeFrom = fromValue !== undefined && Number.isFinite(Number(fromValue)) ? Number(fromValue) : safeValue;
    const [displayValue, setDisplayValue] = useState(safeFrom);
    const animValue = useRef(new Animated.Value(safeFrom)).current;

    useEffect(() => {
        animValue.setValue(safeFrom);
        const id = animValue.addListener(({ value: val }) => {
            const numVal = Number.isFinite(val) ? val : safeValue;
            setDisplayValue(numVal);
        });
        Animated.spring(animValue, {
            toValue: safeValue,
            speed: 12,
            bounciness: 4,
            useNativeDriver: false,
        }).start();

        return () => {
            animValue.removeListener(id);
        };
    }, [safeValue, safeFrom, animValue]);

    const numToFormat = Number.isFinite(displayValue) ? displayValue : 0;
    const rounded = numToFormat.toFixed(decimals);
    let formatted = rounded;
    if (useGrouping) {
        const parts = rounded.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts.join('.');
    }

    const textValue = `${prefix}${formatted}${suffix}`;

    return (
        <TextInput
            editable={false}
            pointerEvents="none"
            style={[styles.textInput, style]}
            value={textValue}
            defaultValue={textValue}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    textInput: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0F172A',
        padding: 0,
        margin: 0,
    },
});
