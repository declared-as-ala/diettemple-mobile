/**
 * Auth token storage using encrypted SecureStore.
 *
 * Strategy:
 * 1. Always try SecureStore first (encrypted, recommended).
 * Legacy AsyncStorage tokens are migrated once, but new tokens are never
 * written to unencrypted storage.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'auth_token';

export async function getAuthToken(): Promise<string | null> {
  // 1. Try SecureStore (encrypted)
  try {
    const token = await SecureStore.getItemAsync(KEY);
    if (token !== null) return token;
  } catch {
    // SecureStore unavailable — check once for a legacy token to migrate.
  }

  // 2. Fall back to AsyncStorage (also checks for legacy tokens to migrate)
  try {
    const legacy = await AsyncStorage.getItem(KEY);
    if (legacy) {
      // Opportunistically migrate to SecureStore
      try {
        await SecureStore.setItemAsync(KEY, legacy);
        await AsyncStorage.removeItem(KEY);
      } catch {
        // Migration failed — keep AsyncStorage token for now
      }
    }
    return legacy;
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    try {
      await SecureStore.setItemAsync(KEY, token);
      await AsyncStorage.removeItem(KEY).catch(() => {});
      return;
    } catch {
      throw new Error('Secure token storage is unavailable');
    }
  } else {
    // Clear from both storages
    await SecureStore.deleteItemAsync(KEY).catch(() => {});
    await AsyncStorage.removeItem(KEY).catch(() => {});
  }
}

export async function deleteAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
