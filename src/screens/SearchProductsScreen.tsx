import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { productsService } from '../services/productsService';
import { useProductsStore } from '../store/productsStore';
import { searchHistoryService } from '../services/searchHistoryService';
import AppLoader from '../components/AppLoader';

type SearchProductsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SearchProducts'>;

const { width } = Dimensions.get('window');

export default function SearchProductsScreen() {
  const navigation = useNavigation<SearchProductsScreenNavigationProp>();
  const { colors } = useTheme();
  const { fetchProducts } = useProductsStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await searchHistoryService.getHistory();
      setRecentSearches(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        loadSuggestions();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const results = await productsService.searchSuggestions(searchQuery);
      setSuggestions(results);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (query.trim().length > 0) {
      // Save to search history
      await searchHistoryService.addSearch(query);
      // Reload history to update the list
      await loadSearchHistory();
    }
    setSearchQuery(query);
    fetchProducts({ search: query, page: 1, limit: 20 });
    navigation.goBack();
  };

  const handleRemoveSearch = async (query: string, e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      await searchHistoryService.removeSearch(query);
      await loadSearchHistory();
    } catch (error) {
      console.error('Error removing search:', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await searchHistoryService.clearHistory();
      await loadSearchHistory();
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSearch(suggestion);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelButton, { color: colors.text }]}>Annuler</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions */}
      <View style={styles.suggestionsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <AppLoader variant="inline" size="sm" />
          </View>
        ) : suggestions.length > 0 ? (
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item}-${index}`}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSuggestionPress(item)}
              >
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.suggestionText, { color: colors.text }]}>{item}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        ) : searchQuery.length === 0 ? (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recherches récentes</Text>
              {recentSearches.length > 0 && (
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={[styles.clearButton, { color: colors.textSecondary }]}>Effacer</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentSearches.length > 0 ? (
              recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSuggestionPress(search)}
                >
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{search}</Text>
                  <TouchableOpacity
                    onPress={(e) => handleRemoveSearch(search, e)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyHistoryContainer}>
                <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>
                  Aucune recherche récente
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsContainer: {
    flex: 1,
    paddingTop: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  recentSearchesContainer: {
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
  },
  deleteButton: {
    padding: 4,
  },
  emptyHistoryContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    textAlign: 'center',
  },
});


