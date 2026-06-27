import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../services/productsService';
import { lightImpact, selectionAsync } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP) / 2;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 1.1);

const GOLD = '#D4AF37';
const GOLD_DIM = 'rgba(212,175,55,0.7)';
const CARD_BG = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  const pulse = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 60),
        Animated.timing(pulse, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, index]);

  return (
    <Animated.View style={[sk.card, { opacity: pulse }]}>
      <View style={sk.image} />
      <View style={sk.body}>
        <View style={sk.categoryLine} />
        <View style={sk.nameLine} />
        <View style={sk.nameLine2} />
        <View style={sk.priceLine} />
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#1A1A1A',
  },
  body: {
    padding: 14,
  },
  categoryLine: {
    width: 48,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#222',
    marginBottom: 10,
  },
  nameLine: {
    width: '85%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#222',
    marginBottom: 6,
  },
  nameLine2: {
    width: '55%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#222',
    marginBottom: 12,
  },
  priceLine: {
    width: '40%',
    height: 14,
    borderRadius: 6,
    backgroundColor: '#222',
  },
});

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardV2Props {
  product: Product;
  cartQuantity: number;
  isFavorited: boolean;
  isUhSubscribed?: boolean;
  onPress: () => void;
  onFavoritePress: (e: any) => void;
  onAddToCart: (e: any) => void;
  onUpdateQuantity: (delta: number) => void;
  onUhCtaPress?: () => void;
}

