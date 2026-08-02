import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    Pressable,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    Vibration,
    ActivityIndicator,
    Dimensions,
    PanResponder,
    DeviceEventEmitter,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Save, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, motion } from '../../theme';
import ScalePressable from './ScalePressable';

class ModalContentErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ModalContentErrorBoundary] Caught inside modal:', error?.message);
    }
    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };
    render() {
        if (this.state.hasError) {
            return (
                <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={36} color="#EF4444" style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4, textAlign: 'center' }}>
                        Form Encountered an Issue
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
                        An unexpected error occurred loading this form section. The rest of your app remains safe.
                    </Text>
                    <Pressable
                        style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
                        onPress={this.handleRetry}
                    >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Try Again</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FONT = {
    regular: { fontFamily: 'Inter', fontWeight: '400' },
    medium: { fontFamily: 'Inter', fontWeight: '500' },
    semibold: { fontFamily: 'Inter', fontWeight: '600' },
    bold: { fontFamily: 'Inter', fontWeight: '700' },
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * PremiumFormModal — A universal, keyboard-safe, bottom-sheet form wrapper.
 */
let activeModalsCount = 0;

const PremiumFormModal = ({
    visible,
    title = 'Edit',
    subtitle,
    onClose,
    onSave,
    saveText = 'Save',
    saving = false,
    saveDisabled = false,
    children,
    headerRight,
    centered = false,
    icon,
    iconColor = '#7C3AED',
    iconBg = '#F5F3FF',
}) => {
    let insets = { top: 0, bottom: 0 };
    try {
        insets = useSafeAreaInsets();
    } catch (e) {
        // Safe fallback if called outside SafeAreaProvider
    }

    const slideAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const panY = useRef(new Animated.Value(0)).current;
    const wasVisibleRef = useRef(false);

    const FOOTER_HEIGHT = 52;
    const dynamicScrollPadding = onSave
        ? FOOTER_HEIGHT + (insets?.bottom || 0) + (keyboardHeight > 0 ? 36 : 28)
        : 32;

    useEffect(() => {
        if (visible) {
            panY.setValue(0);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 45,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();

            if (!wasVisibleRef.current) {
                wasVisibleRef.current = true;
                activeModalsCount++;
                DeviceEventEmitter.emit('FORM_MODAL_VISIBLE', activeModalsCount > 0);
            }
        } else {
            slideAnim.setValue(0);
            backdropAnim.setValue(0);
            panY.setValue(0);

            if (wasVisibleRef.current) {
                wasVisibleRef.current = false;
                activeModalsCount = Math.max(0, activeModalsCount - 1);
                DeviceEventEmitter.emit('FORM_MODAL_VISIBLE', activeModalsCount > 0);
            }
        }

        return () => {
            if (wasVisibleRef.current) {
                wasVisibleRef.current = false;
                activeModalsCount = Math.max(0, activeModalsCount - 1);
                DeviceEventEmitter.emit('FORM_MODAL_VISIBLE', activeModalsCount > 0);
            }
        };
    }, [visible]);

    // Track keyboard height with fluid LayoutAnimation height morphing
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardHeight(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleClose = () => {
        Vibration.vibrate(30);
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            panY.setValue(0);
            onClose?.();
        });
    };

    const handleSave = () => {
        Vibration.vibrate(40);
        onSave?.();
    };

    // PanResponder to support interactive swipe down to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return !centered && gestureState.dy > 5 && Math.abs(gestureState.dx) < 15;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 120 || gestureState.vy > 0.8) {
                    Vibration.vibrate(30);
                    Keyboard.dismiss();
                    Animated.parallel([
                        Animated.timing(slideAnim, {
                            toValue: 0,
                            duration: 180,
                            useNativeDriver: true,
                        }),
                        Animated.timing(backdropAnim, {
                            toValue: 0,
                            duration: 180,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        panY.setValue(0);
                        onClose?.();
                    });
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        ...motion.springSoft,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // Organic scale morph interpolator for smooth spring entry/exit
    const sheetScaleMorph = slideAnim.interpolate({
        inputRange: [0, 0.6, 0.88, 1],
        outputRange: [0.92, 0.97, 1.012, 1],
    });

    const sheetTranslateY = Animated.add(
        slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_HEIGHT, 0],
        }),
        panY
    );

    const renderIcon = () => {
        if (!icon) return null;
        if (React.isValidElement(icon)) return icon;
        if (typeof icon === 'function' || typeof icon === 'object') {
            const IconComp = icon;
            return <IconComp size={20} color={iconColor} strokeWidth={2.5} />;
        }
        return null;
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
            </TouchableWithoutFeedback>

            <View
                style={[
                    styles.sheetWrapper,
                    centered ? { paddingHorizontal: 20 } : { paddingHorizontal: 0 },
                    centered && styles.sheetWrapperCentered,
                    !centered && keyboardHeight > 0 && { paddingBottom: keyboardHeight },
                    centered && keyboardHeight > 0 && { paddingBottom: keyboardHeight / 2 }
                ]}
                pointerEvents="box-none"
            >
              <Animated.View
                style={[
                    centered ? styles.animatedCentered : styles.animatedBottomSheet,
                    {
                        opacity: slideAnim,
                        transform: centered
                            ? [
                                  {
                                      scale: slideAnim.interpolate({
                                          inputRange: [0, 0.8, 1],
                                          outputRange: [0.92, 1.02, 1],
                                      }),
                                  },
                              ]
                            : [
                                  { translateY: sheetTranslateY },
                                  { scale: sheetScaleMorph },
                              ],
                    },
                ]}
                pointerEvents="box-none"
              >
                <View style={[
                    styles.sheetContainer,
                    centered && styles.sheetContainerCentered,
                    keyboardHeight > 0 && { maxHeight: Math.max(280, SCREEN_HEIGHT - keyboardHeight - (Platform.OS === 'android' ? 30 : 50)) }
                ]}>
                    <ModalContentErrorBoundary>
                        <KeyboardAvoidingView
                            style={{ flex: 1 }}
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        >
                            {/* Top drag handle indicator for bottom sheets */}
                            {!centered && (
                                <View {...panResponder.panHandlers} style={styles.handleHitArea}>
                                    <View style={styles.sheetHandle} />
                                </View>
                            )}

                            {/* Header */}
                            <View style={[
                                styles.header,
                                centered && styles.headerCentered,
                            ]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                                    {icon && (
                                        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                                            {renderIcon()}
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.title} numberOfLines={1}>
                                            {title}
                                        </Text>
                                        {subtitle && (
                                            <Text style={styles.subtitle} numberOfLines={2}>
                                                {subtitle}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.headerActions}>
                                    {headerRight}
                                    <Pressable
                                        onPress={handleClose}
                                        style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                                        hitSlop={12}
                                    >
                                        <X size={18} color="#64748B" strokeWidth={2.4} />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Scrollable Form Body */}
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={[
                                    styles.scrollContent,
                                    { paddingBottom: dynamicScrollPadding },
                                ]}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                bounces={true}
                                nestedScrollEnabled={true}
                            >
                                {children}
                            </ScrollView>

                            {/* Sticky Save Button — anchored at sheet bottom with safe keyboard clearance */}
                            {onSave && (
                                <View style={[
                                    styles.stickyFooter,
                                    keyboardHeight > 0 && { paddingBottom: 16, paddingTop: 10 }
                                ]}>
                                    <ScalePressable
                                        onPress={handleSave}
                                        disabled={saving || saveDisabled}
                                        pressScale={0.97}
                                        hapticType="selection"
                                        style={{ width: '100%' }}
                                    >
                                        <LinearGradient
                                            colors={saveDisabled ? ['#94A3B8', '#94A3B8'] : ['#7C3AED', '#6D28D9']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[
                                                styles.saveBtnGradient,
                                                (saving || saveDisabled) && { opacity: 0.6 }
                                            ]}
                                        >
                                            {saving ? (
                                                <ActivityIndicator color="#FFFFFF" size="small" />
                                            ) : (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                    <Save size={18} color="#FFFFFF" strokeWidth={2.5} />
                                                    <Text style={styles.saveBtnText}>{saveText}</Text>
                                                </View>
                                            )}
                                        </LinearGradient>
                                    </ScalePressable>
                                </View>
                            )}
                        </KeyboardAvoidingView>
                    </ModalContentErrorBoundary>
                </View>
              </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    sheetWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        justifyContent: 'flex-end',
    },
    sheetWrapperCentered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    animatedBottomSheet: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    animatedCentered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    sheetContainerCentered: {
        minHeight: 0,
        marginBottom: 0,
        borderRadius: 28,
        width: '92%',
        maxWidth: 400,
    },
    headerCentered: {
        borderBottomWidth: 0,
        paddingBottom: 8,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetContainer: {
        minHeight: SCREEN_HEIGHT * 0.55,
        maxHeight: SCREEN_HEIGHT * 0.90,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 16,
        overflow: 'hidden',
        marginBottom: 0,
    },
    handleHitArea: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 4,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 18,
        ...FONT.bold,
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 1,
        fontWeight: '500',
        lineHeight: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 110,
        flexGrow: 1,
        gap: 12,
    },
    stickyFooter: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    saveBtnGradient: {
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: 15,
        ...FONT.bold,
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
});

export default PremiumFormModal;
