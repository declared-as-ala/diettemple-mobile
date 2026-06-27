import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RootStackParamList } from '../types';
import { colors } from '../constants/colors';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService } from '../services/authService';
import { useSnackbar } from '../components/Snackbar';

type ResetPasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ResetPassword'
>;
type ResetPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Un minimum de 8 caractères est requis'),
    confirmPassword: z.string().min(1, 'Veuillez confirmer votre mot de passe'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mots de passe différents',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const { showSnackbar } = useSnackbar();
  const { emailOrPhone, otp } = route.params;
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setLoading(true);

    try {
      await authService.resetPassword({
        emailOrPhone,
        otp,
        ...data,
      });

      showSnackbar({
        message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
        duration: 2600,
        action: {
          label: 'Connexion',
          onPress: () => navigation.navigate('Login'),
        },
      });
    } catch (err: any) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>
          Un minimum de 8 caractères est requis.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Nouveau mot de passe"
          value={newPassword}
          onChangeText={(text) => {
            setValue('newPassword', text);
            trigger('newPassword');
          }}
          placeholder="Entrez votre nouveau mot de passe"
          secureTextEntry
          error={errors.newPassword?.message}
        />

        <Input
          label="Confirmer mot de passe"
          value={confirmPassword}
          onChangeText={(text) => {
            setValue('confirmPassword', text);
            trigger('confirmPassword');
          }}
          placeholder="Confirmez votre nouveau mot de passe"
          secureTextEntry
          error={errors.confirmPassword?.message}
        />

        <Button
          title="Réinitialiser"
          onPress={handleSubmit(handleResetPassword)}
          loading={loading}
          icon={<Text style={styles.arrow}>→</Text>}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // colors.background
  },
  contentContainer: {
    paddingHorizontal: 24, // theme.spacing.lg
    paddingTop: 60,
    paddingBottom: 32, // theme.spacing.xl
  },
  backButton: {
    marginBottom: 24, // theme.spacing.lg
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF', // colors.text
  },
  header: {
    marginBottom: 32, // theme.spacing.xl
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8, // theme.spacing.sm
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    lineHeight: 20,
  },
  form: {
    marginTop: 24, // theme.spacing.lg
  },
  arrow: {
    color: '#FFFFFF', // colors.text
    fontSize: 18,
    marginLeft: 8,
  },
});

