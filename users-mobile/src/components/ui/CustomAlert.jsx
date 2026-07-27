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
import { useMotion } from '../../theme/MotionProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALERT_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);

const THEME = {
  success: { accent: '#10B981', bg: '#ECFDF5', icon: '✓', iconBg: '#D1FAE5' },
  error:   { accent: '#EF4444', bg: '#FEF2F2', icon: '!', iconBg: '#FEE2E2' },
  warning: { accent: '#F59E0B', bg: '#FFFBEB', icon: '⚠', iconBg: '#FEF3C7' },
  info:    { accent: '#6366F1', bg: '#EEF2FF', icon: 'i', iconBg: '#E0E7FF' },
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
    setType(options?.type || inferType(t, btns));
    setButtons(btns && btns.length > 0 ? btns : [{ text: 'OK' }]);
    setVisible(true);

    if (reduceMotion) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
      return;
    }

    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, speed: 18, bounciness: 6, useNativeDriver: true }),
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
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      if (onDismissCallback) onDismissCallback();
    });
  }, [reduceMotion, scaleAnim, opacityAnim]);

  useImperativeHandle(ref, () => ({ show, dismiss }), [show, dismiss]);

  if (!visible) return null;

  const theme = THEME[type] || THEME.info;
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
          <View style={[styles.accentBar, { backgroundColor: theme.accent }]} />

          <View style={styles.contentContainer}>
            <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
              <Text style={[styles.iconText, { color: theme.accent }]}>{theme.icon}</Text>
            </View>

            <Text style={styles.titleText}>{title}</Text>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}
          </View>

          <View style={[styles.buttonContainer, shouldStack && styles.buttonContainerStacked]}>
            {buttons.map((btn, idx) => {
              const isPrimary = idx === buttons.length - 1 && buttons.length > 1;
              const isCancel = btn.style === 'cancel' || btn.style === 'destructive';
              const isDestructive = btn.style === 'destructive';

              return (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.button,
                    shouldStack && styles.buttonStacked,
                    isPrimary && { backgroundColor: theme.accent },
                    isDestructive && { backgroundColor: '#EF4444' },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    dismiss(() => {
                      if (btn.onPress) btn.onPress();
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      (isPrimary || isDestructive) && styles.buttonTextPrimary,
                      isCancel && !isDestructive && !isPrimary && styles.buttonTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
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
  if (t.includes('error') || t.includes('failed') || t.includes('wrong')) return 'error';
  if (t.includes('success') || t.includes('done') || t.includes('saved')) return 'success';
  if (t.includes('warning') || t.includes('caution') || t.includes('careful')) return 'warning';
  if (buttons.some(b => b.style === 'destructive')) return 'error';
  return 'info';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: ALERT_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 20,
    fontWeight: '800',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    gap: 8,
  },
  buttonContainerStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  buttonStacked: {
    flex: 0,
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: '#64748B',
  },
});

export default CustomAlert;
