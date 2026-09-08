import { BRAND_YELLOW } from '../constants/brand';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';

type HelpSupportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HelpSupport'>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: '1',
    question: "L'app remplace un médecin ?",
    answer: "Non, cette application ne remplace pas un médecin. Elle est conçue pour vous aider à suivre votre alimentation et votre activité physique. Pour tout problème de santé, consultez un professionnel de santé qualifié.",
  },
  {
    id: '2',
    question: 'Programme personnalisable ?',
    answer: "Oui, notre application offre des programmes entièrement personnalisables selon vos objectifs, votre niveau d'activité et vos préférences alimentaires. Vous pouvez ajuster votre plan à tout moment.",
  },
  {
    id: '3',
    question: "L'app est-elle gratuite ?",
    answer: "L'application propose une version gratuite avec des fonctionnalités de base. Des fonctionnalités premium sont disponibles via un abonnement pour accéder à des plans personnalisés avancés et un suivi détaillé.",
  },
  {
    id: '4',
    question: 'Connexion avec Google Fit,...?',
    answer: "Oui, l'application peut se connecter à Google Fit, Apple Health et d'autres applications de suivi de la santé pour synchroniser vos données d'activité physique et offrir une vue complète de votre santé.",
  },
  {
    id: '5',
    question: 'Comment contacter le support ?',
    answer: "Vous pouvez contacter notre équipe support via notre page de support https://diettemple.tn/support ou par email à support@diettemple.tn. Nous répondons généralement dans les 24 heures.",
  },
];

const SUPPORT_URL = 'https://diettemple.tn/support';
const SUPPORT_EMAIL = 'support@diettemple.tn';

export default function HelpSupportScreen() {
  const navigation = useNavigation<HelpSupportScreenNavigationProp>();
  const { colors } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Aide et support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact support */}
        <View style={[styles.contactCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>Contacter le support</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})}
            activeOpacity={0.7}
          >
            <View style={styles.contactIconWrap}>
              <Ionicons name="globe-outline" size={18} color="#000000" />
            </View>
            <View style={styles.contactTextWrap}>
              <Text style={[styles.contactLabel, { color: colors.text }]}>Page de support</Text>
              <Text style={[styles.contactValue, { color: colors.textSecondary }]}>diettemple.tn/support</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
            activeOpacity={0.7}
          >
            <View style={styles.contactIconWrap}>
              <Ionicons name="mail-outline" size={18} color="#000000" />
            </View>
            <View style={styles.contactTextWrap}>
              <Text style={[styles.contactLabel, { color: colors.text }]}>Email</Text>
              <Text style={[styles.contactValue, { color: colors.textSecondary }]}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {faqs.map((faq) => {
          const isExpanded = expandedItems.has(faq.id);
          return (
            <View key={faq.id} style={styles.faqContainer}>
              <TouchableOpacity
                style={[styles.faqButton, { backgroundColor: colors.cardBackground }]}
                onPress={() => toggleItem(faq.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                <View style={[styles.expandIcon, { backgroundColor: isExpanded ? BRAND_YELLOW : BRAND_YELLOW }]}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#000000"
                  />
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={[styles.faqAnswerContainer, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.answer}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  contactCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  contactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_YELLOW,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTextWrap: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  contactValue: {
    fontSize: 13,
    marginTop: 1,
  },
  faqContainer: {
    marginBottom: 16,
  },
  faqButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 56,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
  },
  expandIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqAnswerContainer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
});


