import { BRAND_YELLOW } from '../../constants/brand';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../services/productsService';
import { resolveMediaUrl } from '../../config/api.config';
import { lightImpact, selectionAsync } from '../../utils/haptics';

export const GRID_PADDING = 20;
export const CARD_GAP = 12;
const GOLD = BRAND_YELLOW;
const money = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

interface Props {
  product: Product;
  width: number;
  cartQuantity: number;
  isFavorited: boolean;
  isUhSubscribed?: boolean;
  onPress: () => void;
  onFavoritePress: (e: any) => void | Promise<void>;
  onAddToCart: (e: any) => void | Promise<void>;
  onUpdateQuantity: (delta: number) => void | Promise<void>;
  onUhCtaPress?: () => void;
}

export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[s.card, { width }]} accessible accessibilityLabel="Chargement du produit">
      <View style={[s.skeletonImage, { height: width * 1.05 }]} />
      <View style={s.body}>
        <View style={[s.skeletonLine, { width: '45%' }]} />
        <View style={s.skeletonLine} /><View style={[s.skeletonLine, { width: '70%' }]} />
        <View style={[s.skeletonLine, { height: 44, marginTop: 12 }]} />
      </View>
    </View>
  );
}

function ProductCard({ product, width, cartQuantity, isFavorited, isUhSubscribed = false,
  onPress, onFavoritePress, onAddToCart, onUpdateQuantity, onUhCtaPress }: Props) {
  const imageUri = resolveMediaUrl(product.images?.[0]);
  const [imageFailed, setImageFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const favoritePending = useRef(false);
  useEffect(() => setImageFailed(false), [imageUri]);

  const hasUhPrice = typeof product.uhPrice === 'number' && product.uhPrice > 0 && product.uhPrice < product.price;
  const memberPrice = isUhSubscribed && hasUhPrice;
  const discount = Math.max(0, Math.min(100, product.discount || 0));
  const price = memberPrice ? product.uhPrice! : product.price * (1 - discount / 100);
  const reduced = price < product.price;
  const inStock = product.stock == null || product.stock > 0;
  const atStockLimit = product.stock != null && cartQuantity >= product.stock;
  const exclusive = !!product.isUhExclusive && !isUhSubscribed;

  const changeCart = async (event: any, delta: number) => {
    event?.stopPropagation?.();
    if (pending.current || (delta > 0 && (!inStock || atStockLimit))) return;
    pending.current = true;
    setBusy(true);
    try {
      lightImpact();
      if (cartQuantity === 0 && delta > 0) await onAddToCart(event);
      else await onUpdateQuantity(delta);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={[s.card, { width }]}>
      <View style={[s.imageStage, { height: width * 1.05 }]}>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={'Voir ' + product.name}
          style={({ pressed }) => [s.productImageLink, pressed && s.pressed]}>
          {imageUri && !imageFailed
            ? <Image source={{ uri: imageUri }} resizeMode="contain" style={s.image} onError={() => setImageFailed(true)} />
            : <View style={s.imageFallback}><Ionicons name="cube-outline" size={38} color="#807A6B" /><Text style={s.imageFallbackText}>Photo à venir</Text></View>}
        </Pressable>
        {(discount > 0 && !memberPrice || product.isFeatured) && (
          <View style={s.badge}><Text style={s.badgeText}>{discount > 0 && !memberPrice ? '−' + discount + ' %' : 'SÉLECTION'}</Text></View>
        )}
        <Pressable style={s.favorite} accessibilityRole="button" accessibilityState={{ selected: isFavorited }}
          accessibilityLabel={(isFavorited ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + product.name}
          onPress={async (event) => {
            if (favoritePending.current) return;
            favoritePending.current = true;
            try { selectionAsync(); await onFavoritePress(event); } finally { favoritePending.current = false; }
          }}>
          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? '#AF334C' : '#27251F'} />
        </Pressable>
      </View>
      <View style={s.body}>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={product.name}>
          <Text style={s.brand} numberOfLines={1}>{product.brand || product.category}</Text>
          <Text style={s.name} numberOfLines={2}>{product.name}</Text>
        </Pressable>
        <View style={s.stockRow}>
          <View style={[s.stockDot, !inStock && s.stockDotEmpty]} />
          <Text style={s.stockText}>{inStock ? 'En stock' : 'Épuisé'}</Text>
        </View>
        <View style={s.priceRow}>
          <Text style={[s.price, memberPrice && s.memberPrice]}>{money(price)}<Text style={s.currency}> DT</Text></Text>
          {reduced && <Text style={s.oldPrice}>{money(product.price)} DT</Text>}
        </View>
        {exclusive ? (
          <Pressable style={s.cartButton} onPress={onUhCtaPress} accessibilityRole="button" accessibilityLabel="Découvrir l’abonnement UH">
            <Ionicons name="lock-closed-outline" size={16} color="#17140C" /><Text style={s.cartText}>Découvrir UH</Text>
          </Pressable>
        ) : cartQuantity > 0 ? (
          <View style={s.stepper}>
            <Pressable style={s.stepperButton} disabled={busy} onPress={(event) => changeCart(event, -1)}
              accessibilityRole="button" accessibilityLabel={'Diminuer la quantité de ' + product.name}>
              <Ionicons name={cartQuantity === 1 ? 'trash-outline' : 'remove'} size={18} color={GOLD} />
            </Pressable>
            {busy ? <ActivityIndicator size="small" color={GOLD} /> : <Text style={s.quantity}>{cartQuantity}</Text>}
            <Pressable style={[s.stepperButton, (busy || atStockLimit || !inStock) && s.disabled]}
              disabled={busy || atStockLimit || !inStock} onPress={(event) => changeCart(event, 1)}
              accessibilityRole="button" accessibilityLabel={'Augmenter la quantité de ' + product.name}>
              <Ionicons name="add" size={20} color={GOLD} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={({ pressed }) => [s.cartButton, !inStock && s.unavailable, pressed && s.pressed]}
            disabled={busy || !inStock} onPress={(event) => changeCart(event, 1)} accessibilityRole="button"
            accessibilityState={{ disabled: busy || !inStock, busy }} accessibilityLabel={'Ajouter au panier : ' + product.name}>
            {busy ? <ActivityIndicator size="small" color="#17140C" /> : <>
              <Ionicons name={inStock ? 'bag-add-outline' : 'time-outline'} size={17} color={inStock ? '#17140C' : '#AAA69B'} />
              <Text style={[s.cartText, !inStock && s.unavailableText]}>{inStock ? 'Ajouter' : 'Épuisé'}</Text>
            </>}
          </Pressable>
        )}
        {hasUhPrice && <Pressable style={s.memberOffer} onPress={onUhCtaPress} disabled={isUhSubscribed}
          accessibilityRole={isUhSubscribed ? 'text' : 'button'} accessibilityLabel={isUhSubscribed ? 'Tarif membre UH appliqué' : 'Découvrir le tarif membre UH'}>
          <Ionicons name={isUhSubscribed ? 'checkmark-circle-outline' : 'diamond-outline'} size={13} color={GOLD} />
          <Text style={s.memberText}>{isUhSubscribed ? 'Tarif membre UH' : money(product.uhPrice!) + ' DT avec UH'}</Text>
        </Pressable>}
      </View>
    </View>
  );
}
export default React.memo(ProductCard);

const s = StyleSheet.create({
  card: { backgroundColor: '#171917', borderRadius: 20, borderWidth: 1, borderColor: '#2A2D27', overflow: 'hidden' },
  imageStage: { backgroundColor: '#F8F7F3', overflow: 'hidden' },
  productImageLink: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, paddingTop: 35 },
  image: { width: '100%', height: '100%' },
  imageFallback: { alignItems: 'center', gap: 8 },
  imageFallbackText: { fontSize: 11, color: '#686457' },
  badge: { position: 'absolute', top: 10, left: 9, paddingVertical: 5, paddingHorizontal: 7, backgroundColor: '#E9E3D0', borderRadius: 6 },
  badgeText: { color: '#504323', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  favorite: { position: 'absolute', top: 3, right: 3, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 12 },
  brand: { color: GOLD, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  name: { color: '#F5F3EB', fontSize: 14, fontWeight: '600', lineHeight: 20, minHeight: 40 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  stockDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#A2B98F' },
  stockDotEmpty: { backgroundColor: '#9C978D' },
  stockText: { color: '#AEB4A7', fontSize: 10 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 5, marginTop: 9, marginBottom: 12, minHeight: 25 },
  price: { color: '#F5F3EB', fontSize: 20, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  currency: { fontSize: 11, fontWeight: '500', letterSpacing: 0 },
  memberPrice: { color: GOLD },
  oldPrice: { color: '#A6A89E', fontSize: 10, textDecorationLine: 'line-through' },
  cartButton: { minHeight: 44, backgroundColor: GOLD, borderRadius: 11, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  cartText: { fontSize: 12, fontWeight: '700', color: '#17140C' },
  unavailable: { backgroundColor: '#292C26' },
  unavailableText: { color: '#AAA69B' },
  stepper: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#22271D', borderWidth: 1, borderColor: '#4C4A32', borderRadius: 11 },
  stepperButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantity: { color: GOLD, fontSize: 15, fontWeight: '700' },
  memberOffer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingTop: 12, minHeight: 44 },
  memberText: { color: GOLD, fontSize: 10, flexShrink: 1 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.35 },
  skeletonImage: { backgroundColor: '#272A24' },
  skeletonLine: { height: 12, borderRadius: 5, backgroundColor: '#2C3028', marginBottom: 8 },
});

