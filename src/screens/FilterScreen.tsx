import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FilterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filter</Text>
      <Text style={styles.subtitle}>Filter screen coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
  },
});


