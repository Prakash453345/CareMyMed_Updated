/**
 * Living Glass Runtime v1 — GlassDiffusion Component
 *
 * Parameterized frosted glass material primitive.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import glassMaterials from '../tokens/glassMaterials';

export default function GlassDiffusion({
    children,
    style,
    variant = 'violet',
    opacity = 0.9,
    borderRadius = 24,
}) {
    const preset = glassMaterials.diffusion[variant] || glassMaterials.diffusion.violet;

    return (
        <View
            style={[
                styles.diffusionBase,
                preset,
                {
                    opacity,
                    borderRadius,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    diffusionBase: {
        overflow: 'hidden',
    },
});
