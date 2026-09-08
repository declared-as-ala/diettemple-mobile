#!/usr/bin/env node
/**
 * Fails the build if any forbidden broad photo/video permission is present in the
 * FINAL merged Android manifest and/or the packaged release artifact (APK/AAB).
 *
 * Google Play rejected DietTemple on 2026-07-30 for requesting READ_MEDIA_IMAGES /
 * READ_MEDIA_VIDEO. This script is the guard requested to prevent that from ever
 * silently reappearing (e.g. via a new dependency's own AndroidManifest.xml being
 * merged in by Gradle) without failing CI.
 *
 * Requires a JDK + Android SDK (aapt2, from the Android build-tools) on PATH, or
 * `bundletool` for .aab inspection. This repo's sandbox had neither installed, so
 * this script has been written but not executed here — run it after `./gradlew
 * :app:processReleaseMainManifest` (or `assembleRelease` / `bundleRelease`) as part
 * of CI, before uploading to Play Console.
 *
 * Usage:
 *   node scripts/verify-manifest-permissions.js                 # auto-discovers the
 *                                                                # merged manifest under
 *                                                                # android/app/build/intermediates
 *   node scripts/verify-manifest-permissions.js path/to/AndroidManifest.xml
 *   node scripts/verify-manifest-permissions.js path/to/app-release.aab
 *   node scripts/verify-manifest-permissions.js path/to/app-release.apk
 *
 * Exit code 0  = clean (no forbidden permission found)
 * Exit code 1  = forbidden permission found, or nothing to check could be located
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FORBIDDEN_PERMISSIONS = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

const ROOT = path.resolve(__dirname, '..');

function findMergedManifestCandidates() {
  const base = path.join(ROOT, 'android', 'app', 'build', 'intermediates');
  if (!fs.existsSync(base)) return [];
  const found = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name === 'AndroidManifest.xml' &&
        /merged_manifest/i.test(full) &&
        /release/i.test(full)
      ) {
        found.push(full);
      }
    }
  })(base);
  return found;
}

function checkXmlManifestText(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const present = FORBIDDEN_PERMISSIONS.filter((p) => {
    // Match an active <uses-permission android:name="..."/> that is NOT itself a
    // tools:node="remove" directive (a remove directive mentioning the name is fine).
    const re = new RegExp(
      `<uses-permission[^>]*android:name="${p.replace('.', '\\.')}"[^>]*/?>`,
      'g'
    );
    const matches = xml.match(re) || [];
    return matches.some((m) => !/tools:node="remove"/.test(m));
  });
  return present;
}

function checkPackagedArtifact(filePath) {
  const isAab = filePath.endsWith('.aab');
  const isApk = filePath.endsWith('.apk');
  if (!isAab && !isApk) {
    throw new Error(`Unsupported artifact extension: ${filePath}`);
  }
  let output;
  if (isAab) {
    // Requires bundletool (https://github.com/google/bundletool) on PATH.
    output = execFileSync('bundletool', ['dump', 'manifest', '--bundle', filePath], {
      encoding: 'utf8',
    });
  } else {
    // Requires aapt2 (Android SDK build-tools) on PATH.
    output = execFileSync('aapt2', ['dump', 'permissions', filePath], { encoding: 'utf8' });
  }
  return FORBIDDEN_PERMISSIONS.filter((p) => output.includes(p));
}

function main() {
  const arg = process.argv[2];
  let violations;
  let checkedPath;

  if (arg && (arg.endsWith('.aab') || arg.endsWith('.apk'))) {
    checkedPath = arg;
    violations = checkPackagedArtifact(arg);
  } else if (arg) {
    checkedPath = arg;
    violations = checkXmlManifestText(arg);
  } else {
    const candidates = findMergedManifestCandidates();
    if (candidates.length === 0) {
      console.error(
        '[verify-manifest-permissions] No merged manifest found under android/app/build/intermediates.\n' +
          'Run `cd android && ./gradlew.bat :app:processReleaseMainManifest` (Windows) or\n' +
          '`./gradlew :app:processReleaseMainManifest` first, or pass an explicit path\n' +
          '(merged manifest XML, .aab, or .apk) as an argument.'
      );
      process.exit(1);
    }
    checkedPath = candidates[0];
    violations = checkXmlManifestText(checkedPath);
    if (candidates.length > 1) {
      console.warn(
        `[verify-manifest-permissions] Multiple candidates found, checked the first: ${checkedPath}\n` +
          `Others: ${candidates.slice(1).join(', ')}`
      );
    }
  }

  console.log(`[verify-manifest-permissions] Checked: ${checkedPath}`);
  if (violations.length > 0) {
    console.error('[verify-manifest-permissions] FAILED — forbidden permission(s) present:');
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log('[verify-manifest-permissions] OK — none of the forbidden permissions are present.');
  process.exit(0);
}

main();
