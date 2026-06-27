import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useCartStore } from '../store/cartStore';
import { useOrdersStore } from '../store/ordersStore';
import { checkoutService } from '../services/checkoutService';
import AppLoader from '../components/AppLoader';

type DeliveryAddressScreenRouteProp = RouteProp<RootStackParamList, 'DeliveryAddress'>;
type DeliveryAddressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DeliveryAddress'>;

interface FormData {
  fullName: string;
  street: string;
  city: string;
  delegation: string;
  phone: string;
  email: string;
}

interface FormErrors {
  fullName?: string;
  street?: string;
  city?: string;
  delegation?: string;
  phone?: string;
  email?: string;
}

export default function DeliveryAddressScreen() {
  const navigation = useNavigation<DeliveryAddressScreenNavigationProp>();
  const route = useRoute<DeliveryAddressScreenRouteProp>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { promoCode } = route.params;
  const { items, clearCart } = useCartStore();

  const [formData, setFormData] = useState<FormData>({
    fullName: profile.name || user?.name || '',
    street: '',
    city: '',
    delegation: '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nom et prénom requis';
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Adresse requise';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Ville requise';
    }

    if (!formData.delegation.trim()) {
      newErrors.delegation = 'Délégation requise';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Téléphone requis';
    } else if (!/^(\+216|00216)?[0-9]{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (!items.length) {
        Alert.alert('Panier vide', 'Votre panier est vide.');
        return;
      }

      const order = await checkoutService.createOrder({
        items: items.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          fullName: formData.fullName.trim(),
          street: formData.street.trim(),
          city: formData.city.trim(),
          delegation: formData.delegation.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        },
        promoCode,
      });

      useOrdersStore.getState().setLastOrder(order);
      await clearCart();
      navigation.replace('PaymentSuccess', {
        orderId: order._id,
        order,
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de créer la commande');
    } finally {
      setLoading(false);
    }
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Adresse de livraison</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Adresse de livraison</Text>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Nom et prénom <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: errors.fullName ? '#FF0000' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Maher ladhari"
            placeholderTextColor={colors.textSecondary}
            value={formData.fullName}
            onChangeText={(text) => {
              setFormData({ ...formData, fullName: text });
              if (errors.fullName) setErrors({ ...errors, fullName: undefined });
            }}
          />
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

        {/* Street Address */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Adresse <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: errors.street ? '#FF0000' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Entrez votre adresse"
            placeholderTextColor={colors.textSecondary}
            value={formData.street}
            onChangeText={(text) => {
              setFormData({ ...formData, street: text });
              if (errors.street) setErrors({ ...errors, street: undefined });
            }}
            multiline
          />
          {errors.street && (
            <Text style={styles.errorText}>{errors.street}</Text>
          )}
        </View>

        {/* City */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Ville <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: errors.city ? '#FF0000' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Entrez votre ville Ex: Sousse"
            placeholderTextColor={colors.textSecondary}
            value={formData.city}
            onChangeText={(text) => {
              setFormData({ ...formData, city: text });
              if (errors.city) setErrors({ ...errors, city: undefined });
            }}
          />
          {errors.city && (
            <Text style={styles.errorText}>{errors.city}</Text>
          )}
        </View>

        {/* Delegation */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Délégation <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: errors.delegation ? '#FF0000' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Entrez votre délégation Ex: Khzema"
            placeholderTextColor={colors.textSecondary}
            value={formData.delegation}
            onChangeText={(text) => {
              setFormData({ ...formData, delegation: text });
              if (errors.delegation) setErrors({ ...errors, delegation: undefined });
            }}
          />
          {errors.delegation && (
            <Text style={styles.errorText}>{errors.delegation}</Text>
          )}
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Numéro de téléphone <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: errors.phone ? '#FF0000' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Entrez votre Numéro de téléphone"
            placeholderTextColor={colors.textSecondary}
            value={formData.phone}
            onChangeText={(text) => {
              setFormData({ ...formData, phone: text });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            keyboardType="phone-pad"
          />
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Adresse e-mail <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: errors.email ? '#FF0000' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Entrez votre Adresse e-mail"
            placeholderTextColor={colors.textSecondary}
            value={formData.email}
            onChangeText={(text) => {
              setFormData({ ...formData, email: text });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: '#D4AF37' }]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <AppLoader variant="button" size="sm" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Confirmer la commande</Text>
              <Ionicons name="checkmark-circle" size={20} color="#000000" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
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
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF0000',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 48,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
