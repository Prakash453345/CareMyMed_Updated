/**
 * SmartInput — Progressive Stateful Form Input System
 *
 * Principles:
 * - Restraint at Rest → Uncluttered, clean fields that become responsive on focus/edit
 * - Purposeful Icons → Renders icons when explicitly provided (or autoIcon={true} for key fields)
 * - Suffix Support → Sleek unit chips (e.g. mmHg, BPM, kg, cm) for health metrics
 * - Calm Focus Elevation → Soft, serene shadow elevation matching Living Glass design
 * - Progressive States → Idle | Focused | Filled | Validated | Error | Disabled
 */
import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { View, Text, TextInput, Animated, StyleSheet, Platform, Pressable } from 'react-native';
import {
  Activity,
  Calendar,
  AlignLeft,
  Stethoscope,
  User,
  Phone,
  Mail,
  Lock,
  Search,
  MapPin,
  Pill,
  Syringe,
  Scale,
  Check,
  X,
  FileText,
} from 'lucide-react-native';

const COLORS = {
  border: '#E2E8F0',
  borderFocus: '#7C3AED',
  borderError: '#EF4444',
  bg: '#FFFFFF',
  bgFilled: '#FAFAFE',
  bgFocus: '#FAF5FF',
  bgError: '#FFF5F5',
  label: '#475569',
  labelFocus: '#7C3AED',
  labelError: '#EF4444',
  text: '#0F172A',
  placeholder: '#94A3B8',
  errorText: '#DC2626',
};

// Smart auto-icon resolver (active when autoIcon={true})
const resolveSmartIcon = (label = '', placeholder = '', explicitLeft, explicitIcon, isFocused) => {
  if (explicitLeft) return explicitLeft;
  if (explicitIcon) return explicitIcon;

  const text = `${label} ${placeholder}`.toLowerCase();
  const iconColor = isFocused ? '#7C3AED' : '#64748B';
  const iconSize = 16;

  if (text.includes('event') || text.includes('surgery') || text.includes('diagnosis')) {
    return <FileText size={iconSize} color={iconColor} />;
  }
  if (text.includes('date') || text.includes('when')) {
    return <Calendar size={iconSize} color={iconColor} />;
  }
  if (text.includes('note') || text.includes('reaction') || text.includes('detail') || text.includes('description')) {
    return <AlignLeft size={iconSize} color={iconColor} />;
  }
  if (text.includes('doctor') || text.includes('prescrib') || text.includes('physician')) {
    return <Stethoscope size={iconSize} color={iconColor} />;
  }
  if (text.includes('name') || text.includes('contact') || text.includes('relation') || text.includes('user')) {
    return <User size={iconSize} color={iconColor} />;
  }
  if (text.includes('phone') || text.includes('mobile')) {
    return <Phone size={iconSize} color={iconColor} />;
  }
  if (text.includes('email')) {
    return <Mail size={iconSize} color={iconColor} />;
  }
  if (text.includes('password') || text.includes('pin')) {
    return <Lock size={iconSize} color={iconColor} />;
  }
  if (text.includes('search')) {
    return <Search size={iconSize} color={iconColor} />;
  }
  if (text.includes('city') || text.includes('address') || text.includes('location')) {
    return <MapPin size={iconSize} color={iconColor} />;
  }
  if (text.includes('medication') || text.includes('drug') || text.includes('dose') || text.includes('dosage')) {
    return <Pill size={iconSize} color={iconColor} />;
  }
  if (text.includes('vaccine') || text.includes('shot')) {
    return <Syringe size={iconSize} color={iconColor} />;
  }
  if (text.includes('weight') || text.includes('height') || text.includes('vital')) {
    return <Scale size={iconSize} color={iconColor} />;
  }
  return null;
};

