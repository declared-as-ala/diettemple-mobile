import { BRAND_YELLOW } from '../constants/brand';
/**
 * Recettes: full-width cards, search + filter chips, add-to-journal with portion selector.
 */
import React, { useState, useCallback, useMemo, useRef, useContext } from 'react';
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
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import AppBackground from '../components/AppBackground';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_RECIPE_SELECTION, RECIPE_CATEGORIES, selectRecipes, type RecipeSelection } from '../utils/recipeSelection';
import { useAuthStore } from '../store/authStore';
import { useRecipeFavoritesStore } from '../store/recipeFavoritesStore';
import { useSnackbar } from '../components/Snackbar';
import { getAllRecipes } from '../services/recipesService';
import { meService } from '../services/meService';
import { getLocalDateKey } from '../utils/date';
import type { Recipe } from '../types';
import { Button } from '../components/Button';
import DrawerScreenContainer from '../components/DrawerScreenContainer';

import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { resolveMediaUrl } from '../config/api.config';

const GOLD = BRAND_YELLOW;
const PORTIONS = [0.5, 1, 1.5, 2] as const;
type Portion = typeof PORTIONS[number];

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
                <Ionicons name="restaurant-outline" size={40} color={GOLD} />
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
  const img = resolveMediaUrl(recipe.posterUrl || recipe.imageUrl);
  const [failed, setFailed] = useState(false);
  const hasMacros = recipe.protein != null || recipe.carbs != null || recipe.fat != null;
  const ingredientPreview = recipeIngredientsText(recipe);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Image */}
      <View style={styles.imageWrap}>
        {img && !failed ? (
          <Image source={{ uri: img }} onError={() => setFailed(true)} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.imageFallback]}>
            <Ionicons name="restaurant-outline" size={40} color={GOLD} />
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
        <TouchableOpacity style={styles.heartBtn} onPress={onToggleFavorite} accessibilityRole="button" accessibilityLabel={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"} hitSlop={8}>
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

const PALETTE = { cardBackground: '#1D281A', border: '#35432C', text: '#F7F5E9', textSecondary: '#B6C0AC' };
function FilterChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress} style={[page.chip, selected && page.chipSelected]}><Text style={[page.chipText, selected && { color: '#182011' }]}>{label}</Text></Pressable>;
}
function RecipeFiltersSheet({ value, recipes, search, favorites, favoritesOnly, onClose, onApply }: { value: RecipeSelection; recipes: Recipe[]; search: string; favorites: string[]; favoritesOnly: boolean; onClose: () => void; onApply: (value: RecipeSelection) => void }) {
  const [draft, setDraft] = useState(value);
  const [input, setInput] = useState('');
  const insets = useSafeAreaInsets();
  const ingredients = [...new Set([...draft.ingredients, ...input.split(',').map(i => i.trim()).filter(Boolean)])];
  const effective = { ...draft, ingredients };
  const count = selectRecipes(recipes, effective, search, favorites, favoritesOnly).length;
  const group = (title: string, field: 'prep' | 'days' | 'sort' | 'match', options: string[][]) => <View style={page.group}><Text style={page.section}>{title}</Text><View style={page.wrap}>{options.map(([key, label]) => <FilterChip key={key} label={label} selected={draft[field] === key} onPress={() => setDraft({ ...draft, [field]: key })} />)}</View></View>;
  return <Modal transparent animationType="slide" onRequestClose={onClose}><View style={page.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer les filtres" /><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[page.sheet, { paddingBottom: Math.max(16, insets.bottom), maxHeight: '92%' }]}><View style={page.row}><Text style={page.sheetTitle}>À votre goût</Text><Pressable accessibilityLabel="Fermer les filtres" onPress={onClose} style={page.iconButton}><Ionicons name="close" size={24} color={PALETTE.text} /></Pressable></View><Text style={page.caption}>Combinez les critères pour trouver votre prochain repas.</Text><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={page.group}><Text style={page.section}>ENVIE DU MOMENT</Text><View style={page.wrap}>{RECIPE_CATEGORIES.map(c => <FilterChip key={c.key} label={c.label} selected={draft.category === c.key} onPress={() => setDraft({ ...draft, category: c.key })} />)}</View></View>
    {group('TEMPS DE PRÉPARATION', 'prep', [['all','Peu importe'],['15','≤ 15 min'],['30','≤ 30 min'],['45','≤ 45 min'],['45+','Plus de 45 min']])}
    {group('PRÉPARER À L’AVANCE', 'days', [['all','Tous'],['2','2 jours'],['3','3 jours'],['4','4 jours']])}
    <View style={page.group}><Text style={page.section}>DANS MON FRIGO</Text><Text style={page.caption}>Séparez les ingrédients par une virgule.</Text><View style={page.search}><TextInput accessibilityLabel="Ingrédients disponibles" placeholder="Poulet, riz, tomate…" placeholderTextColor={PALETTE.textSecondary} value={input} onChangeText={setInput} style={page.input} onSubmitEditing={() => { setDraft(effective); setInput(''); }} /><Pressable style={page.iconButton} accessibilityLabel="Ajouter les ingrédients" onPress={() => { setDraft(effective); setInput(''); }}><Ionicons name="add" size={23} color={GOLD} /></Pressable></View><View style={page.wrap}>{draft.ingredients.map(i => <FilterChip key={i} label={`${i} ×`} selected onPress={() => setDraft({ ...draft, ingredients: draft.ingredients.filter(x => x !== i) })} />)}</View></View>
    {group('CORRESPONDANCE DES INGRÉDIENTS', 'match', [['partial','Au moins un ingrédient'],['all','J’ai tous les ingrédients']])}
    {group('TRIER PAR', 'sort', [['recent','Nouveautés'],['time','Les plus rapides'],['calories','Calories croissantes']])}
  </ScrollView><View style={[page.row, { paddingTop: 12 }]}><Pressable style={page.iconButton} onPress={() => { setDraft(DEFAULT_RECIPE_SELECTION); setInput(''); }}><Text style={page.link}>Effacer</Text></Pressable><Pressable style={[page.apply, { flex: 1 }]} onPress={() => onApply(effective)}><Text style={page.applyText}>Voir {count} recette{count !== 1 ? 's' : ''}</Text></Pressable></View></KeyboardAvoidingView></View></Modal>;
}
export default function RecettesScreen() {
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const token = useAuthStore(s => s.token);
  const { showSnackbar } = useSnackbar();
  const { favoriteIds, fetchFavorites, addFavorite, removeFavorite, isFavorited } = useRecipeFavoritesStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<RecipeSelection>(DEFAULT_RECIPE_SELECTION);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [addModalRecipe, setAddModalRecipe] = useState<Recipe | null>(null);
  const [adding, setAdding] = useState(false);
  const addLock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setError(false);
    try { const all = await getAllRecipes(controller.signal); if (!controller.signal.aborted) setRecipes(all); }
    catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, []);
  useFocusEffect(useCallback(() => { if (token) { void load(); void fetchFavorites(); } return () => request.current?.abort(); }, [token, load, fetchFavorites]));
  const filtered = useMemo(() => selectRecipes(recipes, selection, search, favoriteIds, favoritesOnly), [recipes, selection, search, favoriteIds, favoritesOnly]);
  const reset = () => { setSelection(DEFAULT_RECIPE_SELECTION); setSearch(''); setFavoritesOnly(false); };
  const active = [selection.category !== 'all', selection.prep !== 'all', selection.days !== 'all', selection.ingredients.length > 0, selection.sort !== 'recent'].filter(Boolean).length;
  const handleAddToJournal = async (recipe: Recipe, portion: Portion) => {
    if (addLock.current) return; addLock.current = true; setAdding(true);
    try { await meService.postNutritionLogEntry(getLocalDateKey(new Date()), { items: [{ name: recipe.title, grams: Math.round(100 * portion), kcal: Math.round((recipe.calories ?? 0) * portion), protein: Math.round((recipe.protein ?? 0) * portion), carbs: Math.round((recipe.carbs ?? 0) * portion), fat: Math.round((recipe.fat ?? 0) * portion) }] }); setAddModalRecipe(null); showSnackbar({ message: 'Recette ajoutée au journal', duration: 2500 }); }
    catch { showSnackbar({ message: 'Impossible d’ajouter la recette. Réessayez.', duration: 3000 }); }
    finally { addLock.current = false; setAdding(false); }
  };
  if (!token) return <AppBackground><View style={styles.centered}><Text style={[styles.loginMessage, { color: PALETTE.text }]}>Connectez-vous pour découvrir les recettes</Text><Button title="Se connecter" onPress={() => navigation.navigate('Login')} /></View></AppBackground>;
  return <AppBackground useSafeArea={false}><DrawerScreenContainer title="Recettes" backgroundColor="#10190E"><StatusBar style="light" /><FlatList data={loading ? [] : filtered} keyExtractor={item => item._id} contentContainerStyle={[page.list, { paddingBottom: tabBarHeight + 32 + (tabBarHeight ? 0 : insets.bottom) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} tintColor={GOLD} onRefresh={() => { setRefreshing(true); void load(); }} />} renderItem={({ item }) => <RecipeCard recipe={item} colors={PALETTE} isFavorited={isFavorited(item._id)} onAdd={() => setAddModalRecipe(item)} onToggleFavorite={() => { void (isFavorited(item._id) ? removeFavorite(item._id) : addFavorite(item._id)); }} />} ListHeaderComponent={<View style={page.header}>
    <LinearGradient colors={['#344127','#1D2A17']} style={page.hero}><View style={page.heroBadge}><Ionicons name="leaf-outline" size={15} color={GOLD} /><Text style={page.eyebrow}>LE GOÛT DE BIEN MANGER</Text></View><Text style={page.heroTitle}>Du plaisir dans{ '\n' }votre assiette.</Text><Text style={page.heroText}>Des idées gourmandes, des ingrédients simples. Trouvez l’inspiration pour votre prochain repas.</Text><View style={page.heroFooter}><Ionicons name="restaurant-outline" size={18} color={GOLD} /><Text style={page.heroFooterText}>{loading ? 'Votre inspiration arrive…' : `${recipes.length} recettes à explorer`}</Text></View></LinearGradient>
    <View style={page.search}><Ionicons name="search-outline" size={21} color={GOLD} /><TextInput accessibilityLabel="Rechercher une recette" placeholder="Une recette, un ingrédient…" placeholderTextColor={PALETTE.textSecondary} style={page.input} value={search} onChangeText={setSearch} />{!!search && <Pressable accessibilityLabel="Effacer la recherche" style={page.iconButton} onPress={() => setSearch('')}><Ionicons name="close" size={20} color={PALETTE.text} /></Pressable>}</View>
    <View style={page.row}><View style={[page.row, { flex: 1 }]}><FilterChip label="Explorer" selected={!favoritesOnly} onPress={() => setFavoritesOnly(false)} /><FilterChip label="Favoris" selected={favoritesOnly} onPress={() => setFavoritesOnly(true)} /></View><Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les filtres" style={page.filterButton} onPress={() => setSheet(true)}><Ionicons name="options-outline" size={21} color={GOLD} /><Text style={page.link}>{active || 'Filtres'}</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{RECIPE_CATEGORIES.map(c => <FilterChip key={c.key} label={c.label} selected={selection.category === c.key} onPress={() => setSelection({ ...selection, category: c.key })} />)}</ScrollView>
    <View style={page.wrap}>{selection.prep !== 'all' && <FilterChip label={`Temps ${selection.prep === '45+' ? '> 45' : '≤ ' + selection.prep} min ×`} onPress={() => setSelection({ ...selection, prep: 'all' })} />}{selection.days !== 'all' && <FilterChip label={`${selection.days} jours ×`} onPress={() => setSelection({ ...selection, days: 'all' })} />}{selection.ingredients.map(i => <FilterChip key={i} label={`${i} ×`} onPress={() => setSelection({ ...selection, ingredients: selection.ingredients.filter(x => x !== i) })} />)}{selection.sort !== 'recent' && <FilterChip label={`${selection.sort === 'time' ? 'Plus rapides' : 'Calories'} ×`} onPress={() => setSelection({ ...selection, sort: 'recent' })} />}</View>
    <View style={page.row}><Text style={page.results}>{loading ? 'Chargement…' : `${filtered.length} recette${filtered.length !== 1 ? 's' : ''}`}</Text>{(active > 0 || !!search || favoritesOnly) && <Pressable onPress={reset} style={page.iconButton}><Text style={page.link}>Tout effacer</Text></Pressable>}</View>
    {error && <View style={page.empty}><Text style={page.section}>Chargement impossible</Text><Text style={page.caption}>Vérifiez votre connexion et réessayez.</Text><Pressable style={page.apply} onPress={() => { setLoading(true); void load(); }}><Text style={page.applyText}>Réessayer</Text></Pressable></View>}
  </View>} ListEmptyComponent={loading ? <RecipeSkeletonCard colors={PALETTE} /> : error ? null : <View style={page.empty}><Ionicons name={favoritesOnly ? 'heart-outline' : 'restaurant-outline'} size={36} color={GOLD} /><Text style={page.sheetTitle}>{favoritesOnly ? 'Vos favoris vous attendent' : 'Aucune recette trouvée'}</Text><Text style={page.caption}>{favoritesOnly ? 'Touchez le cœur d’une recette pour la retrouver ici.' : 'Essayez moins de critères ou un autre ingrédient.'}</Text><Pressable style={page.apply} onPress={reset}><Text style={page.applyText}>Explorer toutes les recettes</Text></Pressable></View>} />
    {sheet && <RecipeFiltersSheet value={selection} recipes={recipes} search={search} favorites={favoriteIds} favoritesOnly={favoritesOnly} onClose={() => setSheet(false)} onApply={next => { setSelection(next); setSheet(false); }} />}
    <AddToJournalModal key={addModalRecipe?._id || 'closed'} recipe={addModalRecipe} onClose={() => { if (!adding) setAddModalRecipe(null); }} onConfirm={handleAddToJournal} adding={adding} />
  </DrawerScreenContainer></AppBackground>;
}
const page = StyleSheet.create({
 list: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 720, alignSelf: 'center' }, header: { gap: 14, marginBottom: 14 },
 hero: { borderRadius: 26, padding: 24, borderWidth: 1, borderColor: '#4A5635', overflow: 'hidden' }, heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 }, eyebrow: { color: GOLD, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', flexShrink: 1 }, heroTitle: { fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -1, color: '#FAF7E9', marginVertical: 14 }, heroText: { fontSize: 14, lineHeight: 22, color: '#CFD5C1' }, heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#4A5635' }, heroFooterText: { color: '#E4E8D9', fontSize: 12, fontWeight: '600' },
 search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1D281A', borderWidth: 1, borderColor: '#3E4A32', borderRadius: 16, paddingLeft: 14, minHeight: 54 }, input: { flex: 1, minWidth: 0, color: '#F7F5E9', fontSize: 14, paddingVertical: 14 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#1D281A', borderWidth: 1, borderColor: '#3A472F', borderRadius: 14 }, chipSelected: { backgroundColor: GOLD, borderColor: GOLD }, chipText: { color: '#D6DECB', fontSize: 12, fontWeight: '700' }, filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: '#596035', borderRadius: 14 }, link: { color: GOLD, fontWeight: '700', fontSize: 12 }, results: { color: '#F7F5E9', fontSize: 18, fontWeight: '800' }, iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
 overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#172112', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, width: '100%', maxWidth: 720, alignSelf: 'center' }, sheetTitle: { color: '#F7F5E9', fontSize: 23, fontWeight: '800' }, caption: { color: '#B6C0AC', fontSize: 13, lineHeight: 21 }, group: { gap: 10, marginTop: 24 }, section: { color: '#E2E8D7', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, apply: { backgroundColor: GOLD, padding: 15, borderRadius: 14, alignItems: 'center', minHeight: 48 }, applyText: { color: '#182011', fontSize: 14, fontWeight: '800' }, empty: { backgroundColor: '#1D281A', padding: 24, borderRadius: 22, gap: 16, alignItems: 'center' },
});

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
    borderRadius: 24, borderWidth: 1, overflow: 'hidden', marginBottom: 14,
  },
  imageWrap: { position: 'relative', height: 230 },
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
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 12,
  },
  tagBadge: {
    position: 'absolute', top: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tagBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  cardBody: { padding: 18, gap: 12 },
  cardTitle: { fontSize: 20, fontWeight: '800', lineHeight: 27 },
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
