/**
 * Account deletion (Apple Guideline 5.1.1(v)): explains consequences, requires
 * password confirmation + explicit confirm dialog, calls DELETE /me/account,
 * then clears local storage and returns to Login.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { meService } from '../services/meService';
import { useAuthStore } from '../store/authStore';
import { clearAllAppStorage } from '../utils/clearStorage';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import AppLoader from '../components/AppLoader';
import { useSnackbar } from '../components/Snackbar';

type DeleteAccountScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DeleteAccount'>;

const DANGER = '#EF5350';

const CONSEQUENCES = [
  'Votre profil et vos informations personnelles seront supprimés.',
  'Votre abonnement et votre plan d’entraînement seront supprimés.',
  'Votre historique de nutrition, d’entraînement et de progression sera supprimé.',
  'Vos favoris, photos de progression et données de présence en salle seront supprimés.',
  'Cette action est définitive et ne peut pas être annulée.',
];

export default function DeleteAccountScreen() {
  const navigation = useNavigation<DeleteAccountScreenNavigationProp>();
  const { colors } = useTheme();
  const { showSnackbar } = useSnackbar();
  const logout = useAuthStore((s) => s.logout);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const performDeletion = async () => {
    setLoading(true);
    try {
      await meService.deleteAccount(password);
      await clearAllAppStorage();
      await logout();
      showSnackbar({ message: 'Votre compte a été supprimé.', duration: 2600 });
      if (rootNavigationRef.isReady()) {
        rootNavigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (error: any) {
      setLoading(false);
      const message =
        error.response?.data?.message || 'Impossible de supprimer le compte. Réessayez plus tard.';
      showSnackbar({ message, duration: 3000 });
    }
  };

  const handleDelete = () => {
    if (!password) {
      showSnackbar({ message: 'Veuillez saisir votre mot de passe.', duration: 2400 });
      return;
    }
    Alert.alert(
      'Supprimer définitivement ?',
      'Votre compte et toutes vos données seront supprimés définitivement. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: performDeletion },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Supprimer le compte</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.warningCard, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="warning-outline" size={32} color={DANGER} />
          <Text style={[styles.warningTitle, { color: colors.text }]}>
            Cette action est irréversible
          </Text>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            La suppression de votre compte entraîne :
          </Text>
          {CONSEQUENCES.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: DANGER }]}>{'•'}</Text>
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Confirmez avec votre mot de passe
          </Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, loading && { opacity: 0.6 }]}
          onPress={handleDelete}
          disabled={loading}
        >
          {loading ? (
            <AppLoader variant="button" size="sm" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Supprimer définitivement mon compte</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  warningCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.4)',
    alignItems: 'flex-start',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 14,
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 12,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DANGER,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
