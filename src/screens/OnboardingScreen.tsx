import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ImageBackground,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Button } from '../components/Button';

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

// Preload images for faster display
const onboardingImages = {
  image1: require('../../assets/onboarding1.jpg'),
  image2: require('../../assets/onboarding2.jpg'),
  image3: require('../../assets/onboarding3.jpg'),
};

const onboardingData = [
  {
    id: 1,
    title: 'Ton assiette, ton pouvoir',
    subtitle: 'Suis tes repas, maîtrise tes apports et prends le contrôle.',
    image: onboardingImages.image1,
  },
  {
    id: 2,
    title: 'Chaque rep compte',
    subtitle: ' Chaque entraînement progresse vers ton objectif.',
    image: onboardingImages.image2,
  },
  {
    id: 3,
    title: 'Pas de magie, que du tracking',
    subtitle: 'La constance et les données précises font toute la différence.',
    image: onboardingImages.image3,
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Preload all onboarding images for faster display
  useEffect(() => {
    onboardingData.forEach((item) => {
      const imageSource = Image.resolveAssetSource(item.image);
      if (imageSource?.uri) {
        Image.prefetch(imageSource.uri).catch(() => {
          // Ignore prefetch errors
        });
      }
    });
  }, []);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      // Product decision: after onboarding, go directly to the main app (Boutique tab)
      navigation.replace('Home');
    }
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {onboardingData.map((item, index) => (
          <View key={item.id} style={styles.slide}>
            <ImageBackground
              source={item.image}
              style={styles.imageBackground}
              resizeMode="cover"
              imageStyle={styles.backgroundImageStyle}
            >
              <View style={styles.overlay} />
              <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <Button
          title={currentIndex === onboardingData.length - 1 ? 'Commencer' : 'Suivant'}
          onPress={handleNext}
          icon={<Text style={styles.arrow}>→</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // colors.background
  },
  slide: {
    width,
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  backgroundImageStyle: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 140, // Space for footer
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16, // theme.spacing.md
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24, // theme.spacing.lg
    paddingBottom: 32, // theme.spacing.xl
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24, // theme.spacing.lg
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#D4AF37', // colors.primary
    width: 24,
  },
  dotInactive: {
    backgroundColor: '#FFFFFF', // colors.text
    opacity: 0.3,
  },
  arrow: {
    color: '#FFFFFF', // colors.text
    fontSize: 18,
    marginLeft: 8,
  },
});

