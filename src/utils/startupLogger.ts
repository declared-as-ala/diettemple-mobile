/**
 * Startup step logging for release debugging.
 * Logs each step so logcat/crash reports show where startup failed.
 */
const PREFIX = '[DietTemple]';

export const startupLog = (step: string, detail?: string) => {
  const msg = detail ? `${step} ${detail}` : step;
  if (__DEV__) {
    console.log(PREFIX, msg);
  } else {
    // In release, still log so adb logcat can capture
    console.log(PREFIX, msg);
  }
};

export const startupSteps = {
  appBoot: () => startupLog('0_appBoot', 'start'),
  bootstrap: () => startupLog('1_bootstrap', 'start'),
  appLoad: () => startupLog('2_appLoad', 'start'),
  appRender: () => startupLog('3_appRender', 'start'),
  hydrateToken: () => startupLog('4_hydrateToken', 'start'),
  hydrateTokenDone: (hasToken: boolean) => startupLog('4_hydrateToken', `done hasToken=${hasToken}`),
  hydrateTheme: () => startupLog('5_hydrateTheme', 'start'),
  hydrateThemeDone: () => startupLog('5_hydrateTheme', 'done'),
  subscriptionBoot: () => startupLog('6_subscriptionBoot', 'start'),
  subscriptionBootDone: () => startupLog('6_subscriptionBoot', 'done'),
  loadProfile: () => startupLog('7_loadProfile', 'start'),
  loadProfileDone: () => startupLog('7_loadProfile', 'done'),
  loadNutrition: () => startupLog('8_loadNutrition', 'start'),
  loadNutritionDone: () => startupLog('8_loadNutrition', 'done'),
  renderHome: () => startupLog('9_renderHome', 'start'),
  renderHomeDone: () => startupLog('9_renderHome', 'done'),
  // Aliases for existing call sites
  hydrateAuth: () => startupLog('4_hydrateToken', 'start'),
  hydrateAuthDone: (hasToken: boolean) => startupLog('4_hydrateToken', `done hasToken=${hasToken}`),
  theme: () => startupLog('5_hydrateTheme', 'start'),
  themeDone: () => startupLog('5_hydrateTheme', 'done'),
  profileFetch: () => startupLog('7_loadProfile', 'start'),
  profileFetchDone: () => startupLog('7_loadProfile', 'done'),
  nutritionFetch: () => startupLog('8_loadNutrition', 'start'),
  nutritionFetchDone: () => startupLog('8_loadNutrition', 'done'),
};
