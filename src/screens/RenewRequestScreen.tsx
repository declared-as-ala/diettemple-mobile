import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';

const ACCENT = '#D4AF37';
type NavProp = StackNavigationProp<RootStackParamList, 'RenewRequest'>;

export default function RenewRequestScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Renew subscription</Text>
      </View>
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Ionicons name="refresh" size={48} color={ACCENT} />
          <Text style={[styles.title, { color: colors.text }]}>Renew your plan</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Contact your coach or admin to renew your subscription. You can also visit the website or send an email to support.
          </Text>
          <TouchableOpacity style={[styles.cta, { backgroundColor: ACCENT }]} onPress={() => navigation.goBack()}>
            <Text style={styles.ctaText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  body: { fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  cta: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#000' },
});
