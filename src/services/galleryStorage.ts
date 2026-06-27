/**
 * Local storage for progress gallery (MVP Option A).
 * Key: dateKey "YYYY-MM-DD". Value: { beforeUri?, afterUri?, notes?, createdAt, updatedAt }.
 * Images stored under FileSystem.documentDirectory/gallery/ for persistence.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const PREFIX = '@diet_gallery_';
const GALLERY_DIR = 'gallery';

export interface GalleryDayEntry {
  beforeUri?: string;
  afterUri?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function storageKey(dateKey: string): string {
  return `${PREFIX}${dateKey}`;
}

function galleryImagePath(dateKey: string, slot: 'before' | 'after', ext = 'jpg'): string {
  return `${FileSystem.documentDirectory}${GALLERY_DIR}/${dateKey}_${slot}.${ext}`;
}

export const galleryStorage = {
  async get(dateKey: string): Promise<GalleryDayEntry | null> {
    try {
      const raw = await AsyncStorage.getItem(storageKey(dateKey));
      if (!raw) return null;
      return JSON.parse(raw) as GalleryDayEntry;
    } catch {
      return null;
    }
  },

  async set(dateKey: string, entry: Partial<GalleryDayEntry> & { beforeUri?: string; afterUri?: string; notes?: string }): Promise<GalleryDayEntry> {
    const now = new Date().toISOString();
    const existing = await galleryStorage.get(dateKey);
    const created = existing?.createdAt ?? now;
    const updated: GalleryDayEntry = {
      beforeUri: entry.beforeUri ?? existing?.beforeUri,
      afterUri: entry.afterUri ?? existing?.afterUri,
      notes: entry.notes !== undefined ? entry.notes : existing?.notes,
      createdAt: created,
      updatedAt: now,
    };
    await AsyncStorage.setItem(storageKey(dateKey), JSON.stringify(updated));
    return updated;
  },

  /** Persist a URI (from picker) into the gallery folder and return the persistent URI. */
  async persistImage(dateKey: string, slot: 'before' | 'after', sourceUri: string): Promise<string> {
    const dir = `${FileSystem.documentDirectory}${GALLERY_DIR}`;
    const exists = await FileSystem.getInfoAsync(dir);
    if (!exists.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const uriWithoutQuery = sourceUri.split('?')[0];
    const extMatch = uriWithoutQuery.match(/\.(\w+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const destUri = galleryImagePath(dateKey, slot, ext);
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    return destUri;
  },

  /** Get path where a slot image would be stored. */
  getImagePath(dateKey: string, slot: 'before' | 'after'): string {
    return galleryImagePath(dateKey, slot);
  },

  /** List all date keys that have at least one photo. */
  async listDatesWithPhotos(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const galleryKeys = keys.filter((k) => k.startsWith(PREFIX));
      const dateKeys: string[] = [];
      for (const k of galleryKeys) {
        const raw = await AsyncStorage.getItem(k);
        if (!raw) continue;
        const entry = JSON.parse(raw) as GalleryDayEntry;
        if (entry?.beforeUri || entry?.afterUri) dateKeys.push(k.replace(PREFIX, ''));
      }
      return dateKeys.sort((a, b) => b.localeCompare(a));
    } catch {
      return [];
    }
  },

  /** Delete entry for a date and remove stored image files. */
  async remove(dateKey: string): Promise<void> {
    const existing = await galleryStorage.get(dateKey);
    await AsyncStorage.removeItem(storageKey(dateKey));
    try {
      if (existing?.beforeUri) await FileSystem.deleteAsync(existing.beforeUri, { idempotent: true });
      if (existing?.afterUri) await FileSystem.deleteAsync(existing.afterUri, { idempotent: true });
    } catch {}
  },

  /** Clear only one slot for a date. */
  async clearSlot(dateKey: string, slot: 'before' | 'after'): Promise<GalleryDayEntry | null> {
    const existing = await galleryStorage.get(dateKey);
    if (!existing) return null;
    const uriToDelete = slot === 'before' ? existing.beforeUri : existing.afterUri;
    if (uriToDelete) {
      await FileSystem.deleteAsync(uriToDelete, { idempotent: true }).catch(() => {});
    }
    const updated: GalleryDayEntry = {
      ...existing,
      [slot === 'before' ? 'beforeUri' : 'afterUri']: undefined,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(storageKey(dateKey), JSON.stringify(updated));
    return updated;
  },
};
