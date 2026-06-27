/**
 * Clear all local storage used by the app (AsyncStorage + SecureStore).
 * Use after logout for a full reset, or for debugging.
 *
 * How to use from the app:
 * - Call clearAllAppStorage() then e.g. logout and navigate to Login.
 * - Or add a "Effacer les données locales" button in Profile (dev/settings).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export async function clearAllAppStorage(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.warn('[clearStorage] AsyncStorage.clear failed', e);
  }

  const secureKeys = [
    'auth_token',
    'last_email_or_phone',
    'profile_data',
  ];
  for (const key of secureKeys) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('[clearStorage] SecureStore delete failed for', key, e);
    }
  }
}
