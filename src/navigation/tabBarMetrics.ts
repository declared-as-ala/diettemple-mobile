import { Platform } from 'react-native';

/**
 * Extra bottom padding for scroll content on tab screens whose navigator uses a
 * floating tab bar (`position: 'absolute'` in AuthenticatedTabNavigator).
 * Keeps primary actions above the bar; tweak if tabBarStyle height/margins change.
 */
export const TAB_BAR_OVERLAY_PADDING = Platform.select({
  ios: 112,
  default: 100,
}) as number;
