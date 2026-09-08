import { BRAND_YELLOW } from '../constants/brand';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';

const ACCENT = BRAND_YELLOW;
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
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const actionRef = useRef<SnackbarAction | undefined>(undefined);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const hide = useCallback(() => {
    const current = generation.current;
    Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
      if (!finished || current !== generation.current) return;
      setVisible(false);
      setAction(undefined);
      actionRef.current = undefined;
    });
  }, [opacity]);

  const showSnackbar = useCallback(
    (options: SnackbarOptions) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      generation.current += 1;
      opacity.stopAnimation();
      actionRef.current = options.action;
      setMessage(options.message);
      setAction(options.action);
      setVisible(true);
      opacity.setValue(0);
      Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      const duration = options.action ? Math.max(options.duration ?? 5000, 5000) : options.duration ?? 2000;
      timeoutRef.current = setTimeout(hide, duration);
    },
    [hide, opacity]
  );

  const handleAction = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const callback = actionRef.current?.onPress;
    if (!callback) return;
    actionRef.current = undefined;
    generation.current += 1;
    opacity.stopAnimation();
    setVisible(false);
    setAction(undefined);
    Keyboard.dismiss();
    callback();
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      <View style={styles.container}>
      {children}
      {visible && (
        <View
          style={styles.wrapper}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.snackbar, { opacity }]}>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
            {action ? (
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: 'rgba(212,175,55,0.4)' }]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPressIn={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                  opacity.stopAnimation();
                  opacity.setValue(1);
                }}
                onPressOut={() => { timeoutRef.current = setTimeout(hide, 5000); }}
                onPress={handleAction}
              >
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      )}
      </View>
    </SnackbarContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: TAB_BAR_OFFSET,
    zIndex: 9999,
    elevation: 9999,
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
    minHeight: 44,
    justifyContent: 'center',
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

