import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
    answer: "Vous pouvez contacter notre équipe support via l'email support@diettemple.com ou directement depuis l'application en utilisant la fonctionnalité de contact. Nous répondons généralement dans les 24 heures.",
  },
];

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
                <View style={[styles.expandIcon, { backgroundColor: isExpanded ? '#D4AF37' : '#D4AF37' }]}>
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


