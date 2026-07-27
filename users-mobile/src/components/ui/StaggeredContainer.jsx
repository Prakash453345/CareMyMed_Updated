import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

export default function StaggeredContainer({
    children,
    staggerDelay = 60,
    initialOffsetY = 15,
    style,
}) {
    const childrenArray = React.Children.toArray(children);

    return (
        <View style={style}>
            {childrenArray.map((child, index) => (
                <StaggeredItem
                    key={child.key || index}
                    index={index}
                    staggerDelay={staggerDelay}
                    initialOffsetY={initialOffsetY}
                >
                    {child}
                </StaggeredItem>
            ))}
        </View>
    );
}

function StaggeredItem({ children, index, staggerDelay, initialOffsetY }) {
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
        outputRange: [initialOffsetY, 0],
    });

    return (
        <Animated.View style={{ opacity: animValue, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    );
}
