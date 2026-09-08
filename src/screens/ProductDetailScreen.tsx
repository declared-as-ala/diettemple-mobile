import { BRAND_YELLOW } from '../constants/brand';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { productsService, Product } from '../services/productsService';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAuthStore } from '../store/authStore';
import { useSubscription } from '../context/SubscriptionContext';
import { useSnackbar } from '../components/Snackbar';
import UHPremiumBanner from '../components/boutique/UHPremiumBanner';
import ProductImageGallery from '../components/boutique/ProductImageGallery';

const GOLD = BRAND_YELLOW;
const money = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export default function ProductDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'ProductDetail'>>();
  const { params: { productId } } = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const pendingCart = useRef(false);
  const pendingFavorite = useRef(false);
  const { addToCart, getCartItem, updateQuantity, getItemCount, fetchCart } = useCartStore();
  const { isFavorited, addFavorite, removeFavorite, fetchFavorites } = useFavoritesStore();
  const { isAuthenticated } = useAuthStore();
  const { subscriptionState } = useSubscription();
  const isMember = subscriptionState.isActive;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false); setProduct(null); setDescriptionOpen(true);
    (async () => {
      try {
        const [data] = await Promise.all([productsService.getProduct(productId), fetchCart(), fetchFavorites()]);
        if (cancelled) return;
        if (!data?._id) throw new Error('Product not found');
        setProduct(data);
        const maximum = data.stock == null ? 99 : Math.max(1, data.stock);
        setQuantity(Math.min(getCartItem(data._id)?.quantity || 1, maximum));
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId, attempt, fetchCart, fetchFavorites, getCartItem]);

  const openUH = useCallback(() => {
    if (!isAuthenticated) navigation.navigate('Login', { redirectTo: 'UH' });
    else navigation.navigate(isMember ? 'PremiumHome' : 'UHPreview');
  }, [isAuthenticated, isMember, navigation]);

  const toggleFavorite = async () => {
    if (!product || pendingFavorite.current) return;
    pendingFavorite.current = true;
    try {
      if (isFavorited(product._id)) {
        await removeFavorite(product._id);
        showSnackbar({ message: 'Retiré des favoris', duration: 1800 });
      } else {
        await addFavorite(product);
        showSnackbar({ message: 'Ajouté aux favoris', duration: 1800 });
      }
    } catch { showSnackbar({ message: 'Impossible de modifier les favoris', duration: 2200 }); }
    finally { pendingFavorite.current = false; }
  };

  const hasUhPrice = typeof product?.uhPrice === 'number' && product.uhPrice > 0 && product.uhPrice < product.price;
  const regularPrice = product ? product.price * (1 - Math.max(0, Math.min(100, product.discount || 0)) / 100) : 0;
  const finalPrice = product && isMember && hasUhPrice ? product.uhPrice! : regularPrice;
  const exclusive = !!product?.isUhExclusive && !isMember;
  const inStock = !!product && (product.stock == null || product.stock > 0);
  const maxQuantity = product?.stock == null ? 99 : product.stock;
  const inCart = !!product && !!getCartItem(product._id);
  const favorited = !!product && isFavorited(product._id);
  const cartCount = getItemCount();
  const composition = product?.composition;
  const facts = [
    { label: 'Protéines', value: composition?.protein ?? (product?.nutritionInfo?.protein != null ? product.nutritionInfo.protein + ' g' : undefined) },
    { label: 'Énergie', value: composition?.calories ?? (product?.nutritionInfo?.calories != null ? product.nutritionInfo.calories + ' kcal' : undefined) },
    { label: 'Glucides', value: composition?.carbs ?? (product?.nutritionInfo?.carbs != null ? product.nutritionInfo.carbs + ' g' : undefined) },
    { label: 'Lipides', value: composition?.fat ?? (product?.nutritionInfo?.fat != null ? product.nutritionInfo.fat + ' g' : undefined) },
    { label: 'Acides aminés', value: composition?.aminoAcids },
  ].filter((fact) => fact.value);

  const saveCart = async () => {
    if (!product || pendingCart.current || !inStock || exclusive) return;
    pendingCart.current = true; setAdding(true);
    try {
      if (getCartItem(product._id)) await updateQuantity(product._id, quantity);
      else await addToCart(product, quantity);
      showSnackbar({
        message: inCart ? 'Panier mis à jour' : 'Produit ajouté au panier', duration: 2200,
        action: { label: 'Voir le panier', onPress: () => navigation.navigate('Cart') },
      });
    } catch { showSnackbar({ message: 'Impossible de modifier le panier', duration: 2500 }); }
    finally { pendingCart.current = false; setAdding(false); }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Pressable style={s.headerButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Retour à la boutique">
          <Ionicons name="arrow-back" size={22} color="#ECEFE3" />
        </Pressable>
        <Text style={s.headerTitle}>Détail du produit</Text>
        <Pressable style={s.headerButton} onPress={() => navigation.navigate('Cart')} accessibilityRole="button"
          accessibilityLabel={'Panier, ' + cartCount + ' articles'}>
          <Ionicons name="bag-outline" size={22} color="#ECEFE3" />
          {cartCount > 0 && <View style={s.cartBadge}><Text style={s.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
        </Pressable>
      </View>

      {loading ? <View style={s.loading} accessibilityLabel="Chargement du produit">
        <View style={s.loadingImage}><ActivityIndicator size="large" color={GOLD} /></View>
        <View style={s.loadingTitle} /><View style={s.loadingLine} />
      </View> : loadError || !product ? <View style={s.error}>
        <Ionicons name="cloud-offline-outline" size={42} color={GOLD} />
        <Text style={s.errorTitle}>Le produit n’a pas pu être chargé</Text>
        <Text style={s.errorCaption}>Vérifiez votre connexion et réessayez.</Text>
        <Pressable onPress={() => setAttempt((value) => value + 1)} style={s.retry} accessibilityRole="button">
          <Text style={s.retryText}>Réessayer</Text>
        </Pressable>
      </View> : <>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.categoryRow}>
            <Text style={s.category}>{product.category}</Text>
            <View style={s.stock}><View style={[s.stockDot, !inStock && { backgroundColor: '#9C978D' }]} />
              <Text style={s.stockLabel}>{inStock ? 'En stock' : 'Épuisé'}</Text></View>
          </View>
          <ProductImageGallery key={product._id} images={product.images || []} name={product.name} />
          <View style={s.identityRow}>
            <View style={s.brandBlock}>
              {!!product.brand && <Text style={s.brand}>{product.brand}</Text>}
              {!!product.weight && <Text style={s.weight}>{product.weight}</Text>}
            </View>
            <Pressable style={[s.favorite, favorited && s.favoriteActive]} onPress={toggleFavorite} accessibilityRole="button"
              accessibilityState={{ selected: favorited }} accessibilityLabel={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
              <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? '#E397A6' : '#D4DAC6'} />
            </Pressable>
          </View>
          <Text style={s.name}>{product.name}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>{money(finalPrice)}<Text style={s.currency}> DT</Text></Text>
            {finalPrice < product.price && <Text style={s.oldPrice}>{money(product.price)} DT</Text>}
            {finalPrice < product.price && <View style={s.saving}><Text style={s.savingText}>−{money(product.price - finalPrice)} DT</Text></View>}
          </View>
          {hasUhPrice && <Pressable style={s.memberRow} onPress={openUH} disabled={isMember} accessibilityRole={isMember ? 'text' : 'button'}>
            <View style={s.memberIcon}><Ionicons name={isMember ? 'checkmark-circle-outline' : 'diamond-outline'} size={20} color={GOLD} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberTitle}>{isMember ? 'Votre tarif membre UH est appliqué' : 'Le privilège membre UH'}</Text>
              {!isMember && <Text style={s.memberCaption}>{money(product.uhPrice!)} DT avec votre abonnement</Text>}
            </View>
            {!isMember && <Ionicons name="chevron-forward" size={17} color={GOLD} />}
          </Pressable>}
          <View style={s.detailsPanel}>
            <Pressable onPress={() => setDescriptionOpen((open) => !open)} style={s.sectionHeading}
              accessibilityRole="button" accessibilityState={{ expanded: descriptionOpen }} accessibilityLabel="À propos du produit">
              <Text style={s.sectionTitle}>À propos du produit</Text>
              <Ionicons name={descriptionOpen ? 'remove' : 'add'} size={20} color="#B5BEA8" />
            </Pressable>
            {descriptionOpen && <Text style={s.description}>{product.description || 'Aucune description renseignée pour ce produit.'}</Text>}
          </View>

          {facts.length > 0 && <View style={s.section}>
            <Text style={s.sectionTitle}>Composition</Text>
            <Text style={s.sectionCaption}>Informations renseignées pour ce produit</Text>
            <View style={s.facts}>{facts.map((fact) => <View key={fact.label} style={s.fact}>
              <Text style={s.factValue}>{fact.value}</Text><Text style={s.factLabel}>{fact.label}</Text>
            </View>)}</View>
          </View>}
          {!!product.flavors?.length && <View style={s.section}>
            <Text style={s.sectionTitle}>Saveurs référencées</Text>
            <View style={s.tags}>{product.flavors.map((flavor, i) => <View key={flavor + i} style={s.tag}>
              <Text style={s.tagText}>{flavor}</Text>
            </View>)}</View>
          </View>}
          {!!product.tags?.length && <View style={s.tags}>{product.tags.map((tag, i) => <Text key={tag + i} style={s.productTag}>#{tag}</Text>)}</View>}
          {!isMember && <UHPremiumBanner onPress={openUH} style={{ marginHorizontal: 0, marginTop: 26 }} />}
        </ScrollView>
        <View style={[s.footer, { paddingBottom: Math.max(14, insets.bottom) }]}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total · {quantity} article{quantity > 1 ? 's' : ''}</Text>
            <Text style={s.total}>{money(finalPrice * quantity)}<Text style={s.totalCurrency}> DT</Text></Text>
          </View>
          <View style={s.purchaseRow}>
            {!exclusive && <View style={s.stepper}>
              <Pressable style={[s.stepperButton, (quantity <= 1 || adding) && s.disabled]} disabled={quantity <= 1 || adding || !inStock}
                onPress={() => setQuantity((value) => Math.max(1, value - 1))} accessibilityRole="button" accessibilityLabel="Diminuer la quantité">
                <Ionicons name="remove" size={20} color={GOLD} />
              </Pressable>
              <Text style={s.quantity}>{quantity}</Text>
              <Pressable style={[s.stepperButton, (quantity >= maxQuantity || adding || !inStock) && s.disabled]}
                disabled={quantity >= maxQuantity || adding || !inStock} onPress={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                accessibilityRole="button" accessibilityLabel="Augmenter la quantité"><Ionicons name="add" size={20} color={GOLD} /></Pressable>
            </View>}
            <Pressable style={({ pressed }) => [s.buyButton, (!inStock && !exclusive) && s.buyDisabled, pressed && { opacity: 0.8 }]}
              disabled={adding || (!inStock && !exclusive)} onPress={exclusive ? openUH : saveCart}
              accessibilityRole="button" accessibilityLabel={exclusive ? 'Rejoindre UH' : inCart ? 'Mettre à jour le panier' : 'Ajouter au panier'}
              accessibilityState={{ disabled: adding || (!inStock && !exclusive), busy: adding }}>
              {adding ? <ActivityIndicator color="#17190F" /> : <>
                <Ionicons name={exclusive ? 'diamond-outline' : inCart ? 'checkmark' : 'bag-add-outline'} size={19} color="#17190F" />
                <Text style={s.buyText}>{exclusive ? 'Rejoindre UH' : !inStock ? 'Épuisé' : inCart ? 'Mettre à jour' : 'Ajouter au panier'}</Text>
              </>}
            </Pressable>
          </View>
        </View>
      </>}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10130F' },
  header: { minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#21271C', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#D6DCCB', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  cartBadge: { position: 'absolute', top: 0, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeText: { color: '#1C2013', fontSize: 9, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 16, gap: 10 },
  category: { color: '#B6C0A6', fontSize: 11, flex: 1 },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockDot: { backgroundColor: '#A2B98F', width: 6, height: 6, borderRadius: 3 },
  stockLabel: { color: '#B6C0A6', fontSize: 11 },
  identityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, gap: 10 },
  brandBlock: { flex: 1 },
  brand: { color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' },
  weight: { color: '#A5AF98', fontSize: 11, marginTop: 6 },
  favorite: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#39432D', backgroundColor: '#1D2418' },
  favoriteActive: { borderColor: '#68454A', backgroundColor: '#312125' },
  name: { color: '#F5F3EB', fontSize: 26, lineHeight: 33, letterSpacing: -0.7, fontWeight: '700' },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 22 },
  price: { color: GOLD, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
  currency: { fontSize: 15, fontWeight: '500', letterSpacing: 0 },
  oldPrice: { color: '#9BA68C', fontSize: 14, textDecorationLine: 'line-through' },
  saving: { backgroundColor: '#2C321F', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  savingText: { color: '#C7D6AF', fontSize: 11, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 17, backgroundColor: '#282B1C', borderWidth: 1, borderColor: '#4A4930', marginBottom: 22, minHeight: 64 },
  memberIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#373922' },
  memberTitle: { fontSize: 12, color: BRAND_YELLOW, fontWeight: '600' },
  memberCaption: { fontSize: 11, color: '#B5BCA3', marginTop: 5 },
  detailsPanel: { borderRadius: 18, backgroundColor: '#1A2015', paddingHorizontal: 16, borderWidth: 1, borderColor: '#2D3723' },
  sectionHeading: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: '#E6EBDB', fontSize: 16, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 22, color: '#B7C1A7', paddingBottom: 18 },
  section: { marginTop: 26 },
  sectionCaption: { color: '#9AA98A', fontSize: 11, marginTop: 7, marginBottom: 14 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: { flexBasis: '46%', flexGrow: 1, minWidth: 120, borderRadius: 15, padding: 15, backgroundColor: '#1D2418', borderWidth: 1, borderColor: '#303C26' },
  factValue: { fontSize: 16, fontWeight: '700', color: BRAND_YELLOW, lineHeight: 23 },
  factLabel: { color: '#ABB89A', fontSize: 11, marginTop: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  tag: { backgroundColor: '#242D1D', borderWidth: 1, borderColor: '#3B472F', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  tagText: { color: '#BDCBB0', fontSize: 12 },
  productTag: { color: '#98A989', fontSize: 11, paddingVertical: 5 },
  footer: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderColor: '#39432B', backgroundColor: '#181F13' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
  totalLabel: { color: '#ABB99B', fontSize: 11 },
  total: { color: '#F0E2AC', fontSize: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  totalCurrency: { fontSize: 11, fontWeight: '500' },
  purchaseRow: { flexDirection: 'row', gap: 12 },
  stepper: { width: 120, minHeight: 52, borderWidth: 1, borderColor: '#485436', borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperButton: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
  quantity: { fontSize: 15, fontWeight: '700', color: BRAND_YELLOW },
  buyButton: { flex: 1, minHeight: 52, borderRadius: 13, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  buyText: { fontSize: 12, fontWeight: '800', color: '#17190F', flexShrink: 1, textAlign: 'center' },
  buyDisabled: { backgroundColor: '#777D63' },
  disabled: { opacity: 0.3 },
  loading: { flex: 1, padding: 20 },
  loadingImage: { height: 300, backgroundColor: '#242C1D', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { marginTop: 24, height: 28, width: '85%', borderRadius: 8, backgroundColor: '#293322' },
  loadingLine: { marginTop: 16, height: 20, width: '55%', borderRadius: 8, backgroundColor: '#293322' },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16 },
  errorTitle: { color: '#ECEFE3', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  errorCaption: { color: '#A9B79A', fontSize: 13, textAlign: 'center' },
  retry: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: GOLD },
  retryText: { color: '#1B1F11', fontSize: 14, fontWeight: '700' },
});


