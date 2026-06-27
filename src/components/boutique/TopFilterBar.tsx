import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#D4AF37';

export const CATEGORY_CHIPS = [
  { id: '', label: 'Tout', icon: 'apps-outline' },
  { id: 'whey', label: 'Whey', icon: 'water-outline' },
  { id: 'creatine', label: 'Créatine', icon: 'flash-outline' },
  { id: 'gainer', label: 'Gainer', icon: 'trending-up-outline' },
  { id: 'vitamines', label: 'Vitamines', icon: 'leaf-outline' },
  { id: 'pre-workout', label: 'Pré-workout', icon: 'flame-outline' },
];

export const SORT_OPTIONS = [
  { id: 'popular', label: 'Populaires' },
  { id: 'newest', label: 'Nouveautés' },
  { id: 'price-asc', label: 'Prix ↑' },
  { id: 'price-desc', label: 'Prix ↓' },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]['id'];

interface TopFilterBarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit?: () => void;
  selectedCategoryId: string;
  onCategorySelect: (id: string) => void;
  sortId: SortId;
  onSortSelect: (id: SortId) => void;
  filterBadgeCount: number;
  onFilterPress: () => void;
  activeFilterChips?: { id: string; label: string }[];
  onRemoveFilterChip?: (id: string) => void;
}

const DEBOUNCE_MS = 300;

// ─── Category Pill ───────────────────────────────────────────────────────────

function CategoryPill({
  chip,
  active,
  onPress,
}: {
  chip: (typeof CATEGORY_CHIPS)[number];
  active: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[styles.pill, active && styles.pillActive]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Ionicons
          name={chip.icon as any}
          size={15}
          color={active ? GOLD : 'rgba(255,255,255,0.4)'}
        />
        <Text style={[styles.pillText, active && styles.pillTextActive]}>
          {chip.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Filter Bar ─────────────────────────────────────────────────────────

export default function TopFilterBar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  selectedCategoryId,
  onCategorySelect,
  sortId,
  onSortSelect,
  filterBadgeCount,
  onFilterPress,
  activeFilterChips = [],
  onRemoveFilterChip,
}: TopFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setLocalSearch(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearchChange(text), DEBOUNCE_MS);
    },
    [onSearchChange],
  );

  const handleClearSearch = useCallback(() => {
    handleSearchChange('');
  }, [handleSearchChange]);

  return (
    <View style={styles.container}>
      {/* ── Search Row ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={localSearch}
            onChangeText={handleSearchChange}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {localSearch.length > 0 && (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.25)" />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.filterBtn, filterBadgeCount > 0 && styles.filterBtnActive]}
          onPress={onFilterPress}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filterBadgeCount > 0 ? GOLD : 'rgba(255,255,255,0.6)'}
          />
          {filterBadgeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterBadgeCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Category Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
        style={styles.pillsContainer}
      >
        {CATEGORY_CHIPS.map((chip) => (
          <CategoryPill
            key={chip.id || 'all'}
            chip={chip}
            active={selectedCategoryId === chip.id}
            onPress={() => onCategorySelect(chip.id)}
          />
        ))}
      </ScrollView>

      {/* ── Active Filter Chips ── */}
      {activeFilterChips.length > 0 && onRemoveFilterChip && (
        <View style={styles.activeChipsRow}>
          {activeFilterChips.map((chip) => (
            <Pressable
              key={chip.id}
              style={styles.activeChip}
              onPress={() => onRemoveFilterChip(chip.id)}
            >
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <Ionicons name="close" size={12} color={GOLD} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    paddingVertical: 0,
    letterSpacing: 0.1,
  },

  // Filter button
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: 'rgba(212,175,55,0.25)',
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: GOLD,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },

  // Pills
  pillsContainer: {
    marginBottom: 2,
  },
  pillsScroll: {
    gap: 8,
    paddingRight: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pillActive: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.3)',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  pillTextActive: {
    color: GOLD,
    fontWeight: '700',
  },

  // Active filter chips
  activeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    gap: 5,
  },
  activeChipText: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '600',
  },
});
