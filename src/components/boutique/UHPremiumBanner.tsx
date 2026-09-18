import React, { useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

// Exact aspect ratio of uh_photos.png (1381 x 1139)
const IMAGE_WIDTH = 1381;
const IMAGE_HEIGHT = 1139;
const ASPECT_RATIO = IMAGE_WIDTH / IMAGE_HEIGHT;

export default function UHPremiumBanner({ onPress, style }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Compute exact pixel dimensions so Android/iOS never overflow
  const flatStyle = StyleSheet.flatten(style);
  const marginH =
    flatStyle?.marginHorizontal !== undefined
      ? Number(flatStyle.marginHorizontal)
      : 16;
  const bannerWidth = Math.max(260, screenWidth - marginH * 2);
  const bannerHeight = Math.round(bannerWidth / ASPECT_RATIO);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <Animated.View
      style={[
        s.wrapper,
        {
          width: bannerWidth,
          height: bannerHeight,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[s.pressable, { width: bannerWidth, height: bannerHeight }]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="The Ultimate Human : Path. Découvrir UH"
      >
        <Image
          source={require('../../../assets/uh_photos.png')}
          style={{
            width: bannerWidth,
            height: bannerHeight,
            borderRadius: 20,
          }}
          resizeMode="cover"
        />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: '#060504',
  },
  pressable: {
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
