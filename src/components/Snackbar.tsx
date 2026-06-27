import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

const ACCENT = '#D4AF37';
const { width } = Dimensions.get('window');
const TAB_BAR_OFFSET = 90;

type SnackbarAction = {
  label: string;
  onPress: () => void;
};

type SnackbarOptions = {
  message: string;
  action?: SnackbarAction;
  duration?: number;
};

type SnackbarContextValue = {
  showSnackbar: (options: SnackbarOptions) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    return {
      showSnackbar: (opts) => {
        if (__DEV__) console.warn('Snackbar: no provider, skipping', opts.message);
      },
    };
  }
  return ctx;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<SnackbarAction | undefined>();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setAction(undefined);
    });
  }, [translateY, opacity]);

  const showSnackbar = useCallback(
    (options: SnackbarOptions) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage(options.message);
      setAction(options.action);
      setVisible(true);
      translateY.setValue(100);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 14,
          stiffness: 120,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      const duration = options.duration ?? 2000;
      timeoutRef.current = setTimeout(hide, duration);
    },
    [hide, translateY, opacity]
  );

  const handleAction = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    action?.onPress?.();
    hide();
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.wrapper,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.snackbar}>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
            {action ? (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleAction}
                activeOpacity={0.8}
              >
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      )}
    </SnackbarContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: TAB_BAR_OFFSET,
    zIndex: 9999,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginRight: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(212,175,55,0.25)',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
});
