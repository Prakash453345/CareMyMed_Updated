import React, { useEffect, useRef } from 'react';
import { FlatList, Animated } from 'react-native';

export default function AnimatedList({
    data,
    renderItem,
    staggerDelay = 40,
    slideDistance = 15,
    ...props
}) {
    const renderAnimatedItem = ({ item, index }) => {
        return (
            <AnimatedItem
                index={index}
                staggerDelay={staggerDelay}
                slideDistance={slideDistance}
            >
                {renderItem({ item, index })}
            </AnimatedItem>
        );
    };

    return (
        <FlatList
            data={data}
            renderItem={renderAnimatedItem}
            {...props}
        />
    );
}

function AnimatedItem({ children, index, staggerDelay, slideDistance }) {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(index * staggerDelay),
            Animated.spring(animValue, {
                toValue: 1,
                speed: 14,
                bounciness: 4,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index, staggerDelay, animValue]);

    const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [slideDistance, 0],
    });

    const scale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1],
    });

    return (
        <Animated.View style={{ opacity: animValue, transform: [{ translateY }, { scale }] }}>
            {children}
        </Animated.View>
    );
}
