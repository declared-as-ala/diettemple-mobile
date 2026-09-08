import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { BRAND_YELLOW } from '../constants/brand';
import AppLoader from '../components/AppLoader';
import { useSnackbar } from '../components/Snackbar';

type EditProfileScreenRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;
type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

const GOLD = BRAND_YELLOW;
const CARD_BG = '#161616';
const INPUT_BG = '#1E1E1E';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';
const GOLD_BORDER = 'rgba(212, 175, 55, 0.35)';

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const route = useRoute<EditProfileScreenRouteProp>();
  const { user } = useAuthStore();
  const { profile, updateProfile } = useProfileStore();
  const { showSnackbar } = useSnackbar();

  // Initial values from store or user
  const [name, setName] = useState(profile.name || user?.name || '');
  const [email, setEmail] = useState(profile.email || user?.email || '');
  const [address, setAddress] = useState(() => {
    if (profile.address) return profile.address;
    const rawAddr = (user as any)?.address;
    if (typeof rawAddr === 'string') return rawAddr;
    if (rawAddr?.line1 || rawAddr?.city) {
      return [rawAddr.line1, rawAddr.city, rawAddr.country].filter(Boolean).join(', ');
    }
    return '';
  });
  const [taille, setTaille] = useState(profile.taille || (user as any)?.taille || '174');
  const [poids, setPoids] = useState(profile.poids || (user as any)?.poids || '80');
  const [age, setAge] = useState(profile.age || (user as any)?.age || '20');
  const [sexe, setSexe] = useState(() => {
    const raw = String(profile.sexe || (user as any)?.sexe || 'Homme').trim().toLowerCase();
    return raw === 'f' || raw === 'femme' ? 'Femme' : 'Homme';
  });

  // Password fields
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      showSnackbar({ message: 'Veuillez renseigner votre nom.', duration: 2200 });
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showSnackbar({ message: 'Veuillez saisir une adresse email valide.', duration: 2400 });
        return;
      }
    }

    // Password validation if attempting to change
    if (showPasswordSection && (currentPassword || newPassword || confirmPassword)) {
      if (!currentPassword) {
        showSnackbar({ message: 'Veuillez saisir votre mot de passe actuel.', duration: 2400 });
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        showSnackbar({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.', duration: 2600 });
        return;
      }
      if (newPassword !== confirmPassword) {
        showSnackbar({ message: 'Les nouveaux mots de passe ne correspondent pas.', duration: 2600 });
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        taille: taille.trim(),
        poids: poids.trim(),
        age: age.trim(),
        sexe,
      };

      if (showPasswordSection && newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      await updateProfile(payload);
      setLoading(false);
      showSnackbar({ message: 'Profil mis à jour avec succès !', duration: 2200 });
      navigation.goBack();
    } catch (error: any) {
      setLoading(false);
      const msg = error.response?.data?.message || error.message || 'Impossible de mettre à jour le profil.';
      showSnackbar({ message: msg, duration: 3000 });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Section 1: Informations personnelles ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={16} color={GOLD} />
          <Text style={styles.sectionTitle}>INFORMATIONS PERSONNELLES</Text>
        </View>

        <View style={styles.card}>
          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Votre nom complet"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="exemple@domaine.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Adresse */}
          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.label}>Adresse / Ville</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Ex: Tunis, Ariana, Sousse..."
                placeholderTextColor="rgba(255,255,255,0.25)"
              />
            </View>
          </View>
        </View>

        {/* ── Section 2: Données physiques ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="barbell-outline" size={16} color={GOLD} />
          <Text style={styles.sectionTitle}>MENSURATIONS & CORPS</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowTwo}>
            {/* Taille */}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Taille (cm)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="resize-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={taille}
                  onChangeText={setTaille}
                  placeholder="174"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Poids */}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Poids (kg)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="speedometer-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={poids}
                  onChangeText={setPoids}
                  placeholder="80"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={[styles.rowTwo, { marginBottom: 0 }]}>
            {/* Âge */}
            <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.label}>Âge (ans)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="20"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Sexe */}
            <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.label}>Sexe</Text>
              <View style={styles.sexeToggleRow}>
                <TouchableOpacity
                  style={[styles.sexeBtn, sexe === 'Homme' && styles.sexeBtnActive]}
                  onPress={() => setSexe('Homme')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sexeBtnText, sexe === 'Homme' && styles.sexeBtnTextActive]}>
                    Homme
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sexeBtn, sexe === 'Femme' && styles.sexeBtnActive]}
                  onPress={() => setSexe('Femme')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sexeBtnText, sexe === 'Femme' && styles.sexeBtnTextActive]}>
                    Femme
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ── Section 3: Mot de passe ── */}
        <TouchableOpacity
          style={styles.passwordToggleHeader}
          onPress={() => setShowPasswordSection(!showPasswordSection)}
          activeOpacity={0.8}
        >
          <View style={styles.sectionHeaderNoMargin}>
            <Ionicons name="lock-closed-outline" size={16} color={GOLD} />
            <Text style={styles.sectionTitle}>CHANGER LE MOT DE PASSE</Text>
          </View>
          <Ionicons
            name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="rgba(255,255,255,0.4)"
          />
        </TouchableOpacity>

        {showPasswordSection && (
          <View style={styles.card}>
            <Text style={styles.passwordHint}>
              Remplissez ces champs uniquement si vous souhaitez modifier votre mot de passe de connexion.
            </Text>

            {/* Mot de passe actuel */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe actuel</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Votre mot de passe actuel"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showCurrentPass}
                />
                <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)} style={styles.eyeBtn}>
                  <Ionicons name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nouveau mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showNewPass}
                />
                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmer le mot de passe */}
            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="checkmark-done-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Répétez le nouveau mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showConfirmPass}
                />
                <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[styles.saveButtonWrap, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[GOLD, '#B38F26']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {loading ? (
              <AppLoader variant="button" size="sm" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#000000" />
                <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionHeaderNoMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sexeToggleRow: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 4,
    gap: 4,
  },
  sexeBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexeBtnActive: {
    backgroundColor: GOLD,
  },
  sexeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  sexeBtnTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  passwordToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 12,
  },
  passwordHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 14,
    lineHeight: 16,
  },
  saveButtonWrap: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.3,
  },
});
