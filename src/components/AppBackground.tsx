/**
 * Global background for all app screens: one image + dark overlay + safe area.
 * Use as root wrapper so content stays readable. Does not break scroll performance.
 */
import React from 'react';
import { View, ImageBackground, StyleSheet, ViewStyle, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OVERLAY_OPACITY = 0.55;
const DEFAULT_BG = require('../../assets/background.png');

export interface AppBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** If true, add padding from safe area (top/bottom/left/right). Default true. */
  useSafeArea?: boolean;
  /** Custom background image. Default: background.png */
  source?: ImageSourcePropType;
}

export default function AppBackground({ children, style, useSafeArea = true, source }: AppBackgroundProps) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={source ?? DEFAULT_BG}
      style={[styles.background, style]}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${OVERLAY_OPACITY})` }]} />
      <View
        style={[
          styles.content,
          useSafeArea && {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
});
