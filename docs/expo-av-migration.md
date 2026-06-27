## Expo AV Migration Status

The startup path no longer depends on `expo-av`:

- `src/components/LuxurySplash.tsx` no longer imports `expo-av` audio.
- `src/navigation/TabNavigatorWrapper.tsx` now lazy-loads authenticated/guest navigators, so `expo-av` screens are not eagerly loaded before auth is known.

Active `expo-av` usage still exists in video playback screens/components:

- `src/screens/HomeScreen.tsx`
- `src/screens/ExerciseDetailScreen.tsx`
- `src/components/ExerciseCard.tsx`
- `src/components/workout/ReelsVideoPlayer.tsx`

### Recommended next migration step

1. Add `expo-video` and replace `<Video />` usage with `VideoView + useVideoPlayer`.
2. If audio playback is still needed elsewhere, add `expo-audio` and migrate from `Audio.Sound`.
3. Remove `expo-av` from dependencies after all usages are migrated.

