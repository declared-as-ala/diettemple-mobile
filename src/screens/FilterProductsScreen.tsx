import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useProductsStore } from '../store/productsStore';

type FilterProductsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FilterProducts'>;

const { width } = Dimensions.get('window');

interface FilterOption {
  id: string;
  label: string;
}

const objectifOptions: FilterOption[] = [
  { id: 'perte-poids', label: 'Perte de poids' },
  { id: 'prise-masse', label: 'Prise de masse' },
  { id: 'recomposition', label: 'Recomposition corporelle' },
];

const typeOptions: FilterOption[] = [
  { id: 'sans-sucre', label: 'Sans Sucre' },
  { id: 'sans-lactose', label: 'Sans Lactose' },
  { id: 'low-fat', label: 'Low Fat' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'sans-gluten', label: 'Sans Gluten' },
  { id: 'naturel', label: 'Naturel' },
  { id: 'bio', label: 'Bio' },
];

const omega3Options: FilterOption[] = [
  { id: 'sans-soja', label: 'Sans Soja' },
  { id: 'sans-cafeine', label: 'Sans Caféine' },
  { id: 'complet', label: 'Complet' },
];

export default function FilterProductsScreen() {
  const navigation = useNavigation<FilterProductsScreenNavigationProp>();
  const { colors } = useTheme();
  const { fetchProducts } = useProductsStore();
  
  const [selectedObjectif, setSelectedObjectif] = useState<string | null>('perte-poids');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['sans-lactose', 'low-fat']);
  const [selectedOmega3, setSelectedOmega3] = useState<string | null>(null);

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleApply = () => {
    // Apply filters and fetch products
    // For now, just navigate back - filters will be applied via store
    fetchProducts({ page: 1, limit: 20 });
    navigation.goBack();
  };

  const handleReset = () => {
    setSelectedObjectif(null);
    setSelectedTypes([]);
    setSelectedOmega3(null);
  };

  const renderFilterSection = (
    title: string,
    options: FilterOption[],
    selected: string | string[] | null,
    onSelect: (id: string) => void,
    multiSelect: boolean = false
  ) => {
    return (
      <View style={styles.filterSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const isSelected = multiSelect
              ? Array.isArray(selected) && selected.includes(option.id)
              : selected === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onSelect(option.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Filtrer par</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderFilterSection(
          'Objectif',
          objectifOptions,
          selectedObjectif,
          setSelectedObjectif,
          false
        )}

        {renderFilterSection(
          'Type',
          typeOptions,
          selectedTypes,
          handleTypeToggle,
          true
        )}

        {renderFilterSection(
          'Riche en Oméga-3',
          omega3Options,
          selectedOmega3,
          setSelectedOmega3,
          false
        )}
      </ScrollView>

      {/* Apply Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: '#D4AF37' }]}
          onPress={handleApply}
        >
          <Text style={styles.applyButtonText}>Appliquer</Text>
          <Ionicons name="chevron-forward" size={20} color="#000000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});


