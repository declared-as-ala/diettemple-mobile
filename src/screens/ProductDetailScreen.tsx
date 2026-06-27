import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import AppLoader from '../components/AppLoader';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailNavProp = StackNavigationProp<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.round(width * 1.0); // square hero
const GOLD = '#D4AF37';
const CARD_BG = '#0C0C0C';
const SURFACE = '#161616';
const CONTENT_OVERLAP = 28; // how much content card overlaps the image

// ─── Macro pill (nutrition info) ─────────────────────────────────────────────

function MacroPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={[macro.pill, { borderColor: color + '33' }]}>
      <View style={[macro.dot, { backgroundColor: color }]} />
      <Text style={macro.value}>
        {value}
        <Text style={macro.unit}>{unit}</Text>
      </Text>
      <Text style={macro.label}>{label}</Text>
    </View>
  );
}

const macro = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 18 },
  unit: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  label: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.65, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[sk.wrap, { opacity: pulse }]}>
      <View style={sk.image} />
      <View style={sk.content}>
        <View style={sk.chip} />
        <View style={sk.title} />
        <View style={sk.title2} />
        <View style={sk.price} />
        <View style={sk.desc} />
        <View style={sk.desc2} />
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: CARD_BG },
  image: { width, height: IMAGE_HEIGHT, backgroundColor: '#1a1a1a' },
  content: { padding: 20, gap: 12 },
  chip: { height: 22, width: 80, borderRadius: 8, backgroundColor: '#222' },
  title: { height: 26, width: '90%', borderRadius: 8, backgroundColor: '#222' },
  title2: { height: 26, width: '60%', borderRadius: 8, backgroundColor: '#1e1e1e' },
  price: { height: 34, width: '40%', borderRadius: 8, backgroundColor: '#222' },
  desc: { height: 14, borderRadius: 6, backgroundColor: '#1e1e1e' },
  desc2: { height: 14, width: '75%', borderRadius: 6, backgroundColor: '#1a1a1a' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const navigation = useNavigation<ProductDetailNavProp>();
  const route = useRoute<ProductDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { showSnackbar } = useSnackbar();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const [adding, setAdding] = useState(false);

  const addBtnScale = useRef(new Animated.Value(1)).current;
  const favScale = useRef(new Animated.Value(1)).current;

  const { addToCart, getCartItem, updateQuantity } = useCartStore();
  const { isFavorited, addFavorite, removeFavorite } = useFavoritesStore();
  const { isAuthenticated } = useAuthStore();
  const { subscriptionState } = useSubscription();
  const isUhSubscribed = subscriptionState.isActive;

  useEffect(() => {
    loadProduct();
  }, [productId]);

  // Sync quantity with cart
  useEffect(() => {
    if (product?._id) {
      const cartItem = getCartItem(product._id);
      if (cartItem) setQuantity(cartItem.quantity);
    }
  }, [product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productsService.getProduct(productId);
      if (!data?._id) { navigation.goBack(); return; }
      setProduct(data);
    } catch {
      showSnackbar({ message: 'Impossible de charger le produit', duration: 3000 });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = useCallback(async () => {
    if (!product?._id) return;
    Animated.sequence([
      Animated.spring(favScale, { toValue: 1.4, useNativeDriver: true, speed: 60 }),
      Animated.spring(favScale, { toValue: 1, useNativeDriver: true, speed: 60 }),
    ]).start();
    try {
      if (isFavorited(product._id)) {
        await removeFavorite(product._id);
        showSnackbar({ message: 'Retiré des favoris', duration: 1800 });
      } else {
        await addFavorite(product);
        showSnackbar({ message: 'Ajouté aux favoris ❤️', duration: 1800 });
      }
    } catch {
      showSnackbar({ message: 'Erreur favoris', duration: 2000 });
    }
  }, [product, isFavorited]);

  const handleAddToCart = useCallback(async () => {
    if (!product?._id || adding) return;
    setAdding(true);
    Animated.sequence([
      Animated.spring(addBtnScale, { toValue: 0.94, useNativeDriver: true, speed: 60 }),
      Animated.spring(addBtnScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    try {
      const existing = getCartItem(product._id);
      if (existing) {
        await updateQuantity(product._id, quantity);
      } else {
        await addToCart(product, quantity);
      }
      showSnackbar({
        message: `${quantity}× ajouté au panier`,
        duration: 2200,
        action: { label: 'Voir', onPress: () => navigation.navigate('Cart') },
      });
    } catch {
      showSnackbar({ message: "Impossible d'ajouter au panier", duration: 2500 });
    } finally {
      setAdding(false);
    }
  }, [product, quantity, adding]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || !product?._id) {
    return (
      <View style={{ flex: 1, backgroundColor: CARD_BG }}>
        <StatusBar style="light" />
        <Skeleton />
      </View>
    );
  }

  const hasUhPrice = !!(product.uhPrice && product.uhPrice > 0 && product.uhPrice < (product.price ?? 0));
  const discountedPrice = product.discount && product.price
    ? product.price * (1 - product.discount / 100)
    : product.price ?? 0;
  const finalPrice = isUhSubscribed && hasUhPrice ? product.uhPrice! : discountedPrice;
  const hasDiscount = !!(product.discount && product.discount > 0 && product.price);
  const inStock = product.stock === undefined || product.stock === null || product.stock > 0;
  const images = product.images?.length ? product.images : [undefined];
  const favorited = isFavorited(product._id);
  const cartItem = getCartItem(product._id);
  const inCart = !!(cartItem && cartItem.quantity > 0);
  const totalPrice = Math.round(finalPrice * quantity);
  const hasNutrition = !!(
    product.nutritionInfo &&
    (product.nutritionInfo.calories ||
      product.nutritionInfo.protein ||
      product.nutritionInfo.carbs ||
      product.nutritionInfo.fat)
  );
  const descShort = (product.description || '').length > 160;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Floating header buttons ── */}
      <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.floatBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatBtn, favorited && styles.floatBtnFav]}
          onPress={handleFavoriteToggle}
          activeOpacity={0.85}
        >
          <Animated.View style={{ transform: [{ scale: favScale }] }}>
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={20}
              color={favorited ? '#FF6B9D' : '#fff'}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Image gallery ── */}
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri: images[imageIndex] || 'https://via.placeholder.com/400x400?text=Produit',
            }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          {/* Bottom gradient blends into content card */}
          <LinearGradient
            colors={['transparent', 'rgba(12,12,12,0.6)', CARD_BG]}
            locations={[0.5, 0.82, 1]}
            style={styles.imageGradient}
            pointerEvents="none"
          />
          {/* Discount badge */}
          {hasDiscount && (
            <LinearGradient
              colors={['#FF6B35', '#E63946']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>-{product.discount}%</Text>
            </LinearGradient>
          )}
          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={styles.dotsRow}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setImageIndex(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={[styles.dot, i === imageIndex && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Thumbnail strip for multiple images */}
        {images.length > 1 && (
          <View style={styles.thumbRow}>
            {images.map((uri, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.thumb, i === imageIndex && styles.thumbActive]}
                onPress={() => setImageIndex(i)}
                activeOpacity={0.8}
              >
                <Image
                  source={{
                    uri: uri || 'https://via.placeholder.com/58?text=',
                  }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Content card ── */}
        <View style={[styles.contentCard, images.length > 1 && { marginTop: 0 }]}>
          {/* Category chip */}
          {!!product.category && (
            <View style={styles.categoryRow}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{String(product.category).toUpperCase()}</Text>
              </View>
              {!inStock && (
                <View style={styles.outOfStockBadge}>
                  <View style={styles.outOfStockDot} />
                  <Text style={styles.outOfStockText}>Rupture de stock</Text>
                </View>
              )}
              {inStock && (
                <View style={styles.inStockBadge}>
                  <View style={styles.inStockDot} />
                  <Text style={styles.inStockText}>En stock</Text>
                </View>
              )}
            </View>
          )}

          {/* Product name */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Price row */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, isUhSubscribed && hasUhPrice && styles.priceUh]}>
              {Math.round(finalPrice)} DT
            </Text>
            {/* Show strikethrough original when UH subscribed */}
            {isUhSubscribed && hasUhPrice && (
              <Text style={styles.originalPrice}>{Math.round(discountedPrice)} DT</Text>
            )}
            {/* Show strikethrough when regular discount applies */}
            {!isUhSubscribed && hasDiscount && (
              <Text style={styles.originalPrice}>{Math.round(product.price!)} DT</Text>
            )}
            {isUhSubscribed && hasUhPrice && (
              <View style={styles.uhActiveBadge}>
                <Ionicons name="pricetag" size={11} color={GOLD} />
                <Text style={styles.uhActiveBadgeText}>
                  Prix UH — -{Math.round(discountedPrice - product.uhPrice!)} DT
                </Text>
              </View>
            )}
            {!isUhSubscribed && hasDiscount && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>
                  Économisez {Math.round(product.price! - discountedPrice)} DT
                </Text>
              </View>
            )}
          </View>

          {/* UH locked teaser for non-subscribers */}
          {hasUhPrice && !isUhSubscribed && (
            <TouchableOpacity
              style={styles.uhLockedRow}
              onPress={() => navigation.navigate(isAuthenticated ? 'UHPreview' : 'Login', isAuthenticated ? undefined : { redirectTo: 'UH' } as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed" size={13} color={GOLD} />
              <Text style={styles.uhLockedLabel}>
                Prix UH : <Text style={styles.uhLockedPrice}>{Math.round(product.uhPrice!)} DT</Text>
                {'  '}
                <Text style={styles.uhLockedSave}>(-{Math.round(discountedPrice - product.uhPrice!)} DT)</Text>
              </Text>
              <Ionicons name="chevron-forward" size={13} color={GOLD} />
            </TouchableOpacity>
          )}

          {/* ── Divider ── */}
          <View style={styles.divider} />

          {/* ── Description ── */}
          {!!product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text
                style={styles.description}
                numberOfLines={descExpanded ? undefined : (descShort ? 4 : undefined)}
              >
                {product.description}
              </Text>
              {descShort && (
                <TouchableOpacity
                  onPress={() => setDescExpanded((v) => !v)}
                  style={styles.expandBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.expandBtnText}>
                    {descExpanded ? 'Voir moins ↑' : 'Voir plus ↓'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Nutrition macros ── */}
          {hasNutrition && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Valeurs nutritionnelles</Text>
                <Text style={styles.sectionSubtitle}>Pour 100g de produit</Text>
                <View style={styles.macroRow}>
                  {!!product.nutritionInfo?.calories && (
                    <MacroPill label="Kcal" value={product.nutritionInfo.calories} unit="" color="#F59E0B" />
                  )}
                  {!!product.nutritionInfo?.protein && (
                    <MacroPill label="Protéines" value={product.nutritionInfo.protein} unit="g" color="#3B82F6" />
                  )}
                  {!!product.nutritionInfo?.carbs && (
                    <MacroPill label="Glucides" value={product.nutritionInfo.carbs} unit="g" color="#10B981" />
                  )}
                  {!!product.nutritionInfo?.fat && (
                    <MacroPill label="Lipides" value={product.nutritionInfo.fat} unit="g" color="#EF4444" />
                  )}
                </View>
              </View>
            </>
          )}

          {/* ── Tags ── */}
          {!!(product.tags && product.tags.length > 0) && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <View style={styles.tagsRow}>
                  {product.tags.map((tag, i) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky footer ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 16) }]}>
        <LinearGradient
          colors={['transparent', 'rgba(12,12,12,0.98)', CARD_BG]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.footerInner}>
          {/* Quantity stepper */}
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={18} color={GOLD} />
            </TouchableOpacity>
            <Text style={styles.stepperQty}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, styles.stepperBtnPlus]}
              onPress={() => setQuantity((q) => q + 1)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#000" />
            </TouchableOpacity>
          </View>

          {/* CTA button */}
          <Animated.View style={[styles.ctaWrap, { transform: [{ scale: addBtnScale }] }]}>
            <TouchableOpacity
              style={[styles.ctaBtn, (!inStock || adding) && styles.ctaBtnDisabled]}
              onPress={handleAddToCart}
              disabled={!inStock || adding}
              activeOpacity={0.9}
            >
              {adding ? (
                <AppLoader variant="button" />
              ) : (
                <>
                  <Ionicons name="bag-add-outline" size={20} color="#000" />
                  <View>
                    <Text style={styles.ctaText}>
                      {inCart ? 'Mettre à jour' : 'Ajouter au panier'}
                    </Text>
                    <Text style={styles.ctaPrice}>{totalPrice} DT</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CARD_BG },

  // Floating header
  floatingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  floatBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  floatBtnFav: {
    backgroundColor: 'rgba(255,107,157,0.18)',
    borderColor: 'rgba(255,107,157,0.3)',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {},

  // Image
  imageWrap: {
    width,
    height: IMAGE_HEIGHT,
    backgroundColor: '#1a1a1a',
  },
  mainImage: { width, height: IMAGE_HEIGHT },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: IMAGE_HEIGHT * 0.5,
  },
  discountBadge: {
    position: 'absolute',
    top: 60,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  discountText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  dotsRow: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 20, backgroundColor: GOLD, borderRadius: 3 },

  // Thumbnail strip
  thumbRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: CARD_BG,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: GOLD },
  thumbImage: { width: '100%', height: '100%' },

  // Content card
  contentCard: {
    backgroundColor: CARD_BG,
    marginTop: -CONTENT_OVERLAP,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Category + stock
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  categoryText: { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 1 },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  inStockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  inStockText: { fontSize: 11, fontWeight: '600', color: '#22C55E' },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  outOfStockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  outOfStockText: { fontSize: 11, fontWeight: '600', color: '#EF4444' },

  // Name
  productName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 16,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  price: { fontSize: 36, fontWeight: '900', color: GOLD, letterSpacing: -0.8 },
  originalPrice: {
    fontSize: 19,
    color: 'rgba(255,255,255,0.35)',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  priceUh: { color: GOLD },
  uhActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  uhActiveBadgeText: { fontSize: 12, fontWeight: '800', color: GOLD, letterSpacing: -0.2 },
  uhLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 18,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uhLockedLabel: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', letterSpacing: -0.2 },
  uhLockedPrice: { fontWeight: '900', color: GOLD, fontSize: 14 },
  uhLockedSave: { fontWeight: '700', color: 'rgba(212,175,55,0.8)', fontSize: 12, letterSpacing: -0.1 },
  savingsBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  savingsText: { fontSize: 12, fontWeight: '800', color: GOLD, letterSpacing: -0.2 },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 18,
  },

  // Sections
  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  // Description
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.1,
  },
  expandBtn: { marginTop: 8 },
  expandBtnText: { fontSize: 13, fontWeight: '600', color: GOLD },

  // Macros
  macroRow: { flexDirection: 'row', gap: 8 },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.3)',
    height: 56,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stepperBtn: {
    width: 44,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnPlus: {
    backgroundColor: GOLD,
  },
  stepperQty: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // CTA button
  ctaWrap: { flex: 1 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderRadius: 14,
    height: 56,
    gap: 12,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBtnDisabled: {
    backgroundColor: '#2a2a2a',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.2,
  },
  ctaPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
});
