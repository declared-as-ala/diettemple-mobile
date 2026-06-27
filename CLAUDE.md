# DietTemple Mobile — context for Claude

## Overview

**Expo** (SDK ~54) **React Native** app for DietTemple: workouts, nutrition, shop, profile, etc. Uses **React Navigation** (stack, drawer, tabs), **axios** for API calls.

## API configuration

- **`src/config/api.config.ts`**
  - `API_HOST` — base host (e.g. `https://next.protein.tn`)
  - `getApiBaseUrl()` → `${API_HOST}/api`
  - `resolveVideoUrl` / `resolveMediaUrl` — prepend base for relative `/media/...` paths

**Change the backend URL here** and rebuild the native app (EAS or `expo run:android`) — JS bundle changes alone may not update native config if you change plugins.

## HTTP client

- **`src/services/api.ts`** — shared axios instance with:
  - Base URL from `getApiBaseUrl()`
  - Interceptors: attach **Bearer token** from `getAuthToken()` (except public endpoints list)
  - French error messages for common failures

## Auth storage

- **`src/utils/authStorage`** (or equivalent) — token persistence via **expo-secure-store** / AsyncStorage as implemented in the project.

## Android / cleartext

- If the API was **HTTP only**, the project used **cleartext traffic** and network security config (see `app.json`, `plugins/withNetworkSecurityConfig.js`, `APK_BUILD.md`).
- With **HTTPS** production API, cleartext can be removed in a future release.

## Workout video (expo-video) and Picture-in-Picture

- **Expo Go** does not apply `app.json` native changes for PiP. Test PiP with an **EAS development build** or **internal/production** build (`eas build`), not the store Expo Go client.
- **`expo-video`** plugin in `app.json` sets `supportsPictureInPicture` / background playback flags; reels use `SessionReelsScreen` + `ReelsVideoPlayer`.
- In-progress reels state can be resumed via **`activeWorkoutPersistStore`** and the **`WorkoutResumeBar`** on the root stack when a snapshot exists.

## Scripts

- `npm start` / `expo start`
- `npm run android` / `expo run:android`
- `eas build` for production APK (see `APK_BUILD.md`)

## Conventions for edits

- Import API base from **`../config/api.config`** (or project alias), not hardcoded IPs.
- After changing API host or native config, document **rebuild required** for testers.

---

*Generated for DietTemple Mobile — update when Expo SDK or API contract changes.*
