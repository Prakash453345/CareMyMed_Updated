import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMotion } from '../../../theme/MotionProvider';
import { colors } from '../../../theme';

export default function ShimmerBlock({
    width = '100%',
    height = 16,
    borderRadius = 8,
    style,
}) {
    const { reduceMotion } = useMotion();
    const [containerWidth, setContainerWidth] = useState(0);
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (reduceMotion || containerWidth === 0) return;

        translateX.setValue(-containerWidth);
        const animation = Animated.loop(
            Animated.timing(translateX, {
                toValue: containerWidth,
                duration: 1200,
                useNativeDriver: true,
            })
        );
        animation.start();

        return () => animation.stop();
    }, [reduceMotion, containerWidth, translateX]);

    const handleLayout = (e) => {
        const { width: w } = e.nativeEvent.layout;
        if (w > 0 && w !== containerWidth) {
            setContainerWidth(w);
        }
    };

    return (
        <View
            onLayout={handleLayout}
            style={[
                styles.base,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: colors.surfaceMuted,
                    opacity: reduceMotion ? 0.6 : 1,
                },
                style,
            ]}
        >
            {!reduceMotion && containerWidth > 0 && (
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            transform: [{ translateX }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={[
                            'rgba(255, 255, 255, 0)',
                            'rgba(255, 255, 255, 0.45)',
                            'rgba(255, 255, 255, 0)',
                        ]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
    },
});
