/**
 * Bootstrap: show a minimal splash first, then load the main app.
 * Catches load errors and global JS errors so release shows fallback instead of hard crash.
 */
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const STARTUP_LOG = (step, detail) => {
  console.log('[DietTemple]', step, detail || '');
};

function ErrorFallback({ error, onRetry }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Oups</Text>
      <Text style={styles.errorMessage}>
        Une erreur s'est produite. Fermez l'application et rouvrez-la, ou appuyez sur Réessayer.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

function BootstrapRoot() {
  const [AppComponent, setAppComponent] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [key, setKey] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    STARTUP_LOG('0_appBoot', 'start');
  }, []);

  const loadApp = () => {
    setLoadError(null);
    setGlobalError(null);
    setAppComponent(null);
    STARTUP_LOG('1_bootstrap', 'start');
    import('./App')
      .then((m) => {
        if (mounted.current && m && m.default) {
          STARTUP_LOG('2_appLoad', 'done');
          setAppComponent(() => m.default);
        }
      })
      .catch((e) => {
        if (mounted.current) {
          STARTUP_LOG('2_appLoad', 'error');
          setLoadError(e && e.message ? e.message : 'Erreur au chargement');
        }
      });
  };

  useEffect(() => {
    mounted.current = true;
    loadApp();
    return () => {
      mounted.current = false;
    };
  }, [key]);

  useEffect(() => {
    if (!AppComponent) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [AppComponent]);

  // Global JS error handler: show fallback screen instead of hard crash in release
  useEffect(() => {
    const ErrorUtils = global.ErrorUtils;
    if (!ErrorUtils || !ErrorUtils.setGlobalHandler) return;
    const origHandler = ErrorUtils.getGlobalHandler ? ErrorUtils.getGlobalHandler() : null;
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      const msg = (error && (error.message || String(error))) || 'Unknown error';
      console.error('[DietTemple] Global error:', msg, isFatal);
      if (mounted.current && setGlobalError) {
        setGlobalError(msg);
      }
      // In release, don't call original so app stays open and shows our fallback
      if (typeof __DEV__ !== 'undefined' && __DEV__ && origHandler) {
        origHandler(error, isFatal);
      }
    });
    return () => {
      if (origHandler) ErrorUtils.setGlobalHandler(origHandler);
    };
  }, []);

  const handleRetry = () => {
    setKey((k) => k + 1);
  };

  if (globalError) {
    return (
      <ErrorFallback
        error={globalError}
        onRetry={handleRetry}
      />
    );
  }

  if (loadError) {
    return (
      <ErrorFallback
        error={loadError}
        onRetry={handleRetry}
      />
    );
  }

  // Keep root minimal while App bundle is loading.
  if (!AppComponent) {
    return <View style={styles.loading} />;
  }

  const App = AppComponent;
  return <App key={key} />;
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loading: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});

registerRootComponent(BootstrapRoot);