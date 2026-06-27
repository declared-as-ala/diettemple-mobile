/**
 * Recettes: full-width cards, search + filter chips, add-to-journal with portion selector.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AppBackground from '../components/AppBackground';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useRecipeFavoritesStore } from '../store/recipeFavoritesStore';
import { useSnackbar } from '../components/Snackbar';
import { getRecipes } from '../services/recipesService';
import { meService } from '../services/meService';
import { getLocalDateKey } from '../utils/date';
import type { Recipe } from '../types';
import { Button } from '../components/Button';
import DrawerScreenContainer from '../components/DrawerScreenContainer';

const GOLD = '#D4AF37';
const PORTIONS = [0.5, 1, 1.5, 2] as const;
type Portion = typeof PORTIONS[number];

type CategoryFilter = 'all' | 'proteine' | 'rapide' | 'faible_kcal' | 'petit_dej' | 'dejeuner' | 'diner';
type PrepFilter = 'all' | '15' | '30' | '45' | '45+';
type MealPrepFilter = 'all' | 'today' | '2' | '3' | '4';

const CATEGORY_CHIPS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'proteine', label: 'Protéiné' },
  { key: 'rapide', label: 'Rapide' },
  { key: 'faible_kcal', label: 'Faible kcal' },
  { key: 'petit_dej', label: 'Petit-déj' },
  { key: 'dejeuner', label: 'Déjeuner' },
  { key: 'diner', label: 'Dîner' },
];

function matchesCategory(r: Recipe, cat: CategoryFilter): boolean {
  if (cat === 'all') return true;
  const tags = (r?.tags && Array.isArray(r.tags) ? r.tags : []).map((t) => String(t).toLowerCase());
  if (cat === 'proteine') return tags.some((t) => t.includes('protéin') || t.includes('proteine'));
  if (cat === 'rapide') return tags.some((t) => t.includes('rapide') || t.includes('express'));
  if (cat === 'faible_kcal') return (r.calories ?? 0) < 300;
  if (cat === 'petit_dej') return tags.some((t) => t.includes('petit') || t.includes('déj') || t.includes('breakfast'));
  if (cat === 'dejeuner') return tags.some((t) => t.includes('déjeuner') || t.includes('dejeuner') || t.includes('lunch'));
  if (cat === 'diner') return tags.some((t) => t.includes('dîner') || t.includes('diner') || t.includes('dinner'));
  return true;
}

function recipeIngredientsText(recipe: Recipe): string {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  return ingredients
    .map((i: any) => (typeof i === 'string' ? i : i?.name))
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
}

// ─── Add to journal modal ─────────────────────────────────────────────────────

interface AddToJournalModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onConfirm: (recipe: Recipe, portion: Portion) => Promise<void>;
  adding: boolean;
}

function AddToJournalModal({ recipe, onClose, onConfirm, adding }: AddToJournalModalProps) {
  const [portion, setPortion] = useState<Portion>(1);

  if (!recipe) return null;

  const kcal = Math.round((recipe.calories ?? 0) * portion);
  const prot = recipe.protein != null ? Math.round(recipe.protein * portion) : null;
  const carbs = recipe.carbs != null ? Math.round(recipe.carbs * portion) : null;
  const fat = recipe.fat != null ? Math.round(recipe.fat * portion) : null;

  return (
    <Modal visible={!!recipe} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modal.overlay} onPress={onClose}>
        <Pressable style={modal.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={modal.handle} />

          {/* Recipe image + title */}
          <View style={modal.header}>
            {(recipe.posterUrl || recipe.imageUrl) ? (
              <Image
                source={{ uri: recipe.posterUrl || recipe.imageUrl }}
                style={modal.thumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[modal.thumb, modal.thumbFallback]}>
                <Text style={{ fontSize: 32 }}>🍽️</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={modal.title} numberOfLines={2}>{recipe.title}</Text>
              <Text style={modal.subtitle}>Ajouter à votre journal du jour</Text>
            </View>
          </View>

          {/* Portion selector */}
          <Text style={modal.sectionLabel}>PORTION</Text>
          <View style={modal.portionRow}>
            {PORTIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[modal.portionBtn, portion === p && modal.portionBtnActive]}
                onPress={() => setPortion(p)}
                activeOpacity={0.8}
              >
                <Text style={[modal.portionBtnText, portion === p && modal.portionBtnTextActive]}>
                  {p === 0.5 ? '½' : `${p}×`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Computed macros */}
          <View style={modal.macroRow}>
            <View style={modal.macroBox}>
              <Text style={[modal.macroVal, { color: GOLD }]}>{kcal}</Text>
              <Text style={modal.macroLbl}>kcal</Text>
            </View>
            {prot != null && (
              <View style={modal.macroBox}>
                <Text style={[modal.macroVal, { color: '#FF6B9D' }]}>{prot}g</Text>
                <Text style={modal.macroLbl}>Protéines</Text>
              </View>
            )}
            {carbs != null && (
              <View style={modal.macroBox}>
                <Text style={[modal.macroVal, { color: '#60A5FA' }]}>{carbs}g</Text>
                <Text style={modal.macroLbl}>Glucides</Text>
              </View>
            )}
            {fat != null && (
              <View style={modal.macroBox}>
                <Text style={[modal.macroVal, { color: GOLD }]}>{fat}g</Text>
                <Text style={modal.macroLbl}>Lipides</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modal.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modal.confirmBtn}
              onPress={() => onConfirm(recipe, portion)}
              activeOpacity={0.85}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={18} color="#000" />
                  <Text style={modal.confirmBtnText}>Ajouter au journal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 20,
  },
  header: {
    flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 24,
  },
  thumb: {
    width: 72, height: 72, borderRadius: 14, backgroundColor: '#2A2A2E',
  },
  thumbFallback: {
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 16, fontWeight: '800', color: '#fff', lineHeight: 22, marginBottom: 4,
  },
  subtitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2, marginBottom: 12,
  },
  portionRow: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
  },
  portionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  portionBtnActive: {
    backgroundColor: GOLD, borderColor: GOLD,
  },
  portionBtnText: {
    fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.6)',
  },
  portionBtnTextActive: {
    color: '#000',
  },
  macroRow: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  macroBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  macroVal: {
    fontSize: 18, fontWeight: '900', letterSpacing: -0.5,
  },
  macroLbl: {
    fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 2,
  },
  actions: {
    flexDirection: 'row', gap: 10,
  },
  cancelBtn: {
    flex: 0.4, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)',
  },
  confirmBtn: {
    flex: 0.6, flexDirection: 'row', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14, fontWeight: '800', color: '#000',
  },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RecipeSkeletonCard({ colors }: { colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[styles.cardImage, { backgroundColor: colors.border }]} />
      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ height: 14, width: '70%', borderRadius: 7, backgroundColor: colors.border }} />
        <View style={{ height: 11, width: '40%', borderRadius: 6, backgroundColor: colors.border }} />
      </View>
    </View>
  );
}

