/**
 * Apple Guideline 2.5.4: the app must not declare `UIBackgroundModes: audio`
 * because it has no persistent background-audio feature.
 *
 * The expo-video config plugin adds `audio` whenever `supportsPictureInPicture`
 * is enabled (PiP is kept for Android via android:supportsPictureInPicture).
 * This plugin strips `audio` from UIBackgroundModes; if the array ends up
 * empty, the key is removed entirely. Info.plist mods execute in REVERSE
 * plugin-array order, so this plugin must stay listed BEFORE expo-video in
 * app.json for its mod to run last and win.
 */
const { withInfoPlist } = require('expo/config-plugins');

module.exports = function withRemoveBackgroundAudio(config) {
  return withInfoPlist(config, (config) => {
    const modes = config.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      const filtered = modes.filter((mode) => mode !== 'audio');
      if (filtered.length > 0) {
        config.modResults.UIBackgroundModes = filtered;
      } else {
        delete config.modResults.UIBackgroundModes;
      }
    }
    return config;
  });
};
