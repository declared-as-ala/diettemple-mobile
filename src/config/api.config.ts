import { Platform } from 'react-native';
import Constants from 'expo-constants';

declare const __DEV__: boolean;

const PROD_API_HOST = 'https://api.diettemple.tn';
const LOCAL_BACKEND_PORT = 5000;

function resolveDevApiHost(): string {
  // 1. Explicit env var override (e.g. in mobile/.env: EXPO_PUBLIC_API_URL or EXPO_PUBLIC_API_HOST)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_HOST;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/api\/?$/, '');
  }

  // 2. Explicit opt-in for local backend during dev if needed
  if (process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true') {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:${LOCAL_BACKEND_PORT}`;
      }
    }

    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${LOCAL_BACKEND_PORT}`;
    }

    return `http://localhost:${LOCAL_BACKEND_PORT}`;
  }

  // 3. Default to api.diettemple.tn
  return PROD_API_HOST;
}

export const getApiHost = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_HOST;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/api\/?$/, '');
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return resolveDevApiHost();
  }
  return PROD_API_HOST;
};

let _loggedBaseUrl = false;
export const getApiBaseUrl = (): string => {
  const base = getApiHost().replace(/\/+$/, '');
  const url = `${base}/api`;
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !_loggedBaseUrl) {
    _loggedBaseUrl = true;
    console.log('[API] base URL:', url);
  }
  return url;
};

/** Resolve exercise video URL for playback. Relative paths (e.g. /api/videos/... or /media/...) become absolute. */
export const resolveVideoUrl = (videoUrl: string | undefined): string | null => {
  if (!videoUrl || !videoUrl.trim()) return null;
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) return videoUrl;
  const base = getApiBaseUrl().replace(/\/api\/?$/, '');
  return base + (videoUrl.startsWith('/') ? videoUrl : '/' + videoUrl);
};

/** Resolve avatar/photo URL. Use for profile and drawer. Handles /media/... and data: URIs. */
export const resolveMediaUrl = (photoUri: string | null | undefined): string | null => {
  if (!photoUri || !photoUri.trim()) return null;
  if (photoUri.startsWith('data:')) return photoUri;
  if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) return photoUri;
  const base = getApiBaseUrl().replace(/\/api\/?$/, '');
  return base + (photoUri.startsWith('/') ? photoUri : '/' + photoUri);
};

/** Extract YouTube video ID from URL (youtube.com/watch?v=ID or youtu.be/ID). */
export const getYouTubeVideoId = (url: string | undefined): string | null => {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  const m = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1]! : null;
};

/** Build YouTube embed URL for WebView (no controls, plays inline). */
export const getYouTubeEmbedUrl = (videoUrl: string | undefined): string | null => {
  const id = getYouTubeVideoId(videoUrl);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?playsinline=1&controls=0&modestbranding=1&rel=0`;
};