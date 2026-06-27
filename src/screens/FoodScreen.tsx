import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { Button } from '../components/Button';
import { RootStackParamList } from '../types';

type FoodScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function FoodScreen() {
  const navigation = useNavigation<FoodScreenNavigationProp>();
  const { token } = useAuthStore();
  const { isDarkMode, colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Conditional rendering: Show login button if not authenticated
  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={styles.center}>
          <Text style={[styles.loginMessage, { color: colors.text }]}>
            Vous devez être connecté
          </Text>
          <Button
            title="Se connecter"
            onPress={() => navigation.navigate('Login' as never)}
          />
        </View>
      </View>
    );
  }

  const onRefresh = async () => {
    // Guard: Prevent API calls if not authenticated
    const { token: currentToken } = useAuthStore.getState();
    if (!currentToken) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    // Add refresh logic here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
          />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>Food</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Food screen coming soon</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loginMessage: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
});

