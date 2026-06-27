import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useWorkoutCompletionSound(soundAsset: number) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
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

  const play = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {}
  }, []);

  return { play };
}
