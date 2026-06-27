import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useCartStore } from '../store/cartStore';
import { useSubscription } from '../context/SubscriptionContext';
import { Product } from '../services/productsService';
import AppLoader from '../components/AppLoader';

type CartScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Cart'>;

const ACCENT = '#D4AF37';

export default function CartScreen() {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { subscriptionState } = useSubscription();
  const isUhSubscribed = subscriptionState.isActive;
  const {
    items,
    loading,
    fetchCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getDeliveryFee,
  } = useCartStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCart();
    setRefreshing(false);
  };

  const handleQuantityChange = async (productId: string, currentQuantity: number, delta: number) => {
    const newQuantity = Math.max(0, currentQuantity + delta);
    try {
      await updateQuantity(productId, newQuantity);
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour la quantité');
    }
  };

  const handleRemove = async (productId: string) => {
    Alert.alert(
      'Supprimer',
      'Retirer cet article du panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromCart(productId);
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Vider le panier',
      'Supprimer tous les articles ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
            } catch {
              Alert.alert('Erreur', 'Impossible de vider le panier');
            }
          },
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (!items?.length) {
      Alert.alert('Panier vide', 'Votre panier est vide');
      return;
    }
    navigation.navigate('CheckoutCart');
  };

  const deliveryFee = getDeliveryFee(isUhSubscribed);
  const subtotal = getTotalPrice(isUhSubscribed);
  const subtotalNormal = getTotalPrice(false);
  const uhSavings = Math.round(subtotalNormal - subtotal);
  const total = subtotal + deliveryFee;
  const articleCount = items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  if (loading && (!items || items.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || '#000' }]}>
        <StatusBar style="light" />
        <View style={[styles.header, { borderBottomColor: colors.border || '#1a1a1a' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Panier</Text>
          <View style={styles.headerRight} />
        </View>
        <AppLoader variant="fullscreen" label="Chargement…" />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || '#000' }]}>
        <StatusBar style="light" />
        <View style={[styles.header, { borderBottomColor: colors.border || '#1a1a1a' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Panier</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={72} color="rgba(212,175,55,0.6)" />
          </View>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptySub}>
            Ajoutez des articles depuis la boutique pour les retrouver ici.
          </Text>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaPrimaryText}>Découvrir la boutique</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#000' }]}>
      <StatusBar style="light" />

      <View style={[styles.header, { borderBottomColor: colors.border || '#1a1a1a' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Panier</Text>
          <Text style={styles.headerSub}>{articleCount} article{articleCount > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.viderBtn} onPress={handleClearAll}>
          <Text style={styles.viderText}>Vider</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => {
          const product = item.product;
          if (!product?._id || !product.name) return null;
          const discountedPrice =
            product.discount && product.price
              ? product.price * (1 - product.discount / 100)
              : product.price ?? 0;
          const hasUhPrice = !!(product.uhPrice && product.uhPrice > 0 && product.uhPrice < (product.price ?? 0));
          const itemPrice = isUhSubscribed && hasUhPrice ? product.uhPrice! : discountedPrice;
          const brand = product.category ? String(product.category) : '';
          return (
            <View
              key={product._id}
              style={[styles.card, { backgroundColor: colors.cardBackground || '#111', borderColor: isUhSubscribed && hasUhPrice ? 'rgba(212,175,55,0.25)' : colors.border || '#222' }]}
            >
              <Image
                source={{
                  uri: product.images?.[0] || 'https://via.placeholder.com/100?text=Prod',
                }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardBody}>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
                {!!brand && (
                  <Text style={[styles.cardBrand, { color: colors.textSecondary }]} numberOfLines={1}>
                    {brand}
                  </Text>
                )}
                <View style={styles.priceRow}>
                  <Text style={[styles.cardPrice, isUhSubscribed && hasUhPrice && styles.cardPriceUh]}>
                    {Math.round(itemPrice)} DT
                  </Text>
                  {isUhSubscribed && hasUhPrice && (
                    <View style={styles.uhBadge}>
                      <Ionicons name="pricetag" size={9} color={ACCENT} />
                      <Text style={styles.uhBadgeText}>Prix UH</Text>
                    </View>
                  )}
                  {!isUhSubscribed && hasUhPrice && (
                    <Text style={styles.uhHint}>UH: {Math.round(product.uhPrice!)} DT</Text>
                  )}
                </View>
                <View style={styles.stepperRow}>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleQuantityChange(product._id, item.quantity, -1)}
                    >
                      <MaterialIcons name="remove" size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.stepperQty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleQuantityChange(product._id, item.quantity, 1)}
                    >
                      <MaterialIcons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemove(product._id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background || '#000', borderTopColor: colors.border || '#1a1a1a', paddingBottom: Math.max(48, insets.bottom + 20) }]}>
        {/* UH savings banner */}
        {isUhSubscribed && uhSavings > 0 && (
          <View style={styles.uhSavingsBanner}>
            <Ionicons name="pricetag" size={14} color={ACCENT} />
            <Text style={styles.uhSavingsText}>
              Vous économisez <Text style={styles.uhSavingsAmount}>{uhSavings} DT</Text> grâce à UH Premium
            </Text>
          </View>
        )}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{Math.round(subtotal)} DT</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Livraison</Text>
            <Text style={styles.totalValue}>{deliveryFee === 0 ? 'Gratuit' : `${Math.round(deliveryFee)} DT`}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalLabelBold}>Total</Text>
            <Text style={styles.totalValueBold}>{Math.round(total)} DT</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.9}>
          <Text style={styles.checkoutBtnText}>Passer au paiement</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>Continuer mes achats</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerRight: { width: 56 },
  viderBtn: { padding: 8 },
  viderText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 240 },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardBody: { flex: 1, marginLeft: 16, justifyContent: 'space-between' },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 4, color: '#fff', letterSpacing: -0.3 },
  cardBrand: { fontSize: 12, marginBottom: 6, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  cardPriceUh: { color: ACCENT },
  uhBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  uhBadgeText: { fontSize: 10, fontWeight: '800', color: ACCENT, letterSpacing: -0.2 },
  uhHint: { fontSize: 11, color: 'rgba(212,175,55,0.7)', fontWeight: '600' },
  uhSavingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05))',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  uhSavingsText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  uhSavingsAmount: { fontWeight: '900', color: ACCENT, fontSize: 14 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(212,175,55,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQty: { fontSize: 16, fontWeight: '800', color: '#fff', minWidth: 24, textAlign: 'center', letterSpacing: -0.2 },
  deleteBtn: { padding: 8, marginLeft: 8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 48,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  totals: { marginBottom: 16 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  totalValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  totalRowFinal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  totalLabelBold: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  totalValueBold: { fontSize: 20, fontWeight: '900', color: ACCENT, letterSpacing: -0.5 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutBtnText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: -0.2 },
  continueBtn: { alignItems: 'center', paddingVertical: 12 },
  continueBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212,175,55,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 28 },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  ctaPrimaryText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
