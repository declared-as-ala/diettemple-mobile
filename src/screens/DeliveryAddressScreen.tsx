import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useCartStore } from '../store/cartStore';
import { useOrdersStore } from '../store/ordersStore';
import { checkoutService } from '../services/checkoutService';
import { shopStyles as s, shopColors as c, money } from '../components/boutique/shopStyles';
import { validateCheckout, CheckoutFields } from '../utils/checkout';

export default function DeliveryAddressScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'DeliveryAddress'>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DeliveryAddress'>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { items, clearCart } = useCartStore();
  const [form, setForm] = useState<CheckoutFields>({ fullName: profile.name || user?.name || '', street: '', email: user?.email || '', phone: user?.phone || '' });
  const [errors, setErrors] = useState<Partial<CheckoutFields>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const fields = useRef<Partial<Record<keyof CheckoutFields, TextInput | null>>>({});
  const submit = async () => {
    if (lock.current) return;
    const validation = validateCheckout(form);
    setErrors(validation);
    const first = Object.keys(validation)[0] as keyof CheckoutFields | undefined;
    if (first) { fields.current[first]?.focus(); return; }
    if (!items.length) { setError('Votre panier est vide. Ajoutez un produit avant de commander.'); return; }
    lock.current = true; setLoading(true); setError('');
    try {
      const order = await checkoutService.createOrder({
        items: items.map(item => ({ productId: item.product._id, quantity: item.quantity })),
        deliveryAddress: { fullName: form.fullName.trim(), street: form.street.trim(), email: form.email.trim(), phone: form.phone.replace(/[\s().-]/g, '') },
        promoCode: params.promoCode,
      });
      useOrdersStore.getState().setLastOrder(order);
      // Once the order exists, a local storage failure must never invite a duplicate order.
      try { await clearCart(); } catch { useCartStore.setState({ items: [] }); }
      navigation.replace('PaymentSuccess', { orderId: order._id, order });
    } catch (e: any) { setError(e.response?.data?.message || 'La confirmation n’a pas pu être reçue. Vérifiez votre connexion avant de réessayer.'); }
    finally { lock.current = false; setLoading(false); }
  };
  const definitions: { key: keyof CheckoutFields; label: string; placeholder: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'fullName', label: 'Nom complet', placeholder: 'Votre nom et prénom', icon: 'person-outline' },
    { key: 'street', label: 'Adresse complète', placeholder: 'Rue, numéro, appartement, ville et code postal', icon: 'location-outline' },
    { key: 'email', label: 'Adresse e-mail', placeholder: 'vous@exemple.com', icon: 'mail-outline' },
    { key: 'phone', label: 'Numéro de téléphone', placeholder: '+216 XX XXX XXX', icon: 'call-outline' },
  ];
  return <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <StatusBar style="light" />
    <View style={s.header}><Pressable style={s.iconButton} disabled={loading} accessibilityRole="button" accessibilityLabel="Retour au panier" onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable><Text style={s.headerTitle}>Finaliser ma commande</Text><Ionicons name="bag-check-outline" size={24} color={c.gold} /></View>
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={s.eyebrow}>LA DERNIÈRE ÉTAPE</Text><Text style={s.title}>Vos essentiels arrivent bientôt.</Text><Text style={s.caption}>Quatre informations pour préparer votre livraison et vous envoyer la confirmation.</Text>
      <View style={[s.panel, { marginTop: 24 }]}><Text style={s.sectionTitle}>Vos coordonnées</Text>
        {definitions.map(({ key, label, placeholder, icon }) => <View key={key} style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}><Ionicons name={icon} size={17} color={c.gold} /><Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>{label}</Text></View>
          <TextInput ref={el => { fields.current[key] = el; }} style={[s.input, key === 'street' && { minHeight: 94, textAlignVertical: 'top' }, !!errors[key] && { borderColor: '#E7998D' }]} accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={c.muted} value={form[key]} editable={!loading} multiline={key === 'street'} autoCorrect={false} autoCapitalize={key === 'email' ? 'none' : key === 'fullName' ? 'words' : 'sentences'} keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'} autoComplete={key === 'fullName' ? 'name' : key === 'street' ? 'street-address' : key === 'phone' ? 'tel' : 'email'} onChangeText={value => { setForm(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); }} />
          {!!errors[key] && <Text style={s.error} accessibilityLiveRegion="polite">{errors[key]}</Text>}
          {key === 'street' && <Text style={[s.caption, { fontSize: 11, marginTop: 8 }]}>Précisez la ville et un repère utile pour le livreur.</Text>}
        </View>)}
      </View>
      <View style={s.panel}><Text style={s.sectionTitle}>Votre commande</Text>{items.map(item => <View key={item.product._id} style={s.row}><Text style={[s.caption, { flex: 1 }]}>{item.product.name}</Text><Text style={s.value}>× {item.quantity}</Text></View>)}<View style={s.row}><Text style={s.caption}>Sous-total</Text><Text style={s.value}>{money(params.subtotal)} DT</Text></View><View style={s.row}><Text style={s.caption}>Livraison</Text><Text style={s.value}>{params.deliveryFee ? `${money(params.deliveryFee)} DT` : 'Offerte'}</Text></View>{params.discount > 0 && <View style={s.row}><Text style={s.caption}>Réduction</Text><Text style={s.value}>−{money(params.discount)} DT</Text></View>}</View>
      <Text style={[s.caption, { marginTop: 18 }]}>Le montant définitif est confirmé à la validation. Vos coordonnées servent à traiter votre commande et sa livraison.</Text>
      {!!error && <View style={[s.panel, { borderColor: '#A96658' }]}><Text style={s.error} accessibilityRole="alert">{error}</Text></View>}
    </ScrollView>
    <View style={[s.footer, { paddingBottom: Math.max(16, insets.bottom) }]}><View style={s.row}><Text style={s.caption}>Total estimé</Text><Text style={s.total}>{money(params.total)} DT</Text></View><Pressable style={[s.primary, (loading || !items.length) && s.disabled]} disabled={loading || !items.length} onPress={submit} accessibilityRole="button" accessibilityLabel="Confirmer ma commande" accessibilityState={{ busy: loading, disabled: loading || !items.length }}>{loading ? <ActivityIndicator color={c.ink} /> : <><Text style={s.primaryText}>Confirmer ma commande</Text><Ionicons name="checkmark" size={21} color={c.ink} /></>}</Pressable></View>
  </KeyboardAvoidingView>;
}
