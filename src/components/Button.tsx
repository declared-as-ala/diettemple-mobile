import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import AppLoader from './AppLoader';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  icon,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' ? styles.primaryButton : styles.outlineButton,
        loading && styles.loadingButton,
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <AppLoader variant="button" size="sm" />
      ) : (
        <View style={styles.buttonContent}>
          <Text style={[styles.buttonText, variant === 'outline' && styles.outlineButtonText]}>
            {title}
          </Text>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Use direct color values in StyleSheet.create to avoid module initialization issues
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#D4AF37', // colors.primary
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12, // theme.borderRadius.md
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButton: {
    backgroundColor: '#D4AF37', // colors.primary
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D4AF37', // colors.primary
  },
  loadingButton: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // colors.text
  },
  iconContainer: {
    marginLeft: 8,
  },
  outlineButtonText: {
    color: '#D4AF37', // colors.primary
  },
});