// ─── Recipe card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  isFavorited,
  onToggleFavorite,
  onAdd,
  colors,
}: {
  recipe: Recipe;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onAdd: () => void;
  colors: any;
}) {
  const img = recipe.posterUrl || recipe.imageUrl;
  const hasMacros = recipe.protein != null || recipe.carbs != null || recipe.fat != null;
  const ingredientPreview = recipeIngredientsText(recipe);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Image */}
      <View style={styles.imageWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.imageFallback]}>
            <Text style={{ fontSize: 40 }}>🍽️</Text>
          </View>
        )}
        {/* Overlays */}
        <View style={styles.imageOverlay} />
        {recipe.calories ? (
          <View style={styles.kcalBadge}>
            <Text style={styles.kcalVal}>{recipe.calories}</Text>
            <Text style={styles.kcalUnit}> kcal</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.heartBtn} onPress={onToggleFavorite} hitSlop={8}>
          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? GOLD : 'rgba(255,255,255,0.7)'} />
        </TouchableOpacity>
        {(recipe.tags || [])[0] ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>{(recipe.tags || [])[0]}</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Ingredients preview */}
        {ingredientPreview.length > 0 && (
          <Text style={[styles.ingredients, { color: colors.textSecondary }]} numberOfLines={1}>
            {ingredientPreview}
          </Text>
        )}
        <View style={styles.recipeMetaRow}>
          {recipe.preparationTimeMinutes != null && (
            <Text style={styles.recipeMetaText}>{recipe.preparationTimeMinutes} min</Text>
          )}
          {recipe.isBatchCookingFriendly && (
            <Text style={styles.recipeMetaText}>Batch cooking {(recipe.mealPrepDays || []).join('/') || ''} jours</Text>
          )}
        </View>
        {recipe.ingredientMatch && (
          <View style={styles.matchBox}>
            <Text style={styles.matchText}>Tu as {recipe.ingredientMatch.availableCount}/{recipe.ingredientMatch.totalRequired} ingrédients ({recipe.ingredientMatch.matchPercentage}%)</Text>
            {recipe.ingredientMatch.missingCount > 0 ? (
              <Text style={styles.matchMissingText}>Il manque: {recipe.ingredientMatch.missingIngredients.join(', ')}</Text>
            ) : (
              <Text style={styles.matchOkText}>Tu peux préparer cette recette avec tes ingrédients ✅</Text>
            )}
          </View>
        )}

        {/* Macros row */}
        {hasMacros && (
          <View style={styles.macroRow}>
            {recipe.protein != null && (
              <View style={[styles.pill, { backgroundColor: 'rgba(255,107,157,0.12)', borderColor: 'rgba(255,107,157,0.2)' }]}>
                <Text style={[styles.pillText, { color: '#FF6B9D' }]}>P {recipe.protein}g</Text>
              </View>
            )}
            {recipe.carbs != null && (
              <View style={[styles.pill, { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.2)' }]}>
                <Text style={[styles.pillText, { color: '#60A5FA' }]}>G {recipe.carbs}g</Text>
              </View>
            )}
            {recipe.fat != null && (
              <View style={[styles.pill, { backgroundColor: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.2)' }]}>
                <Text style={[styles.pillText, { color: GOLD }]}>L {recipe.fat}g</Text>
              </View>
            )}
          </View>
        )}

        {/* Add button */}
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={17} color="#000" />
          <Text style={styles.addBtnText}>Ajouter au journal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RecettesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { token } = useAuthStore();
  const { showSnackbar } = useSnackbar();
  const { favoriteIds, fetchFavorites, addFavorite, removeFavorite, isFavorited } = useRecipeFavoritesStore();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabFilter, setTabFilter] = useState<'all' | 'favorites'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [prepFilter, setPrepFilter] = useState<PrepFilter>('all');
  const [mealPrepFilter, setMealPrepFilter] = useState<MealPrepFilter>('all');
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState('');
  const [useIngredientsFilter, setUseIngredientsFilter] = useState(false);
  const [ingredientsModalVisible, setIngredientsModalVisible] = useState(false);

  // Add to journal
  const [addModalRecipe, setAddModalRecipe] = useState<Recipe | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const list = await getRecipes();
      setRecipes(Array.isArray(list.recipes) ? list.recipes : []);
      await fetchFavorites();
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, fetchFavorites]);

  useFocusEffect(
    useCallback(() => {
      if (token) load();
    }, [token, load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const addAvailableIngredient = useCallback(() => {
    const val = ingredientInput.trim();
    if (!val) return;
    setAvailableIngredients((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setIngredientInput('');
  }, [ingredientInput]);

  const removeAvailableIngredient = useCallback((value: string) => {
    setAvailableIngredients((prev) => prev.filter((i) => i !== value));
  }, []);

  const applyIngredientsFilter = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecipes({
        ingredients: availableIngredients,
        matchMode: 'partial',
      });
      setRecipes(res.recipes || []);
      setUseIngredientsFilter(true);
      setIngredientsModalVisible(false);
    } catch {
      showSnackbar({ message: 'Impossible de charger les recettes pour le moment.', duration: 2600 });
    } finally {
      setLoading(false);
    }
  }, [availableIngredients, showSnackbar]);

  const handleToggleFavorite = async (recipe: Recipe) => {
    if (isFavorited(recipe._id)) {
      await removeFavorite(recipe._id);
      showSnackbar({ message: 'Retiré des favoris', duration: 2000 });
    } else {
      await addFavorite(recipe._id);
      showSnackbar({ message: 'Ajouté aux favoris ❤️', duration: 2000 });
    }
  };

  const handleAddToJournal = async (recipe: Recipe, portion: Portion) => {
    setAdding(true);
    try {
      const todayKey = getLocalDateKey(new Date());
      await meService.postNutritionLogEntry(todayKey, {
        items: [{
          name: recipe.title,
          grams: Math.round(100 * portion),
          kcal: Math.round((recipe.calories ?? 0) * portion),
          protein: Math.round((recipe.protein ?? 0) * portion),
          carbs: Math.round((recipe.carbs ?? 0) * portion),
          fat: Math.round((recipe.fat ?? 0) * portion),
        }],
      });
      setAddModalRecipe(null);
      showSnackbar({ message: `${recipe.title} ajouté au journal ✓`, duration: 2500 });
    } catch {
      showSnackbar({ message: 'Erreur lors de l\'ajout', duration: 2500 });
    } finally {
      setAdding(false);
    }
  };

  const safeRecipes = recipes ?? [];
  const filtered = useMemo(() => {
    let list = tabFilter === 'favorites' ? safeRecipes.filter((r) => (favoriteIds ?? []).includes(r._id)) : safeRecipes;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => (r?.title ?? '').toLowerCase().includes(q));
    }
    list = list.filter((r) => matchesCategory(r, categoryFilter));
    list = list.filter((r) => {
      if (prepFilter === 'all') return true;
      const prep = r.preparationTimeMinutes ?? null;
      if (prep == null) return false;
      if (prepFilter === '15') return prep <= 15;
      if (prepFilter === '30') return prep <= 30;
      if (prepFilter === '45') return prep <= 45;
      return prep > 45;
    });
    list = list.filter((r) => {
      if (mealPrepFilter === 'all') return true;
      if (mealPrepFilter === 'today') return !(r.mealPrepDays && r.mealPrepDays.length);
      const day = Number(mealPrepFilter);
      return (r.mealPrepDays || []).includes(day);
    });
    return list;
  }, [recipes, favoriteIds, tabFilter, search, categoryFilter, prepFilter, mealPrepFilter]);

  if (!token) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={[styles.loginMessage, { color: colors.text }]}>Vous devez être connecté</Text>
          <Button title="Se connecter" onPress={() => navigation.navigate('Login')} />
        </View>
      </AppBackground>
    );
  }

  if (loading && safeRecipes.length === 0) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <DrawerScreenContainer title="Recettes" backgroundColor="transparent">
          <View style={{ padding: 16, gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <RecipeSkeletonCard key={i} colors={colors} />
            ))}
          </View>
        </DrawerScreenContainer>
      </AppBackground>
    );
  }

  return (
    <AppBackground useSafeArea={false}>
      <DrawerScreenContainer title="Recettes" backgroundColor="transparent">
        <StatusBar style="light" />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              isFavorited={isFavorited(item._id)}
              onToggleFavorite={() => handleToggleFavorite(item)}
              onAdd={() => setAddModalRecipe(item)}
              colors={colors}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Search */}
              <View style={[styles.searchWrap, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Rechercher une recette…"
                  placeholderTextColor={colors.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Tous / Favoris */}
              <View style={styles.tabRow}>
                {(['all', 'favorites'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tabChip, tabFilter === t && styles.tabChipActive, { borderColor: colors.border }]}
                    onPress={() => setTabFilter(t)}
                  >
                    {t === 'favorites' && (
                      <Ionicons name="heart" size={15} color={tabFilter === 'favorites' ? '#000' : colors.textSecondary} style={{ marginRight: 5 }} />
                    )}
                    <Text style={[styles.tabChipText, { color: tabFilter === t ? '#000' : colors.text }]}>
                      {t === 'all' ? 'Tous' : 'Favoris'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {CATEGORY_CHIPS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.categoryChip, categoryFilter === key && styles.categoryChipActive, { borderColor: colors.border }]}
                    onPress={() => setCategoryFilter(key)}
                  >
                    <Text style={[styles.categoryChipText, { color: categoryFilter === key ? '#000' : colors.text }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {[
                  { key: 'all', label: 'Temps: Tous' },
                  { key: '15', label: '≤ 15 min' },
                  { key: '30', label: '≤ 30 min' },
                  { key: '45', label: '≤ 45 min' },
                  { key: '45+', label: '+45 min' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.categoryChip, prepFilter === (item.key as PrepFilter) && styles.categoryChipActive, { borderColor: colors.border }]}
                    onPress={() => setPrepFilter(item.key as PrepFilter)}
                  >
                    <Text style={[styles.categoryChipText, { color: prepFilter === (item.key as PrepFilter) ? '#000' : colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {[
                  { key: 'all', label: 'Préparer pour plusieurs jours: Tous' },
                  { key: 'today', label: "Aujourd'hui seulement" },
                  { key: '2', label: '2 jours' },
                  { key: '3', label: '3 jours' },
                  { key: '4', label: '4 jours' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.categoryChip, mealPrepFilter === (item.key as MealPrepFilter) && styles.categoryChipActive, { borderColor: colors.border }]}
                    onPress={() => setMealPrepFilter(item.key as MealPrepFilter)}
                  >
                    <Text style={[styles.categoryChipText, { color: mealPrepFilter === (item.key as MealPrepFilter) ? '#000' : colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.ingredientsFilterRow}>
                <TouchableOpacity
                  style={[styles.ingredientsCta, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                  onPress={() => setIngredientsModalVisible(true)}
                >
                  <Ionicons name="basket-outline" size={16} color={colors.text} />
                  <Text style={[styles.ingredientsCtaText, { color: colors.text }]}>Recettes avec mes ingrédients</Text>
                </TouchableOpacity>
                {(useIngredientsFilter || prepFilter !== 'all' || mealPrepFilter !== 'all') && (
                  <TouchableOpacity
                    style={styles.resetFiltersBtn}
                    onPress={async () => {
                      setUseIngredientsFilter(false);
                      setPrepFilter('all');
                      setMealPrepFilter('all');
                      setAvailableIngredients([]);
                      setLoading(true);
                      try {
                        const res = await getRecipes();
                        setRecipes(res.recipes || []);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Text style={styles.resetFiltersText}>Réinitialiser les filtres</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Results count */}
              {(search.trim() || categoryFilter !== 'all') && (
                <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                  {filtered.length} recette{filtered.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {tabFilter === 'favorites' ? 'Aucune recette favorite' : 'Aucun résultat'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {categoryFilter !== 'all' || search.trim() ? 'Modifiez les filtres.' : 'Les recettes apparaîtront ici.'}
              </Text>
            </View>
          }
        />

        {/* Add to journal modal */}
        <AddToJournalModal
          recipe={addModalRecipe}
          onClose={() => setAddModalRecipe(null)}
          onConfirm={handleAddToJournal}
          adding={adding}
        />

        <Modal visible={ingredientsModalVisible} transparent animationType="slide" onRequestClose={() => setIngredientsModalVisible(false)}>
          <Pressable style={modal.overlay} onPress={() => setIngredientsModalVisible(false)}>
            <Pressable style={modal.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={modal.handle} />
              <Text style={styles.modalTitle}>Ingrédients disponibles</Text>
              <View style={[styles.searchWrap, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Ajouter mes ingrédients"
                  placeholderTextColor={colors.textSecondary}
                  value={ingredientInput}
                  onChangeText={setIngredientInput}
                  onSubmitEditing={addAvailableIngredient}
                />
                <TouchableOpacity onPress={addAvailableIngredient}>
                  <Ionicons name="add-circle" size={22} color={GOLD} />
                </TouchableOpacity>
              </View>
              <View style={styles.ingredientsChipsRow}>
                {availableIngredients.map((ing) => (
                  <TouchableOpacity key={ing} style={styles.availableIngredientChip} onPress={() => removeAvailableIngredient(ing)}>
                    <Text style={styles.availableIngredientChipText}>{ing}</Text>
                    <Ionicons name="close" size={14} color="#000" />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.findRecipesBtn} onPress={applyIngredientsFilter} disabled={availableIngredients.length === 0}>
                <Text style={styles.findRecipesBtnText}>Trouver des recettes</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </DrawerScreenContainer>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loginMessage: { fontSize: 18, fontWeight: '600', marginBottom: 24, textAlign: 'center' },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  listHeader: { paddingTop: 8, paddingBottom: 4, gap: 12 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 2 },

  tabRow: { flexDirection: 'row', gap: 10 },
  tabChip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
  },
  tabChipActive: { backgroundColor: GOLD },
  tabChipText: { fontSize: 14, fontWeight: '700' },

  chipsScroll: { gap: 8, paddingVertical: 2 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryChipActive: { backgroundColor: GOLD },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  ingredientsFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ingredientsCta: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flex: 1 },
  ingredientsCtaText: { fontSize: 13, fontWeight: '700' },
  resetFiltersBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  resetFiltersText: { color: GOLD, fontSize: 12, fontWeight: '700' },

  resultCount: { fontSize: 12, fontWeight: '600', marginTop: -4 },

  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 52, paddingHorizontal: 24,
    borderRadius: 18, borderWidth: 1, marginTop: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  // Card
  card: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 14,
  },
  imageWrap: { position: 'relative', height: 180 },
  cardImage: { width: '100%', height: '100%' },
  imageFallback: { backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  kcalBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  kcalVal: { fontSize: 17, fontWeight: '900', color: GOLD },
  kcalUnit: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  heartBtn: {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 6,
  },
  tagBadge: {
    position: 'absolute', top: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tagBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  cardBody: { padding: 14, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  ingredients: { fontSize: 12, lineHeight: 18 },
  recipeMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  recipeMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  matchBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 8 },
  matchText: { fontSize: 12, color: '#E5E7EB', fontWeight: '600' },
  matchMissingText: { fontSize: 11, color: '#FCA5A5', marginTop: 3, fontWeight: '600' },
  matchOkText: { fontSize: 11, color: '#86EFAC', marginTop: 3, fontWeight: '700' },

  macroRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: '700' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, backgroundColor: GOLD, borderRadius: 12,
    paddingVertical: 11, marginTop: 2,
  },
  addBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  ingredientsChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 12 },
  availableIngredientChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GOLD, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  availableIngredientChipText: { color: '#000', fontSize: 12, fontWeight: '700' },
  findRecipesBtn: { backgroundColor: GOLD, borderRadius: 12, alignItems: 'center', paddingVertical: 13, marginTop: 4 },
  findRecipesBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
});
