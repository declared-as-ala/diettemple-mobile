# Build APK (DietTemple Mobile)

## Rebuild required after config changes

**You must rebuild the APK after changing:**

- `app.json` (e.g. `android.usesCleartextTraffic`, `android.package`)
- Any Expo config plugin (e.g. `plugins/withNetworkSecurityConfig.js`)
- Native Android files (manifest, network security config)

Config and native changes are applied at **build time**. They do **not** apply to an APK that was already built. Install a new APK from a fresh build to get the updated behaviour.

## Build commands

```bash
# Production APK (EAS)
eas build --platform android --profile production

# Local release build
npx expo run:android --variant release
```

## Current API

- Backend URL: `http://145.223.118.9:5000` (see `src/config/api.config.ts`)
- Android uses cleartext (HTTP) so the APK can connect to this URL. For production, moving the backend to HTTPS (Nginx + SSL + domain) is recommended.
