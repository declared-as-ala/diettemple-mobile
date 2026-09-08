import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from '../types';
import { useCartStore } from '../store/cartStore';
import { useSubscription } from '../context/SubscriptionContext';
import { useSnackbar } from '../components/Snackbar';
import { resolveMediaUrl } from '../config/api.config';
import { promoService } from '../services/promoService';
import { shopStyles as s, shopColors as c, money } from '../components/boutique/shopStyles';

function CartPhoto({ uri }: { uri?: string }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.photo}>{uri && !failed ? <Image source={{ uri: resolveMediaUrl(uri) || undefined }} style={{ width: '100%', height: '100%' }} resizeMode="contain" onError={() => setFailed(true)} /> : <Ionicons name="image-outline" size={30} color="#888975" />}</View>;
}
export default function CartScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { items, loading, error, fetchCart, updateQuantity, removeFromCart, getTotalPrice, getDeliveryFee } = useCartStore();
  const { subscriptionState } = useSubscription();
  const member = subscriptionState.isActive;
  const { showSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [code, setCode] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number; subtotal: number } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState('');
  const subtotal = getTotalPrice(member);
  const delivery = items.length ? getDeliveryFee(member) : 0;
  const applied = promo?.subtotal === subtotal ? promo : null;
  const discount = applied?.discount || 0;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = Math.max(0, subtotal - discount + delivery);
  useEffect(() => { void fetchCart(); }, [fetchCart]);
  const change = async (id: string, quantity?: number) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { if (quantity === undefined) await removeFromCart(id); else await updateQuantity(id, quantity); }
    catch { showSnackbar({ message: 'Impossible de modifier le panier. Réessayez.' }); }
    finally { lock.current = false; setBusy(false); }
  };
  const applyPromo = async () => {
    if (!code.trim() || promoBusy || busy) return;
    setPromoBusy(true); setPromoError(''); setPromo(null);
    try {
      const result = await promoService.validatePromoCode(code.trim(), subtotal);
      if (!result.valid) setPromoError(result.message || 'Ce code ne peut pas être appliqué.');
      else setPromo({ code: result.code || code.trim(), discount: result.discount || 0, subtotal });
    } catch (e: any) { setPromoError(e.response?.data?.message || 'Impossible de vérifier ce code. Réessayez.'); }
    finally { setPromoBusy(false); }
  };
  return <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <StatusBar style="light" />
    <View style={s.header}><Pressable style={s.iconButton} accessibilityRole="button" accessibilityLabel="Retour" onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable><Text style={s.headerTitle}>Mon panier</Text><View style={styles.count}><Text style={styles.countText}>{count}</Text></View></View>
    {loading && !items.length ? <View style={s.empty}><ActivityIndicator color={c.gold} /><Text style={s.caption}>Chargement du panier…</Text></View> : !items.length ? <View style={s.empty}>
      <View style={styles.emptyIcon}><Ionicons name="bag-outline" size={48} color={c.gold} /></View><Text style={s.title}>{error ? 'Panier indisponible' : 'Votre prochaine étape commence ici.'}</Text><Text style={[s.caption, { textAlign: 'center' }]}>{error || 'Retrouvez vos essentiels nutrition et ajoutez vos favoris à votre panier.'}</Text><Pressable style={s.primary} onPress={() => error ? fetchCart() : navigation.navigate('Home')} accessibilityRole="button"><Text style={s.primaryText}>{error ? 'Réessayer' : 'Découvrir la boutique'}</Text></Pressable>
    </View> : <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>VOTRE SÉLECTION</Text><Text style={s.title}>Prêt pour la suite.</Text><Text style={s.caption}>{count} article{count > 1 ? 's' : ''} pour accompagner vos objectifs.</Text>
        <View style={styles.delivery}><Ionicons name="cube-outline" size={22} color={c.gold} /><View style={{ flex: 1 }}><Text style={styles.deliveryTitle}>{delivery === 0 ? 'La livraison vous est offerte' : `Encore ${money(Math.max(0, 200 - subtotal))} DT pour la livraison offerte`}</Text><View style={styles.track}><View style={[styles.progress, { width: `${Math.min(100, subtotal / 2)}%` }]} /></View></View></View>
        {items.map(({ product, quantity }) => {
          const price = member && product.uhPrice && product.uhPrice > 0 && product.uhPrice < product.price ? product.uhPrice : product.price * (1 - (product.discount || 0) / 100);
          return <View key={product._id} style={styles.item}>
            <Pressable style={styles.itemTop} accessibilityRole="button" accessibilityLabel={`Voir ${product.name}`} onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}>
              <CartPhoto uri={product.images?.[0]} /><View style={{ flex: 1 }}><Text style={s.eyebrow}>{product.brand || product.category}</Text><Text style={styles.name} numberOfLines={3}>{product.name}</Text><Text style={styles.unit}>{money(price)} DT / unité</Text></View>
            </Pressable>
            <View style={styles.itemBottom}><View style={styles.stepper}>
              <Pressable style={s.iconButton} disabled={busy || quantity <= 1} accessibilityRole="button" accessibilityLabel={`Diminuer ${product.name}`} onPress={() => change(product._id, quantity - 1)}><Ionicons name="remove" size={20} color={quantity <= 1 ? c.muted : c.gold} /></Pressable><Text style={styles.quantity}>{quantity}</Text>
              <Pressable style={s.iconButton} disabled={busy || quantity >= product.stock} accessibilityRole="button" accessibilityLabel={`Augmenter ${product.name}`} onPress={() => change(product._id, quantity + 1)}><Ionicons name="add" size={20} color={quantity >= product.stock ? c.muted : c.gold} /></Pressable>
            </View><Text style={styles.lineTotal}>{money(price * quantity)} DT</Text><Pressable style={s.iconButton} disabled={busy} accessibilityRole="button" accessibilityLabel={`Retirer ${product.name}`} onPress={() => change(product._id)}><Ionicons name="trash-outline" size={19} color={c.muted} /></Pressable></View>
          </View>;
        })}
        <View style={s.panel}><Text style={s.sectionTitle}>Un code privilège ?</Text><View style={styles.promoRow}><TextInput style={[s.input, { flex: 1 }]} value={code} onChangeText={text => { setCode(text); setPromo(null); setPromoError(''); }} placeholder="Code promo" placeholderTextColor={c.muted} autoCapitalize="characters" accessibilityLabel="Code promo" editable={!promoBusy} /><Pressable style={styles.apply} disabled={promoBusy || busy || !code.trim()} onPress={applyPromo} accessibilityRole="button" accessibilityLabel="Appliquer le code promo">{promoBusy ? <ActivityIndicator color={c.gold} /> : <Text style={styles.applyText}>Appliquer</Text>}</Pressable></View>{!!promoError && <Text style={s.error}>{promoError}</Text>}{applied && <Text style={styles.applied}>{applied.code} · −{money(discount)} DT appliqués</Text>}{promo && !applied && <Text style={s.caption}>Le panier a changé. Appliquez à nouveau votre code.</Text>}</View>
        <View style={s.panel}><Text style={s.sectionTitle}>Votre récapitulatif</Text><View style={s.row}><Text style={s.caption}>Sous-total{member ? ' membre UH' : ''}</Text><Text style={s.value}>{money(subtotal)} DT</Text></View><View style={s.row}><Text style={s.caption}>Livraison</Text><Text style={s.value}>{delivery ? `${money(delivery)} DT` : 'Offerte'}</Text></View>{discount > 0 && <View style={s.row}><Text style={s.caption}>Code {applied?.code}</Text><Text style={s.value}>−{money(discount)} DT</Text></View>}</View>
      </ScrollView>
      <View style={[s.footer, { paddingBottom: Math.max(16, insets.bottom) }]}><View style={s.row}><Text style={s.caption}>Total à commander</Text><Text style={s.total}>{money(total)} DT</Text></View><Pressable style={[s.primary, (busy || promoBusy) && s.disabled]} disabled={busy || promoBusy} accessibilityRole="button" accessibilityLabel="Passer la commande" onPress={() => navigation.navigate('DeliveryAddress', { subtotal, discount, deliveryFee: delivery, total, promoCode: applied?.code })}><Text style={s.primaryText}>Passer la commande</Text><Ionicons name="arrow-forward" size={20} color={c.ink} /></Pressable></View>
    </>}
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  count: { minWidth: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.panel }, countText: { color: c.gold, fontWeight: '700' },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, marginVertical: 24, backgroundColor: '#252C1B', borderRadius: 18 }, deliveryTitle: { color: '#D5DEC6', fontSize: 12, lineHeight: 18 }, track: { height: 4, borderRadius: 2, backgroundColor: '#444B34', marginTop: 10, overflow: 'hidden' }, progress: { height: 4, backgroundColor: c.gold },
  item: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 14, marginBottom: 14 }, itemTop: { flexDirection: 'row', alignItems: 'center', gap: 14 }, photo: { width: 86, height: 104, padding: 8, borderRadius: 14, backgroundColor: '#F8F7F1', alignItems: 'center', justifyContent: 'center' }, name: { color: c.text, fontSize: 15, lineHeight: 21, fontWeight: '600', marginTop: 7 }, unit: { color: c.muted, fontSize: 12, marginTop: 8 }, itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: c.border }, stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 15 }, quantity: { color: c.text, minWidth: 20, textAlign: 'center', fontWeight: '700' }, lineTotal: { flex: 1, color: c.gold, fontSize: 15, fontWeight: '700', textAlign: 'right' }, promoRow: { flexDirection: 'row', gap: 8, marginTop: 14 }, apply: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#303923', borderRadius: 13 }, applyText: { color: c.gold, fontSize: 12, fontWeight: '700' }, applied: { color: c.gold, marginTop: 12, fontSize: 12 }, emptyIcon: { padding: 30, borderRadius: 40, backgroundColor: c.panel },
});

