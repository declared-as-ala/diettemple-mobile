import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startupSteps } from '../utils/startupLogger';

const THEME_STORAGE_KEY = 'themeMode';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  mutedText: string;
  border: string;
  primary: string;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ACCENT_GOLD = '#D4AF37';

const darkColors: ThemeColors = {
  background: '#000000',
  cardBackground: '#111111',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  mutedText: '#9CA3AF',
  border: '#1F1F1F',
  primary: ACCENT_GOLD,
};

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  cardBackground: '#F6F7F9',
  text: '#0B0B0B',
  textSecondary: '#6B7280',
  mutedText: '#6B7280',
  border: '#E5E7EB',
  primary: ACCENT_GOLD,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      startupSteps.theme();
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!cancelled && (saved === 'dark' || saved === 'light')) {
          setThemeModeState(saved);
        }
      } catch {
        // keep default — never crash
      }
      if (!cancelled) startupSteps.themeDone();
    })();
    return () => { cancelled = true; };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to persist theme', e);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeModeState(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {
      console.warn('Failed to persist theme', e);
    }
  }, [themeMode]);

  const isDarkMode = themeMode === 'dark';
  const colors = isDarkMode ? darkColors : lightColors;

  const value: ThemeContextType = {
    themeMode,
    isDarkMode,
    setThemeMode,
    toggleTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
