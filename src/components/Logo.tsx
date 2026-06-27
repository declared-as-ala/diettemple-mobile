import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'large', 
  showText = true 
}) => {
  const iconSize = size === 'small' ? 40 : size === 'medium' ? 60 : 80;
  const textSize = size === 'small' ? 20 : size === 'medium' ? 24 : 32;

  return (
    <View style={styles.container}>
      {/* Temple/Pagoda Icon - Multi-tiered design */}
      <View style={[styles.templeIcon, { width: iconSize, height: iconSize, marginBottom: showText ? 16 : 0 }]}>
        {/* Top pointed tier */}
        <View style={[styles.tier, { 
          width: iconSize * 0.2, 
          height: iconSize * 0.12,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        }]} />
        {/* Second tier */}
        <View style={[styles.tier, { 
          width: iconSize * 0.35, 
          height: iconSize * 0.15,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        }]} />
        {/* Third tier */}
        <View style={[styles.tier, { 
          width: iconSize * 0.5, 
          height: iconSize * 0.18,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }]} />
        {/* Fourth tier */}
        <View style={[styles.tier, { 
          width: iconSize * 0.65, 
          height: iconSize * 0.2,
          borderTopLeftRadius: 5,
          borderTopRightRadius: 5,
        }]} />
        {/* Base tier */}
        <View style={[styles.tier, { 
          width: iconSize, 
          height: iconSize * 0.25,
          borderRadius: 6,
        }]} />
      </View>

      {/* Text Logo */}
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.dietText, { fontSize: textSize }]}>Diet</Text>
          <Text style={[styles.templeText, { fontSize: textSize }]}>Temple</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  templeIcon: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tier: {
    backgroundColor: '#D4AF37', // Lime green
    marginBottom: 1,
    alignSelf: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dietText: {
    fontWeight: '700',
    color: '#D4AF37', // Lime green
  },
  templeText: {
    fontWeight: '700',
    color: '#FFFFFF', // White
  },
});

