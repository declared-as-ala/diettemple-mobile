import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useWorkoutCompletionSound(soundAsset: number) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
        });
        const { sound } = await Audio.Sound.createAsync(soundAsset, { shouldPlay: false });
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch {
        soundRef.current = null;
      }
    })();

    return () => {
      mounted = false;
      const sound = soundRef.current;
      soundRef.current = null;
      if (sound) {
        void sound.unloadAsync().catch(() => {});
      }
    };
  }, [soundAsset]);

  const playExerciseCompleteSound = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      // Clean, higher-tempo tone for exercise completion (WhatsApp-like short cue)
      await sound.setRateAsync(1.25, true);
      await sound.playAsync();
    } catch {}
  }, []);

  const playWorkoutCompleteSound = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      // Standard full-tempo celebratory sound for entire workout completion
      await sound.setRateAsync(1.0, true);
      await sound.playAsync();
    } catch {}
  }, []);

  return {
    play: playWorkoutCompleteSound,
    playExerciseCompleteSound,
    playWorkoutCompleteSound,
  };
}

