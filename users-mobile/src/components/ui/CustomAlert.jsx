import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, AlertTriangle, Info, XCircle, Sparkles, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMotion } from '../../theme/MotionProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALERT_WIDTH = Math.min(SCREEN_WIDTH - 44, 340);

const THEME = {
  success: {
    accent: '#059669',
    gradient: ['#10B981', '#059669'],
    topBarGradient: ['#34D399', '#059669'],
    haloBg: '#ECFDF5',
    haloBorder: '#A7F3D0',
    Icon: Check,
  },
  error: {
    accent: '#E11D48',
    gradient: ['#F43F5E', '#E11D48'],
    topBarGradient: ['#FB7185', '#E11D48'],
    haloBg: '#FFF1F2',
    haloBorder: '#FECDD3',
    Icon: XCircle,
  },
  warning: {
    accent: '#D97706',
    gradient: ['#F59E0B', '#D97706'],
    topBarGradient: ['#FBBF24', '#F59E0B'],
    haloBg: '#FEF3C7',
    haloBorder: '#FDE68A',
    Icon: AlertTriangle,
  },
  info: {
    accent: '#7C3AED',
    gradient: ['#8B5CF6', '#7C3AED'],
    topBarGradient: ['#A78BFA', '#7C3AED'],
    haloBg: '#F3E8FF',
    haloBorder: '#DDD6FE',
    Icon: Info,
  },
};

const CustomAlert = forwardRef((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);
  const [type, setType] = useState('info');

  const { reduceMotion } = useMotion();

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const show = useCallback((t, msg, btns, options) => {
    setTitle(t || '');
    setMessage(msg || '');
    const resolvedType = options?.type || inferType(t, btns);
    setType(resolvedType);
    setButtons(btns && btns.length > 0 ? btns : [{ text: 'OK' }]);
    setVisible(true);

    // Tactile Haptic Feedback based on alert type
    try {
      if (resolvedType === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (resolvedType === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (resolvedType === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    } catch (e) {}

    if (reduceMotion) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
      return;
    }

    scaleAnim.setValue(0.88);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, speed: 22, bounciness: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [reduceMotion, scaleAnim, opacityAnim]);

  const dismiss = useCallback((onDismissCallback) => {
    if (reduceMotion) {
      setVisible(false);
      if (onDismissCallback) onDismissCallback();
      return;
    }

    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 130, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      if (onDismissCallback) onDismissCallback();
    });
  }, [reduceMotion, scaleAnim, opacityAnim]);

  useImperativeHandle(ref, () => ({ show, dismiss }), [show, dismiss]);

  if (!visible) return null;

  const theme = THEME[type] || THEME.info;
  const IconComponent = theme.Icon;
  const shouldStack = buttons.length > 2 || buttons.some(b => (b.text || '').length > 12);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Pressable 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} 
          onPress={() => dismiss()} 
        />

        <Animated.View 
          style={[
            styles.alertBox, 
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Top Decorative Accent Bar */}
          <LinearGradient
            colors={theme.topBarGradient || theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topAccentBar}
          />

          <View style={styles.contentContainer}>
            {/* Dual-ring Gradient Icon Halo */}
            <View style={[styles.iconHaloOuter, { backgroundColor: theme.haloBg, borderColor: theme.haloBorder }]}>
              <View style={[styles.iconHaloInner, { backgroundColor: type === 'success' ? '#10B981' : theme.haloBg }]}>
                <IconComponent size={26} color={type === 'success' ? '#FFFFFF' : theme.accent} strokeWidth={3} />
              </View>
            </View>

            <Text style={styles.titleText}>{title}</Text>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}
          </View>

          <View style={[styles.buttonContainer, shouldStack && styles.buttonContainerStacked]}>
            {buttons.map((btn, idx) => {
              const isPrimary = buttons.length === 1 || (idx === buttons.length - 1 && btn.style !== 'cancel');
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              return (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.button,
                    shouldStack && styles.buttonStacked,
                    isPrimary && styles.buttonPrimary,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonCancel,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    dismiss(() => {
                      if (btn.onPress) btn.onPress();
                    });
                  }}
                >
                  {isPrimary ? (
                    <LinearGradient
                      colors={isDestructive ? ['#F43F5E', '#E11D48'] : theme.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryGradient}
                    >
                      <Text style={styles.buttonTextPrimary}>
                        {btn.text}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.buttonTextDestructive,
                        isCancel && styles.buttonTextCancelLabel,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

function inferType(title = '', buttons = []) {
  const t = title.toLowerCase();
  if (t.includes('error') || t.includes('failed') || t.includes('wrong') || t.includes('cannot') || t.includes('rate') || t.includes('too many')) return 'error';
  if (t.includes('success') || t.includes('done') || t.includes('saved') || t.includes('updated')) return 'success';
  if (t.includes('warning') || t.includes('caution') || t.includes('careful') || t.includes('not yet') || t.includes('patience')) return 'warning';
  if (buttons.some(b => b.style === 'destructive')) return 'error';
  return 'info';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: ALERT_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.9)',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  topAccentBar: {
    height: 4,
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
  },
  iconHaloOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconHaloInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  buttonContainerStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonStacked: {
    flex: 0,
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  buttonDestructive: {
    backgroundColor: '#E11D48',
    borderWidth: 0,
  },
  buttonCancel: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  primaryGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  buttonTextPrimary: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
  buttonTextCancelLabel: {
    color: '#64748B',
  },
});

export default CustomAlert;
