import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, TextInput, Animated } from 'react-native';
import { useMotion } from '../../theme/MotionProvider';

export default function AnimatedNumber({
    value = 0,
    decimals = 0,
    prefix = '',
    suffix = '',
    useGrouping = true,
    springConfig = 'default',
    style,
    ...props
}) {
    const { reduceMotion } = useMotion();
    const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);
    const animValue = useRef(new Animated.Value(reduceMotion ? value : 0)).current;

    useEffect(() => {
        if (reduceMotion) {
            setDisplayValue(value);
            return;
        }

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
    }, [value, reduceMotion, animValue]);

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
