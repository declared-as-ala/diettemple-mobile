/**
 * Recipes (Recette) screen – MVP placeholder.
 * Sections: Breakfast / Lunch / Dinner / Snacks with "Coming soon" and View meal plan CTA.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { useTheme } from '../context/ThemeContext';

const ACCENT = '#D4AF37';

const SECTIONS = [
  { key: 'breakfast', title: 'Breakfast', icon: 'sunny-outline' as const },
  { key: 'lunch', title: 'Lunch', icon: 'restaurant-outline' as const },
  { key: 'dinner', title: 'Dinner', icon: 'moon-outline' as const },
  { key: 'snacks', title: 'Snacks', icon: 'nutrition-outline' as const },
];

export default function RecipesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { openDrawer } = useDrawerOpen();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recettes</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Meal ideas by category</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.key} style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={24} color={ACCENT} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.comingSoon, { color: colors.textSecondary }]}>Coming soon</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Recipes for this category will appear here. Check back after an update.
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: ACCENT }]}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={22} color="#000" />
          <Text style={styles.ctaText}>View meal plan</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  menuBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSub: { fontSize: 14, marginTop: 4 },
  scroll: { padding: 20, paddingBottom: 100 },
  section: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  comingSoon: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  sectionDesc: { fontSize: 13 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#000' },
});
