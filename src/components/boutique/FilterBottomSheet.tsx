import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_CHIPS, SORT_OPTIONS, type SortId } from './TopFilterBar';
import type { ProductFilters } from '../../services/productsService';

const GOLD = '#D4AF37';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  initialFilters: ProductFilters;
  onApply: (filters: ProductFilters) => void;
  onReset: () => void;
}

export default function FilterBottomSheet({
  visible,
  onClose,
  initialFilters,
  onApply,
  onReset,
}: FilterBottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const [category, setCategory] = React.useState(initialFilters.category ?? '');
  const [sort, setSort] = React.useState<SortId>((initialFilters.sort as SortId) ?? 'popular');
  const [inStock, setInStock] = React.useState(initialFilters.inStock ?? false);

  useEffect(() => {
    if (visible) {
      setCategory(initialFilters.category ?? '');
      setSort((initialFilters.sort as SortId) ?? 'popular');
      setInStock(initialFilters.inStock ?? false);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 28,
          stiffness: 200,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleApply = () => {
    onApply({
      ...initialFilters,
      category: category || undefined,
      sort: sort === 'popular' ? undefined : sort,
      inStock: inStock || undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setCategory('');
    setSort('popular');
    setInStock(false);
    onReset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Filtres</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Category */}
          <Text style={styles.sectionLabel}>Catégorie</Text>
          <View style={styles.chipsWrap}>
            {CATEGORY_CHIPS.map((chip) => (
              <Pressable
                key={chip.id || 'all'}
                style={[styles.chip, category === chip.id && styles.chipActive]}
                onPress={() => setCategory(chip.id)}
              >
                <Text style={[styles.chipText, category === chip.id && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Sort */}
          <Text style={styles.sectionLabel}>Trier par</Text>
          <View style={styles.chipsWrap}>
            {SORT_OPTIONS.filter((opt) => opt.id !== 'popular').map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.chip, sort === opt.id && styles.chipActive]}
                onPress={() => setSort(opt.id)}
              >
                <Text style={[styles.chipText, sort === opt.id && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* In stock toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>En stock uniquement</Text>
            <Switch
              value={inStock}
              onValueChange={setInStock}
              trackColor={{ false: '#2A2A2A', true: 'rgba(212,175,55,0.4)' }}
              thumbColor={inStock ? GOLD : '#666'}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Réinitialiser</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Appliquer</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.7,
    backgroundColor: '#0C0C0C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 34,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  scroll: {
    maxHeight: 320,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.35)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  chipTextActive: {
    color: GOLD,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  applyBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});
