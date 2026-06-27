import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const vibrate = (ms: number) => {
  try {
    if (Platform.OS === 'web') return;
    const RN = require('react-native');
    if (RN.Vibration && typeof RN.Vibration.vibrate === 'function') RN.Vibration.vibrate(ms);
  } catch (_) {}
};

interface RestTimerProps {
  visible: boolean;
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
  /** When true, timer turns red below this threshold (default 20) */
  redBelowSeconds?: number;
}

const RED_BELOW_DEFAULT = 20;

export default function RestTimer({ visible, seconds, onComplete, onSkip, redBelowSeconds = RED_BELOW_DEFAULT }: RestTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = React.useState(seconds);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setRemainingSeconds(seconds);
      
      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Countdown
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            setTimeout(() => {
              onComplete();
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        pulse.stop();
      };
    }
  }, [visible, seconds]);

  if (!visible) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const progress = 1 - (remainingSeconds / seconds);
  const isRed = remainingSeconds > 0 && remainingSeconds <= redBelowSeconds;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.label}>Repos</Text>
        
        <Animated.View
          style={[
            styles.timerCircle,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: isRed ? '#EF4444' : '#D4AF37',
            },
          ]}
        >
          <View style={styles.progressRing}>
            <View
              style={[
                styles.progressFill,
                {
                  height: `${progress * 100}%`,
                  backgroundColor: isRed ? 'rgba(239,68,68,0.4)' : 'rgba(0, 255, 0, 0.3)',
                },
              ]}
            />
          </View>
          <Text style={[styles.timerText, isRed && { color: '#EF4444' }]}>
            {minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`}
          </Text>
        </Animated.View>

        <Text style={styles.hint}>Prochaine série dans…</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.add15Button, isRed && styles.add15ButtonRed]}
            onPress={() => {
              vibrate(10);
              setRemainingSeconds((prev) => prev + 15);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.add15ButtonText, isRed && { color: '#EF4444' }]}>+15 s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.skipButton, isRed && styles.skipButtonRed]}
            onPress={() => {
              vibrate(10);
              onSkip();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Passer</Text>
            <Ionicons name="arrow-forward" size={20} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    alignItems: 'center',
    padding: 32,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#D4AF37',
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressRing: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  progressFill: {
    width: '100%',
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  timerText: {
    color: '#D4AF37',
    fontSize: 48,
    fontWeight: '700',
    zIndex: 1,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  add15Button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 10,
  },
  add15ButtonText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
  },
  add15ButtonRed: { borderColor: '#EF4444' },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButtonRed: {},
});
