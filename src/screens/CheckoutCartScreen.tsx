import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { promoService } from '../services/promoService';
import { Product } from '../services/productsService';
import Toast from 'react-native-toast-message';
import AppLoader from '../components/AppLoader';

type CheckoutCartScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CheckoutCart'>;

export default function CheckoutCartScreen() {
  const navigation = useNavigation<CheckoutCartScreenNavigationProp>();
  const { colors } = useTheme();
  const {
    items,
    loading,
    fetchCart,
    updateQuantity,
    removeFromCart,
    getTotalPrice,
    getDeliveryFee,
  } = useCartStore();

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const handleQuantityChange = async (productId: string, currentQuantity: number, delta: number) => {
    const newQuantity = Math.max(0, currentQuantity + delta);
    try {
      await updateQuantity(productId, newQuantity);
      // Re-validate promo if applied
      if (appliedPromo) {
        await validatePromoCode(appliedPromo.code);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de mettre à jour la quantité');
    }
  };

  const handleRemove = async (productId: string) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer ce produit?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromCart(productId);
              if (appliedPromo) {
                await validatePromoCode(appliedPromo.code);
              }
            } catch (error: any) {
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          },
        },
      ]
    );
  };

  const validatePromoCode = async (code?: string) => {
    const codeToValidate = code || promoCode;
    if (!codeToValidate.trim()) {
      setPromoError(null);
      setAppliedPromo(null);
      return;
    }

    setValidatingPromo(true);
    setPromoError(null);

    try {
      const subtotal = getTotalPrice();
      const result = await promoService.validatePromoCode(codeToValidate.trim(), subtotal);

      if (result.valid && result.discount) {
        setAppliedPromo({
          code: result.code!,
          discount: result.discount,
        });
        setPromoCode(result.code!);
        setPromoError(null);
      } else {
        setAppliedPromo(null);
        setPromoError(result.message || 'Code promo invalide');
      }
    } catch (error: any) {
      setAppliedPromo(null);
      setPromoError(error.response?.data?.message || 'Erreur lors de la validation du code promo');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleContinueToOrder = () => {
    if (!items || items.length === 0) {
      Alert.alert('Panier vide', 'Votre panier est vide');
      return;
    }

    const subtotal = getTotalPrice();
    const discount = appliedPromo?.discount || 0;
    const deliveryFee = subtotal < 200 ? 7 : 0;
    const total = subtotal - discount + deliveryFee;

    navigation.navigate('DeliveryAddress', {
      subtotal,
      discount,
      deliveryFee,
      total,
      promoCode: appliedPromo?.code,
    });
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AppLoader variant="inline" size="lg" label="Chargement…" />
        </View>
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mon panier</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>Panier vide</Text>
        </View>
      </View>
    );
  }

  // Use backend-calculated values (single source of truth)
  const subtotal = getTotalPrice();
  const discount = appliedPromo?.discount || 0;
  const deliveryFee = getDeliveryFee(); // From backend
  const total = subtotal - discount + deliveryFee;

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mon panier</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Products List */}
        {items.map((item) => {
            const product = item.product;
            if (!product || !product._id || !product.name) {
              return null;
            }

            const finalPrice = product.discount && typeof product.discount === 'number'
              ? product.price * (1 - product.discount / 100)
              : product.price;

            return (
              <View
                key={product._id}
                style={[styles.cartItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              >
                <Image
                  source={{
                    uri: product.images?.[0] || 'https://via.placeholder.com/100',
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                    {product.name || 'Produit sans nom'}
                  </Text>
                  {!!(product.discount && product.discount > 0) && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{product.discount}%</Text>
                    </View>
                  )}
                  <Text style={[styles.productPrice, { color: colors.text }]}>
                    {finalPrice.toFixed(0)} DT
                  </Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: colors.background }]}
                    onPress={() =>
                      handleQuantityChange(
                        product._id,
                        item.quantity,
                        -1
                      )
                    }
                  >
                    <MaterialIcons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.quantityValue, { color: colors.text }]}>
                    {item.quantity}
                  </Text>
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: colors.background }]}
                    onPress={() =>
                      handleQuantityChange(
                        product._id,
                        item.quantity,
                        1
                      )
                    }
                  >
                    <MaterialIcons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() =>
                    handleRemove(product._id)
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}

        {/* Promo Code Input */}
        <View style={[styles.promoContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <TextInput
            style={[styles.promoInput, { color: colors.text }]}
            placeholder="Entrez votre code promo"
            placeholderTextColor={colors.textSecondary}
            value={promoCode}
            onChangeText={setPromoCode}
            onSubmitEditing={() => validatePromoCode()}
            editable={!validatingPromo}
          />
          {validatingPromo ? (
            <AppLoader variant="button" size="sm" />
          ) : (
            <TouchableOpacity onPress={() => validatePromoCode()}>
              <Ionicons name="arrow-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {promoError && (
          <View style={styles.promoErrorContainer}>
            <Ionicons name="close-circle" size={20} color="#FF0000" />
            <Text style={styles.promoErrorText}>{promoError}</Text>
          </View>
        )}

        {/* Order Summary */}
        <View style={[styles.summaryContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sous-total</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {subtotal.toFixed(0)} DT
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Livraison</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {deliveryFee.toFixed(0)} DT
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#D4AF37' }]}>Réduction</Text>
              <Text style={[styles.summaryValue, { color: '#D4AF37' }]}>
                -{discount.toFixed(0)} DT
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.finalRow]}>
            <Text style={[styles.finalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.finalValue, { color: colors.text }]}>
              {total.toFixed(0)} DT
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Order Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.paymentButton, { backgroundColor: '#D4AF37' }]}
          onPress={handleContinueToOrder}
        >
          <Text style={styles.paymentButtonText}>Commander</Text>
          <Ionicons name="chevron-forward" size={20} color="#000000" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cartItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  promoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  promoInput: {
    flex: 1,
    fontSize: 16,
    marginRight: 12,
  },
  promoErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  promoErrorText: {
    color: '#FF0000',
    fontSize: 14,
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  finalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  finalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  finalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  paymentButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