function ProductCardV2Base({
  product,
  cartQuantity,
  isFavorited,
  isUhSubscribed = false,
  onPress,
  onFavoritePress,
  onAddToCart,
  onUpdateQuantity,
  onUhCtaPress,
}: ProductCardV2Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const favScaleAnim = useRef(new Animated.Value(1)).current;
  const cartBtnScale = useRef(new Animated.Value(1)).current;

  const hasUhPrice = !!(product.uhPrice && product.uhPrice > 0 && product.uhPrice < product.price);

  const finalPrice =
    isUhSubscribed && hasUhPrice
      ? product.uhPrice!
      : product.discount && product.price
        ? product.price * (1 - product.discount / 100)
        : product.price ?? 0;

  const hasDiscount = !isUhSubscribed && !!(product.discount && product.discount > 0 && product.price);
  const inStock = product.stock === undefined || product.stock === null || product.stock > 0;

  // ── Press animation ──
  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  // ── Favorite ──
  const handleFavorite = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      selectionAsync();
      Animated.sequence([
        Animated.spring(favScaleAnim, { toValue: 1.3, useNativeDriver: true, speed: 60 }),
        Animated.spring(favScaleAnim, { toValue: 1, useNativeDriver: true, speed: 60 }),
      ]).start();
      onFavoritePress(e);
    },
    [favScaleAnim, onFavoritePress],
  );

  // ── Add to cart / stepper ──
  const handleAdd = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      lightImpact();
      Animated.sequence([
        Animated.spring(cartBtnScale, { toValue: 0.85, useNativeDriver: true, speed: 60 }),
        Animated.spring(cartBtnScale, { toValue: 1, useNativeDriver: true, speed: 60 }),
      ]).start();
      if (cartQuantity === 0) {
        onAddToCart(e);
      } else {
        onUpdateQuantity(1);
      }
    },
    [cartBtnScale, cartQuantity, onAddToCart, onUpdateQuantity],
  );

  const handleMinus = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      lightImpact();
      onUpdateQuantity(-1);
    },
    [onUpdateQuantity],
  );

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {/* ── Image ── */}
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri: product.images?.[0] || 'https://via.placeholder.com/300x330?text=Produit',
            }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Out of stock overlay */}
          {!inStock && (
            <View style={styles.outOfStockOverlay}>
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Rupture</Text>
              </View>
            </View>
          )}

          {/* Discount badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{product.discount}%</Text>
            </View>
          )}

          {/* Favorite button */}
          <Pressable
            style={[styles.favBtn, isFavorited && styles.favBtnActive]}
            onPress={handleFavorite}
            hitSlop={8}
          >
            <Animated.View style={{ transform: [{ scale: favScaleAnim }] }}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={16}
                color={isFavorited ? '#FF6B9D' : 'rgba(255,255,255,0.85)'}
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          {/* Category */}
          {!!product.category && (
            <Text style={styles.category} numberOfLines={1}>
              {String(product.category).toUpperCase()}
            </Text>
          )}

          {/* Name */}
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Price + Cart action row */}
          <View style={styles.priceActionRow}>
            <View style={styles.priceBlock}>
              {isUhSubscribed && hasUhPrice ? (
                <>
                  <Text style={[styles.price, { color: GOLD }]}>{Math.round(product.uhPrice!)} DT</Text>
                  <Text style={styles.strikePrice}>{Math.round(product.price)} DT</Text>
                </>
              ) : (
                <>
                  <Text style={styles.price}>{Math.round(finalPrice)} DT</Text>
                  {hasDiscount && (
                    <Text style={styles.strikePrice}>{Math.round(product.price!)} DT</Text>
                  )}
                </>
              )}
            </View>

            {/* Cart button (compact, right-aligned) */}
            {cartQuantity === 0 ? (
              <Animated.View style={{ transform: [{ scale: cartBtnScale }] }}>
                <Pressable
                  style={[styles.cartBtn, !inStock && styles.cartBtnDisabled]}
                  onPress={handleAdd}
                  disabled={!inStock}
                  hitSlop={4}
                >
                  <Ionicons name="add" size={18} color={inStock ? '#000' : '#555'} />
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.stepper}>
                <Pressable style={styles.stepperBtn} onPress={handleMinus} hitSlop={4}>
                  <Ionicons
                    name={cartQuantity === 1 ? 'trash-outline' : 'remove'}
                    size={14}
                    color={GOLD}
                  />
                </Pressable>
                <Text style={styles.stepperQty}>{cartQuantity}</Text>
                <Pressable
                  style={[styles.stepperBtn, styles.stepperBtnPlus]}
                  onPress={handleAdd}
                  hitSlop={4}
                >
                  <Ionicons name="add" size={14} color="#000" />
                </Pressable>
              </View>
            )}
          </View>

          {/* UH price teaser (non-subscriber only) */}
          {!isUhSubscribed && hasUhPrice && (
            <Pressable
              style={styles.uhTeaser}
              onPress={(e) => {
                e?.stopPropagation?.();
                onUhCtaPress?.();
              }}
              hitSlop={4}
            >
              <Ionicons name="lock-closed" size={10} color="rgba(212,175,55,0.6)" />
              <Text style={styles.uhTeaserText}>
                Prix UH: {Math.round(product.uhPrice!)} DT
              </Text>
            </Pressable>
          )}

          {/* UH badge (subscriber) */}
          {isUhSubscribed && hasUhPrice && (
            <View style={styles.uhBadge}>
              <Ionicons name="checkmark-circle" size={11} color={GOLD_DIM} />
              <Text style={styles.uhBadgeText}>Prix UH</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const ProductCardV2 = React.memo(ProductCardV2Base);
export default ProductCardV2;

// ─── Exported constants for grid layout ──────────────────────────────────────

export { CARD_WIDTH, GRID_PADDING, CARD_GAP, IMAGE_HEIGHT };

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardOuter: {
    width: CARD_WIDTH,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },

  // Image
  imageWrap: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#1A1A1A',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  // Overlays
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#E63946',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Favorite
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  favBtnActive: {
    backgroundColor: 'rgba(255,107,157,0.2)',
    borderColor: 'rgba(255,107,157,0.3)',
  },

  // Content
  content: {
    padding: 14,
    paddingTop: 12,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F0F0F0',
    lineHeight: 19,
    marginBottom: 10,
    letterSpacing: 0.1,
  },

  // Price + action row
  priceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    flexShrink: 1,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.1,
  },
  strikePrice: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },

  // Cart button (compact circle)
  cartBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtnDisabled: {
    backgroundColor: '#2A2A2A',
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 32,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnPlus: {
    backgroundColor: GOLD,
  },
  stepperQty: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  // UH teaser (locked)
  uhTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    alignSelf: 'flex-start',
  },
  uhTeaserText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(212,175,55,0.6)',
    letterSpacing: 0.2,
  },

  // UH badge (subscribed)
  uhBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  uhBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD_DIM,
    letterSpacing: 0.3,
  },
});
