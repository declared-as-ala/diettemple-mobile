import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches JS errors so the app doesn't close immediately in production.
 * Shows a fallback UI; retry resets auth to BOOTING and clears error.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log in release too so adb logcat / crash tools can see the error
    console.error('[RootErrorBoundary]', error?.message ?? error, errorInfo?.componentStack ?? '');
  }

  retry = () => {
    useAuthStore.setState({
      authStatus: 'BOOTING',
      isLoading: true,
      token: null,
      user: null,
      isAuthenticated: false,
    });
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oups</Text>
          <Text style={styles.message}>
            Une erreur est survenue. Rouvrez l'application ou réessayez.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.retry} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
