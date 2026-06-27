import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';

type LegalNoticesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LegalNotices'>;

export default function LegalNoticesScreen() {
  const navigation = useNavigation<LegalNoticesScreenNavigationProp>();
  const { colors } = useTheme();

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mentions légales</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Éditeur du site</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Le présent site est édité par DietTemple, société spécialisée dans les applications de suivi nutritionnel et de fitness.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Directeur de publication</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Le directeur de publication est le représentant légal de DietTemple.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Hébergement</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            L'application DietTemple est hébergée sur des serveurs sécurisés conformes aux normes de protection des données.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Protection des données personnelles</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant. Pour exercer ces droits, contactez-nous à l'adresse : privacy@diettemple.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Propriété intellectuelle</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            L'ensemble du contenu de l'application DietTemple (textes, images, logos, icônes, etc.) est la propriété exclusive de DietTemple et est protégé par les lois relatives à la propriété intellectuelle.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Limitation de responsabilité</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            L'application DietTemple est fournie "en l'état". Nous ne garantissons pas l'exactitude, l'exhaustivité ou l'actualité des informations diffusées. L'utilisation de l'application se fait sous votre seule responsabilité.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Cookies</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            L'application utilise des cookies pour améliorer votre expérience utilisateur. Vous pouvez configurer votre appareil pour refuser les cookies.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Droit applicable</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Les présentes mentions légales sont régies par le droit français. Tout litige relatif à leur interprétation et/ou à leur exécution relève des tribunaux français.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Contact</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Pour toute question concernant les présentes mentions légales, vous pouvez nous contacter à l'adresse : legal@diettemple.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionText, { color: colors.textSecondary, fontSize: 12, marginTop: 20 }]}>
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </Text>
        </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
});


