import { BRAND_YELLOW } from '../../constants/brand';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Switch, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SORT_OPTIONS, type SortId } from './TopFilterBar';
import type { ProductFilters } from '../../services/productsService';
import type { ProductCategoryOption } from '../../utils/productCategories';

interface Props {
  visible: boolean;
  categories: ProductCategoryOption[];
  onClose: () => void;
  initialFilters: ProductFilters;
  onApply: (filters: ProductFilters) => void;
  onReset: () => void;
}
const GOLD = BRAND_YELLOW;

export default function FilterBottomSheet({ visible, categories, onClose, initialFilters, onApply, onReset }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortId>('popular');
  const [inStock, setInStock] = useState(false);
  useEffect(() => {
    if (visible) {
      setCategory(initialFilters.category || '');
      setSort(initialFilters.sort || 'popular');
      setInStock(!!initialFilters.inStock);
    }
  }, [visible, initialFilters.category, initialFilters.sort, initialFilters.inStock]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer les filtres" />
        <View style={[s.sheet, { maxHeight: height - insets.top - 24, paddingBottom: Math.max(20, insets.bottom) }]} accessibilityViewIsModal>
          <View style={s.handle} />
          <View style={s.heading}>
            <View><Text style={s.eyebrow}>VOTRE SÉLECTION</Text><Text style={s.title}>Affiner la recherche</Text></View>
            <Pressable onPress={onClose} style={s.close} accessibilityRole="button" accessibilityLabel="Fermer les filtres">
              <Ionicons name="close" size={23} color="#EDEFE7" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.section}>Catégories</Text>
            <View style={s.chips}>{categories.map((item) => <Pressable key={item.id}
              style={[s.chip, category === item.id && s.chipActive]} onPress={() => setCategory(item.id)}
              accessibilityRole="button" accessibilityState={{ selected: category === item.id }}>
              <Text style={[s.chipText, category === item.id && s.chipTextActive]}>{item.label}</Text>
            </Pressable>)}</View>
            <Text style={s.section}>Trier les produits</Text>
            {SORT_OPTIONS.map((item) => <Pressable key={item.id} style={s.sortRow} onPress={() => setSort(item.id)}
              accessibilityRole="radio" accessibilityState={{ checked: sort === item.id }}>
              <Text style={[s.sortText, sort === item.id && { color: GOLD }]}>{item.label}</Text>
              <Ionicons name={sort === item.id ? 'radio-button-on' : 'radio-button-off'} size={21} color={sort === item.id ? GOLD : '#7B8472'} />
            </Pressable>)}
            <View style={s.stockRow}>
              <View style={{ flex: 1 }}><Text style={s.stockTitle}>En stock uniquement</Text><Text style={s.stockCaption}>Afficher les produits disponibles</Text></View>
              <Switch value={inStock} onValueChange={setInStock} accessibilityLabel="En stock uniquement"
                trackColor={{ false: '#3C4235', true: '#82743F' }} thumbColor={inStock ? GOLD : '#C2C7B8'} />
            </View>
          </ScrollView>
          <View style={s.footer}>
            <Pressable style={s.reset} onPress={() => { onReset(); onClose(); }} accessibilityRole="button">
              <Text style={s.resetText}>Réinitialiser</Text>
            </Pressable>
            <Pressable style={s.apply} onPress={() => {
              onApply({ ...initialFilters, page: 1, category: category || undefined, sort, inStock: inStock || undefined });
              onClose();
            }} accessibilityRole="button"><Text style={s.applyText}>Voir les produits</Text><Ionicons name="arrow-forward" size={18} color="#17180E" /></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: { backgroundColor: '#171C14', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#3A412E', paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: '#59604F', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginBottom: 22 },
  eyebrow: { color: GOLD, fontSize: 10, letterSpacing: 1.6, fontWeight: '700', marginBottom: 7 },
  title: { color: '#F3F4EB', fontSize: 21, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#282F22', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 22, paddingBottom: 12 },
  section: { fontSize: 13, fontWeight: '700', color: '#F3F4EB', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 26 },
  chip: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 23, backgroundColor: '#252D20', borderWidth: 1, borderColor: '#3C4532' },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: '#CDD2C4', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#1B1C11' },
  sortRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#2D3527' },
  sortText: { fontSize: 14, color: '#CED3C5' },
  stockRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingTop: 24, paddingBottom: 12 },
  stockTitle: { fontSize: 14, fontWeight: '600', color: '#F3F4EB' },
  stockCaption: { fontSize: 11, color: '#A5AE99', marginTop: 5 },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 12, paddingHorizontal: 22 },
  reset: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 10 },
  resetText: { fontSize: 12, color: '#BCC5AE', fontWeight: '600' },
  apply: { flex: 1, minHeight: 50, borderRadius: 13, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 },
  applyText: { fontSize: 12, fontWeight: '800', color: '#17180E' },
});

