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
    const [displayValue, setDisplayValue] = useState(fromValue !== undefined ? fromValue : value);
    const animValue = useRef(new Animated.Value(fromValue !== undefined ? fromValue : value)).current;

    useEffect(() => {
        animValue.setValue(fromValue !== undefined ? fromValue : displayValue);
        const id = animValue.addListener(({ value: val }) => {
            setDisplayValue(val);
        });
        Animated.spring(animValue, {
            toValue: value,
            speed: 12,
            bounciness: 4,
            useNativeDriver: false,
        }).start();

        return () => {
            animValue.removeListener(id);
        };
    }, [value, fromValue, animValue]);

    const rounded = displayValue.toFixed(decimals);
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
