import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService } from '../services/authService';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ForgotPassword'
>;

const forgotPasswordSchema = z.object({
  emailOrPhone: z.string().min(1, 'Ce champ est requis'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
const ACCENT = '#D4AF37';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      emailOrPhone: '',
    },
  });

  const emailOrPhone = watch('emailOrPhone');

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setLoading(true);

    try {
      await authService.forgotPassword(data);
      const isPhone = /^[\d\s\+\-]+$/.test(data.emailOrPhone);
      navigation.navigate('VerifyOTP', {
        emailOrPhone: data.emailOrPhone,
        isPhone,
      });
    } catch (err: any) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ImageBackground source={require('../../assets/login.jpg')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(0,0,0,0.84)', 'rgba(10,7,2,0.90)', 'rgba(0,0,0,0.95)']} style={styles.container}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingTop: Math.max(14, insets.top + 4), paddingBottom: Math.max(14, insets.bottom + 10) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.header}>
              <Image source={require('../../assets/logo-uh.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.brandName}>DIET TEMPLE</Text>
              <Text style={styles.title}>Mot de passe oublié ?</Text>
              <Text style={styles.subtitle}>
                Nous allons vous envoyer les instructions de réinitialisation.
              </Text>
            </View>

            <View style={styles.card}>
              <LinearGradient
                colors={[ACCENT, 'rgba(212,175,55,0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardTopAccent}
              />
              <View style={styles.form}>
                <Input
                  label="Adresse e-mail / Numéro de téléphone"
                  value={emailOrPhone}
                  onChangeText={(text) => {
                    setValue('emailOrPhone', text);
                    trigger('emailOrPhone');
                  }}
                  placeholder="Entrez votre adresse ou numéro..."
                  keyboardType="default"
                  autoCapitalize="none"
                  error={errors.emailOrPhone?.message}
                  leftIcon={<Ionicons name="mail-outline" size={18} color={ACCENT} />}
                />

                <Button
                  title="Réinitialiser"
                  onPress={handleSubmit(handleForgotPassword)}
                  loading={loading}
                  icon={<Ionicons name="arrow-forward" size={20} color="#000" />}
                />
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    padding: 2,
  },
  header: {
    marginBottom: 12,
    alignItems: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F2D37A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 18,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(16,12,7,0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 0,
    overflow: 'hidden',
  },
  cardTopAccent: {
    height: 2,
    marginBottom: 16,
    borderRadius: 2,
  },
  form: {
    marginTop: 4,
  },
});

