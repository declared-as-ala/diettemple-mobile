/**
 * Expo config plugin: enable cleartext (HTTP) traffic for Android APK.
 * - Temporary fix: allows APK to connect to http://145.223.118.9:5000
 * - Recommended production fix: move backend to HTTPS (Nginx + SSL + domain),
 *   then remove usesCleartextTraffic / networkSecurityConfig and rebuild.
 * Config changes (app.json android.usesCleartextTraffic) require an APK rebuild to apply.
 */
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- Allow cleartext (HTTP) to DietTemple API - required for APK to connect to http://145.223.118.9:5000 -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">145.223.118.9</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
</network-security-config>
`;

function withAndroidManifestCleartext(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest?.application?.[0];
    if (application) {
      if (!application.$) application.$ = {};
      application.$['android:usesCleartextTraffic'] = 'true';
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return config;
  });
}

function withNetworkSecurityConfigFile(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const xmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
      const xmlPath = path.join(xmlDir, 'network_security_config.xml');
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      fs.writeFileSync(xmlPath, NETWORK_SECURITY_XML, 'utf8');
      return config;
    },
  ]);
}

module.exports = function withNetworkSecurityConfig(config) {
  config = withAndroidManifestCleartext(config);
  config = withNetworkSecurityConfigFile(config);
  return config;
};
