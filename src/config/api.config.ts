/**
 * API Configuration — backend base URL for all environments.
 *
 * New production backend (HTTPS): https://next.protein.tn
 * - All API calls use https://next.protein.tn/api
 * - Cleartext (HTTP) config can be removed in a future APK build.
 */
declare const __DEV__: boolean;

// DietTemple API — same for dev and production APK (release uses this URL)
const API_HOST = 'https://api.diettemple.tn';

let _loggedBaseUrl = false;
export const getApiBaseUrl = (): string => {
  const base = API_HOST.replace(/\/+$/, '');
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