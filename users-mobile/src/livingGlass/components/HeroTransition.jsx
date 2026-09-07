/**
 * Living Glass Runtime v1 — HeroTransition Component
 *
 * Declarative source-to-destination transition wrapper registering element refs.
 */

import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import sharedRegistry from '../registry/SharedRegistry';

export default function HeroTransition({
    id,
    children,
    style,
}) {
    const viewRef = useRef(null);

    useEffect(() => {
        if (id && viewRef.current) {
            sharedRegistry.register(id, viewRef);
        }
        return () => {
            if (id) {
                sharedRegistry.unregister(id);
            }
        };
    }, [id]);

    return (
        <View ref={viewRef} style={style} collapsable={false}>
            {children}
        </View>
    );
}
