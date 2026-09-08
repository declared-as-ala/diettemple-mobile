import { BRAND_YELLOW } from '../../constants/brand';
import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProductCategoryOption } from '../../utils/productCategories';

const GOLD = BRAND_YELLOW;
export const SORT_OPTIONS = [
  { id: 'popular', label: 'Notre sélection' },
  { id: 'newest', label: 'Nouveautés' },
  { id: 'price-asc', label: 'Prix croissant' },
  { id: 'price-desc', label: 'Prix décroissant' },
] as const;
export type SortId = (typeof SORT_OPTIONS)[number]['id'];

interface Props {
  categories: ProductCategoryOption[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategoryId: string;
  onCategorySelect: (id: string) => void;
  filterBadgeCount: number;
  onFilterPress: () => void;
  activeFilterChips?: { id: string; label: string }[];
  onRemoveFilterChip: (id: string) => void;
}

export default function TopFilterBar({ categories, searchValue, onSearchChange, selectedCategoryId,
  onCategorySelect, filterBadgeCount, onFilterPress, activeFilterChips = [], onRemoveFilterChip }: Props) {
  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <View style={s.search}>
          <Ionicons name="search-outline" size={21} color="#A9AFA2" />
          <TextInput style={s.input} placeholder="Rechercher un produit…" placeholderTextColor="#8B9284"
            accessibilityLabel="Rechercher un produit" value={searchValue} onChangeText={onSearchChange}
            returnKeyType="search" autoCorrect={false} autoCapitalize="none" />
          {!!searchValue && <Pressable onPress={() => onSearchChange('')} style={s.clear}
            accessibilityRole="button" accessibilityLabel="Effacer la recherche">
            <Ionicons name="close-circle" size={18} color="#B8BBAF" />
          </Pressable>}
        </View>
        <Pressable onPress={onFilterPress} style={[s.filters, filterBadgeCount > 0 && s.filtersActive]}
          accessibilityRole="button" accessibilityLabel={'Ouvrir les filtres, ' + filterBadgeCount + ' actifs'}>
          <Ionicons name="options-outline" size={23} color={filterBadgeCount ? '#18180F' : GOLD} />
          {filterBadgeCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{filterBadgeCount}</Text></View>}
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}
        keyboardShouldPersistTaps="handled">
        {categories.map((category) => {
          const active = selectedCategoryId === category.id;
          return <Pressable key={category.id} onPress={() => onCategorySelect(category.id)}
            style={[s.category, active && s.categoryActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
            <Text style={[s.categoryText, active && s.categoryTextActive]}>{category.label}</Text>
            {active && <View style={s.categoryDot} />}
          </Pressable>;
        })}
      </ScrollView>
      {activeFilterChips.length > 0 && <View style={s.applied}>
        {activeFilterChips.map((chip) => <Pressable key={chip.id} style={s.appliedChip}
          onPress={() => onRemoveFilterChip(chip.id)} accessibilityRole="button" accessibilityLabel={'Retirer le filtre ' + chip.label}>
          <Text style={s.appliedText}>{chip.label}</Text><Ionicons name="close" size={15} color={GOLD} />
        </Pressable>)}
      </View>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingTop: 18 },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#191D17', borderWidth: 1, borderColor: '#343A2D', borderRadius: 15, paddingLeft: 14 },
  input: { flex: 1, minWidth: 0, minHeight: 52, color: '#F5F3EB', fontSize: 14, paddingHorizontal: 10, paddingVertical: 12 },
  clear: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  filters: { width: 52, height: 52, borderRadius: 15, backgroundColor: '#23271D', borderWidth: 1, borderColor: '#44432B', alignItems: 'center', justifyContent: 'center' },
  filtersActive: { backgroundColor: GOLD, borderColor: GOLD },
  badge: { position: 'absolute', top: -5, right: -5, borderRadius: 10, backgroundColor: '#F5F3EB', minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#10130F' },
  badgeText: { color: '#171A12', fontSize: 10, fontWeight: '800' },
  categories: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 9 },
  category: { minHeight: 44, paddingHorizontal: 17, borderRadius: 24, backgroundColor: '#191D17', borderWidth: 1, borderColor: '#30362B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  categoryActive: { backgroundColor: GOLD, borderColor: GOLD },
  categoryText: { color: '#B8BFAE', fontSize: 12, fontWeight: '600' },
  categoryTextActive: { color: '#1C1B11', fontWeight: '800' },
  categoryDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#1C1B11' },
  applied: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 8 },
  appliedChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  appliedText: { fontSize: 11, color: GOLD },
});

