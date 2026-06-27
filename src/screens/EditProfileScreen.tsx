import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useProfileStore } from '../store/profileStore';
import AppLoader from '../components/AppLoader';
import { useSnackbar } from '../components/Snackbar';

type EditProfileScreenRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;
type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const route = useRoute<EditProfileScreenRouteProp>();
  const { colors } = useTheme();
  const { updateProfile } = useProfileStore();
  const { showSnackbar } = useSnackbar();
  const { field, currentValue } = route.params || {};

  const normalizeSexeForUi = (raw?: string) => {
    const v = String(raw || '').trim().toLowerCase();
    if (v === 'm' || v === 'homme') return 'Homme';
    if (v === 'f' || v === 'femme') return 'Femme';
    return '';
  };

  const [value, setValue] = useState(
    field === 'sexe' ? normalizeSexeForUi(currentValue) : (currentValue || '')
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      showSnackbar({
        message: 'Veuillez entrer une valeur.',
        duration: 2200,
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile store (this will also sync with backend)
      await updateProfile({ [field!]: value });
      
      setLoading(false);
      showSnackbar({
        message: `${getFieldLabel()} mis à jour avec succès`,
        duration: 1800,
      });
      navigation.goBack();
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || 'Impossible de mettre à jour le profil';
      showSnackbar({
        message: errorMessage,
        duration: 2600,
      });
    }
  };

  const getFieldLabel = () => {
    switch (field) {
      case 'name':
        return 'Nom';
      case 'age':
        return 'Âge (ans)';
      case 'sexe':
        return 'Sexe';
      case 'poids':
        return 'Poids (Kg)';
      case 'taille':
        return 'Taille (Cm)';
      case 'objectif':
        return 'Objectif';
      default:
        return field || 'Valeur';
    }
  };

  const getInputType = () => {
    if (field === 'age' || field === 'poids' || field === 'taille') {
      return 'numeric';
    }
    return 'default';
  };

  const getPlaceholder = () => {
    switch (field) {
      case 'name':
        return 'Entrez votre nom';
      case 'age':
        return '20';
      case 'sexe':
        return 'Homme ou Femme';
      case 'poids':
        return '80';
      case 'taille':
        return '174';
      case 'objectif':
        return 'Maigrir, Prendre du poids, etc.';
      default:
        return 'Entrez la valeur';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Modifier {getFieldLabel()}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{getFieldLabel()}</Text>
          {field === 'name' ? (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={value}
              onChangeText={setValue}
              placeholder={getPlaceholder()}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />
          ) : field === 'sexe' ? (
            <View style={styles.sexeButtons}>
              <TouchableOpacity
                style={[
                  styles.sexeButton,
                  { 
                    backgroundColor: value === 'Homme' ? colors.primary : colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setValue('Homme')}
              >
                <Text style={[styles.sexeButtonText, { color: value === 'Homme' ? '#FFFFFF' : colors.text }]}>
                  Homme
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sexeButton,
                  { 
                    backgroundColor: value === 'Femme' ? colors.primary : colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setValue('Femme')}
              >
                <Text style={[styles.sexeButtonText, { color: value === 'Femme' ? '#FFFFFF' : colors.text }]}>
                  Femme
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={value}
              onChangeText={setValue}
              placeholder={getPlaceholder()}
              placeholderTextColor={colors.textSecondary}
              keyboardType={getInputType() === 'numeric' ? 'numeric' : 'default'}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <AppLoader variant="button" size="sm" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
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
  inputContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  sexeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sexeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  sexeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

