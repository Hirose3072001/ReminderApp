import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const sizeStyles = sizeMap[size];
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.wrapper, fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, sizeStyles.container, isDisabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.onPrimary} size="small" />
          ) : (
            <Text style={[styles.text, sizeStyles.text, styles.primaryText, textStyle]}>
              {label}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        sizeStyles.container,
        variantContainerStyles[variant],
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'tertiary' ? Colors.primary : Colors.onSurface}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            sizeStyles.text,
            variantTextStyles[variant],
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const sizeMap = {
  sm: {
    container: { paddingVertical: Spacing[2], paddingHorizontal: Spacing[4] },
    text: { fontSize: FontSize.labelLg },
  },
  md: {
    container: { paddingVertical: Spacing[3], paddingHorizontal: Spacing[6] },
    text: { fontSize: FontSize.bodyMd },
  },
  lg: {
    container: { paddingVertical: Spacing[4], paddingHorizontal: Spacing[8] },
    text: { fontSize: FontSize.bodyLg },
  },
};

const variantContainerStyles: Record<Exclude<ButtonVariant, 'primary'>, ViewStyle> = {
  secondary: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  tertiary: {
    backgroundColor: Colors.transparent,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  danger: {
    backgroundColor: Colors.errorContainer,
  },
};

const variantTextStyles: Record<Exclude<ButtonVariant, 'primary'>, TextStyle> = {
  secondary: {
    color: Colors.onSecondaryContainer,
  },
  tertiary: {
    color: Colors.primary,
  },
  danger: {
    color: Colors.error,
  },
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  base: {
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: FontFamily.manropeSemiBold,
    letterSpacing: 0.01,
  },
  primaryText: {
    color: Colors.onPrimary,
  },
  disabled: {
    opacity: 0.5,
  },
});
