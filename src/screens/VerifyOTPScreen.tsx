import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { colors } from '../constants/colors';
import { OTPInput } from '../components/OTPInput';
import { Button } from '../components/Button';
import { authService } from '../services/authService';

type VerifyOTPScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VerifyOTP'>;
type VerifyOTPScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOTP'>;

export default function VerifyOTPScreen() {
  const navigation = useNavigation<VerifyOTPScreenNavigationProp>();
  const route = useRoute<VerifyOTPScreenRouteProp>();
  const { emailOrPhone, isPhone } = route.params;
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) return;

    setLoading(true);
    try {
      await authService.verifyOTP({ emailOrPhone, otp });
      navigation.navigate('ResetPassword', { emailOrPhone, otp });
    } catch (err: any) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authService.forgotPassword({ emailOrPhone });
    } catch (err) {
      // Handle error
    }
  };

  const displayEmailOrPhone = isPhone
    ? `+216 ${emailOrPhone.replace(/\D/g, '').slice(-8)}`
    : emailOrPhone;

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
        <Text style={styles.title}>Réinitialiser le mot de passe</Text>
        <Text style={styles.subtitle}>
          Code envoyé à {displayEmailOrPhone}
        </Text>
      </View>

      <View style={styles.form}>
        <OTPInput length={4} onComplete={setOtp} />

        <Button
          title="Continuer"
          onPress={handleVerifyOTP}
          loading={loading}
          icon={<Text style={styles.arrow}>→</Text>}
        />

        <TouchableOpacity style={styles.resendContainer} onPress={handleResend}>
          <Text style={styles.resendText}>
            E-mail non reçu ? <Text style={styles.resendLink}>Renvoyer</Text>
          </Text>
        </TouchableOpacity>
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
  resendContainer: {
    marginTop: 24, // theme.spacing.lg
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC', // colors.textSecondary
  },
  resendLink: {
    color: '#D4AF37', // colors.primary
  },
});