const SmartInput = forwardRef(function SmartInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    error,
    variant = 'default', // 'default' | 'compact' | 'multiline'
    style,
    labelStyle,
    maxLength,
    autoCapitalize,
    returnKeyType,
    multiline,
    textAlignVertical,
    secureTextEntry,
    editable = true,
    leftAccessory,
    leftIcon,
    rightAccessory,
    suffix,
    autoIcon = false,
    clearable = false,
    onClear,
    showCheckmark = false,
    helperText,
    ...rest
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const isFilled = Boolean(value && String(value).length > 0);
  const hasError = !!error;
  const isMultiline = variant === 'multiline' || multiline;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (rest.onFocus) rest.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (rest.onBlur) rest.onBlur(e);
  };

  const computedIcon = (leftAccessory || leftIcon || autoIcon)
    ? resolveSmartIcon(label, placeholder, leftAccessory, leftIcon, isFocused)
    : null;

  // Dynamic Border Color
  const borderColor = hasError
    ? COLORS.borderError
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.border, COLORS.borderFocus],
      });

  // Serene Background Color
  const backgroundColor = hasError
    ? COLORS.bgError
    : isFocused
    ? COLORS.bgFocus
    : COLORS.bg;

  // Dynamic Label Color
  const labelColor = hasError
    ? COLORS.labelError
    : isFocused
    ? COLORS.labelFocus
    : COLORS.label;

  const inputHeight = variant === 'compact' ? 44 : isMultiline ? 104 : 50;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelRow}>
          {isFocused && <View style={styles.labelIndicatorDot} />}
          <Animated.Text
            style={[
              styles.label,
              { color: labelColor },
              isFocused && styles.labelFocused,
              labelStyle,
            ]}
          >
            {label}
          </Animated.Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor,
            height: isMultiline ? undefined : inputHeight,
            minHeight: isMultiline ? inputHeight : undefined,
            shadowColor: isFocused ? '#7C3AED' : '#000000',
            shadowOpacity: isFocused ? 0.08 : 0.02,
            shadowRadius: isFocused ? 6 : 2,
            shadowOffset: { width: 0, height: isFocused ? 3 : 1 },
            elevation: isFocused ? 2 : 0,
            borderWidth: isFocused ? 1.5 : 1,
          },
          hasError && styles.inputError,
        ]}
      >
        {computedIcon ? (
          <View
            style={[
              styles.iconBadge,
              isFocused && styles.iconBadgeFocused,
              hasError && styles.iconBadgeError,
            ]}
          >
            {computedIcon}
          </View>
        ) : null}

        <TextInput
          ref={ref}
          style={[
            styles.input,
            isMultiline && styles.inputMultiline,
            !editable && styles.inputDisabled,
            computedIcon && styles.inputWithIcon,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          multiline={isMultiline}
          textAlignVertical={isMultiline ? 'top' : textAlignVertical}
          secureTextEntry={secureTextEntry}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {/* Suffix Unit Chip (e.g. mmHg, BPM, kg, cm) */}
        {suffix ? (
          <View style={styles.suffixChip}>
            <Text style={styles.suffixChipText}>{suffix}</Text>
          </View>
        ) : rightAccessory ? (
          rightAccessory
        ) : clearable && isFilled && isFocused ? (
          <Pressable
            onPress={() => {
              if (onChangeText) onChangeText('');
              if (onClear) onClear();
            }}
            style={styles.clearBtn}
            hitSlop={8}
          >
            <X size={14} color="#94A3B8" />
          </Pressable>
        ) : showCheckmark && isFilled && !isFocused && !hasError && !isMultiline ? (
          <View style={styles.checkBadge}>
            <Check size={12} color="#10B981" strokeWidth={3} />
          </View>
        ) : null}
      </Animated.View>

      {hasError && typeof error === 'string' ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  labelIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7C3AED',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  labelFocused: {
    fontWeight: '900',
  },
  inputWrapper: {
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconBadgeFocused: {
    backgroundColor: 'rgba(243, 232, 255, 0.9)',
  },
  iconBadgeError: {
    backgroundColor: 'rgba(254, 226, 226, 0.8)',
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputMultiline: {
    paddingTop: 12,
    paddingBottom: 12,
    flex: 1,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    color: '#64748B',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  suffixChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  suffixChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default SmartInput;
