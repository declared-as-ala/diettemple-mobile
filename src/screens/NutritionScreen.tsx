import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import AppBackground from '../components/AppBackground';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { NutritionHeader } from '../components/nutrition/NutritionHeader';
import { ProgressCard } from '../components/nutrition/ProgressCard';
import { ActionButtons } from '../components/nutrition/ActionButtons';
import { EmptyState } from '../components/nutrition/EmptyState';
import { nutritionColors } from '../constants/nutritionColors';
import { useAuthStore } from '../store/authStore';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { useRecipeFavoritesStore } from '../store/recipeFavoritesStore';
import { useNutritionStore } from '../store/nutritionStore';
import { meService, type NutritionTargets, type NutritionTodayResponse } from '../services/meService';
import { getRecipes } from '../services/recipesService';
import { getLocalDateKey, addDays, formatShortDateFr } from '../utils/date';
import type { Recipe, RootStackParamList } from '../types';

type NavProp = StackNavigationProp<RootStackParamList, 'Recettes'>;
const GOLD = '#D4AF37';
const PORTIONS = [0.5, 1, 1.5, 2] as const;
type Portion = typeof PORTIONS[number];

// Keep current add-modal behavior but with cleaner styling.
interface AddModalProps {
  recipe: Recipe | null;
  adding: boolean;
  onClose: () => void;
  onConfirm: (recipe: Recipe, portion: Portion) => Promise<void>;
}

function AddToJournalModal({ recipe, adding, onClose, onConfirm }: AddModalProps) {
  const [portion, setPortion] = useState<Portion>(1);
  if (!recipe) return null;

  const kcal = Math.round((recipe.calories ?? 0) * portion);
  const prot = recipe.protein != null ? Math.round(recipe.protein * portion) : null;
  const carbs = recipe.carbs != null ? Math.round(recipe.carbs * portion) : null;
  const fat = recipe.fat != null ? Math.round(recipe.fat * portion) : null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={modal.overlay} onPress={onClose}>
        <Pressable style={modal.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={modal.handle} />
          <View style={modal.header}>
            {(recipe.posterUrl || recipe.imageUrl) ? (
              <Image source={{ uri: recipe.posterUrl || recipe.imageUrl }} style={modal.thumb} />
            ) : (
              <View style={[modal.thumb, modal.thumbFallback]}>
                <Ionicons name="restaurant-outline" size={28} color={GOLD} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={modal.title} numberOfLines={2}>{recipe.title}</Text>
              <Text style={modal.subtitle}>Ajouter au journal nutrition</Text>
            </View>
          </View>

          <Text style={modal.smallLabel}>PORTION</Text>
          <View style={modal.portionRow}>
            {PORTIONS.map((p) => {
              const active = p === portion;
              return (
                <TouchableOpacity
                  key={p}
                  style={[modal.portionBtn, active && modal.portionBtnActive]}
                  onPress={() => setPortion(p)}
                  activeOpacity={0.85}
                >
                  <Text style={[modal.portionBtnText, active && modal.portionBtnTextActive]}>
                    {p === 0.5 ? '1/2' : `${p}x`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={modal.stats}>
            <View style={modal.stat}>
              <Text style={[modal.statValue, { color: GOLD }]}>{kcal}</Text>
              <Text style={modal.statLabel}>kcal</Text>
            </View>
            {prot != null && (
              <View style={modal.stat}>
                <Text style={[modal.statValue, { color: '#FF6B9D' }]}>{prot}g</Text>
                <Text style={modal.statLabel}>Prot.</Text>
              </View>
            )}
            {carbs != null && (
              <View style={modal.stat}>
                <Text style={[modal.statValue, { color: '#60A5FA' }]}>{carbs}g</Text>
                <Text style={modal.statLabel}>Gluc.</Text>
              </View>
            )}
            {fat != null && (
              <View style={modal.stat}>
                <Text style={[modal.statValue, { color: GOLD }]}>{fat}g</Text>
                <Text style={modal.statLabel}>Lip.</Text>
              </View>
            )}
          </View>

          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={modal.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modal.confirmBtn}
              disabled={adding}
              onPress={() => onConfirm(recipe, portion)}
              activeOpacity={0.9}
            >
              {adding ? <ActivityIndicator size="small" color="#111" /> : <Text style={modal.confirmText}>Ajouter</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const AnimatedSection = memo(function AnimatedSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
});

type NutritionItem =
  | { key: 'progress'; type: 'progress' }
  | { key: 'actions'; type: 'actions' }
  | { key: 'recipes'; type: 'recipes' };

const RecipeRow = memo(function RecipeRow({
  recipe,
  onOpen,
  onAdd,
  onUnfavorite,
}: {
  recipe: Recipe;
  onOpen: (r?: Recipe) => void;
  onAdd: (r: Recipe) => void;
  onUnfavorite: (id: string) => void;
}) {
  return (
    <TouchableOpacity style={styles.recipeCard} onPress={() => onOpen(recipe)} activeOpacity={0.9}>
      <Image source={{ uri: recipe.imageUrl || recipe.posterUrl }} style={styles.recipeImage} />
      <View style={styles.recipeOverlay} />
      <View style={styles.recipeTop}>
        <View style={styles.kcalPill}>
          <Text style={styles.kcalPillText}>{recipe.calories ?? 0} kcal</Text>
        </View>
        <TouchableOpacity onPress={() => onUnfavorite(recipe._id)} hitSlop={8}>
          <Ionicons name="heart" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>
      <View style={styles.recipeBottom}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(recipe)} activeOpacity={0.85}>
          <Ionicons name="add" size={15} color="#111" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default function NutritionScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();
  const { isAvailable: isDrawerAvailable } = useDrawerOpen();
  const { favoriteIds, fetchFavorites, removeFavorite } = useRecipeFavoritesStore();

  const todayDateKey = getLocalDateKey(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);
  const [nutrition, setNutrition] = useState<NutritionTodayResponse | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalRecipe, setAddModalRecipe] = useState<Recipe | null>(null);
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (dateKey: string) => {
    if (!token) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const [nutRes, recipesRes] = await Promise.all([
        meService.getNutritionToday(dateKey).catch(() => null),
        getRecipes(),
      ]);
      if (controller.signal.aborted) return;
      setNutrition(nutRes ?? null);
      setRecipes(recipesRes?.recipes ?? []);
      if (nutRes) {
        useNutritionStore.getState().setNutritionForDate(dateKey, {
          targets: nutRes.targets ?? null,
          log: nutRes.log ?? null,
        });
      }
      await fetchFavorites();
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return;
      setNutrition(null);
      setRecipes([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [token, fetchFavorites]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    loadData(selectedDateKey);
  }, [token, selectedDateKey, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (token) loadData(selectedDateKey);
    }, [token, loadData, selectedDateKey])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(selectedDateKey);
  }, [loadData, selectedDateKey]);

  const handleAddToJournal = useCallback(async (recipe: Recipe, portion: Portion) => {
    setAdding(true);
    try {
      await meService.postNutritionLogEntry(selectedDateKey, {
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
      setAddSuccess(`${recipe.title} ajouté`);
      setTimeout(() => setAddSuccess(null), 2300);
      useNutritionStore.getState().invalidateDate(selectedDateKey);
      loadData(selectedDateKey);
    } finally {
      setAdding(false);
    }
  }, [selectedDateKey, loadData]);

  const safeRecipes = recipes ?? [];
  const targets: NutritionTargets | null = nutrition?.targets ?? null;
  const log = nutrition?.log ?? null;
  const consumedCal = log?.consumedCalories ?? 0;
  const consumedMacros = log?.consumedMacros ?? { proteinG: 0, carbsG: 0, fatG: 0 };
  const targetCal = targets?.dailyCalories ?? 2200;
  const targetProtein = targets?.proteinG ?? 150;
  const targetCarbs = targets?.carbsG ?? 200;
  const targetFat = targets?.fatG ?? 65;

  const favoriteRecipes = useMemo(
    () => safeRecipes.filter((r) => (favoriteIds ?? []).includes(r._id)),
    [safeRecipes, favoriteIds]
  );

  const dayOptions = useMemo(
    () => ([
      { key: todayDateKey, label: "Aujourd'hui" },
      { key: getLocalDateKey(addDays(new Date(), -1)), label: 'Hier' },
      { key: getLocalDateKey(addDays(new Date(), -2)), label: formatShortDateFr(addDays(new Date(), -2)) },
    ]),
    [todayDateKey]
  );
  const isSelectedToday = selectedDateKey === todayDateKey;
  const titleDateLabel = isSelectedToday
    ? "Aujourd'hui"
    : formatShortDateFr(new Date(`${selectedDateKey}T12:00:00`));

  const data: NutritionItem[] = useMemo(
    () => [{ key: 'progress', type: 'progress' }, { key: 'actions', type: 'actions' }, { key: 'recipes', type: 'recipes' }],
    []
  );

  const openRecipeList = useCallback((_recipe?: Recipe) => {
    (navigation.getParent() as any)?.navigate('Recettes');
  }, [navigation]);
  const openAddModal = useCallback((recipe: Recipe) => setAddModalRecipe(recipe), []);
  const onScanPress = useCallback(() => navigation.navigate('MealScan' as never), [navigation]);

  const renderItem: ListRenderItem<NutritionItem> = useCallback(({ item, index }) => {
    if (item.type === 'progress') {
      return (
        <AnimatedSection delay={index * 70}>
          <ProgressCard
            consumedCal={consumedCal}
            targetCal={targetCal}
            consumedProtein={consumedMacros.proteinG ?? 0}
            consumedCarbs={consumedMacros.carbsG ?? 0}
            consumedFat={consumedMacros.fatG ?? 0}
            targetProtein={targetProtein}
            targetCarbs={targetCarbs}
            targetFat={targetFat}
          />
        </AnimatedSection>
      );
    }

    if (item.type === 'actions') {
      return (
        <AnimatedSection delay={index * 70}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Action rapide</Text>
            <ActionButtons
              onScanPress={onScanPress}
              onRecipePress={() => openRecipeList()}
              scanDisabled={!isSelectedToday}
            />
          </View>
        </AnimatedSection>
      );
    }

    return (
      <AnimatedSection delay={index * 70}>
        <View style={styles.block}>
          <View style={styles.rowBetween}>
            <Text style={styles.blockLabel}>Recettes favorites</Text>
            {favoriteRecipes.length > 0 ? (
              <TouchableOpacity onPress={() => openRecipeList()} activeOpacity={0.8}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {favoriteRecipes.length === 0 ? (
            <EmptyState
              title="Aucune recette favorite"
              subtitle="Ajoutez vos recettes preferées pour les retrouver ici et les ajouter rapidement."
              ctaLabel="Explorer les recettes"
              onPress={() => openRecipeList()}
            />
          ) : (
            <FlatList
              horizontal
              data={favoriteRecipes}
              keyExtractor={(r) => r._id}
              contentContainerStyle={styles.recipeList}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: recipe }) => (
                <RecipeRow
                  recipe={recipe}
                  onOpen={openRecipeList}
                  onAdd={openAddModal}
                  onUnfavorite={removeFavorite}
                />
              )}
            />
          )}
        </View>
      </AnimatedSection>
    );
  }, [
    consumedCal,
    targetCal,
    consumedMacros,
    targetProtein,
    targetCarbs,
    targetFat,
    onScanPress,
    openRecipeList,
    isSelectedToday,
    favoriteRecipes,
    openAddModal,
    removeFavorite,
  ]);

  if (!token) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={styles.loginMessage}>Vous devez être connecté</Text>
          <Button title="Se connecter" onPress={() => navigation.navigate('Login' as never)} />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <DrawerScreenContainer
        title="Nutrition"
        backgroundColor="transparent"
        titleColor={nutritionColors.text}
        headerBorderColor="rgba(255,255,255,0.08)"
        leftAction={isDrawerAvailable ? undefined : <View style={{ width: 44, height: 44 }} />}
      >
        <StatusBar style="light" />
        {addSuccess ? (
          <View style={styles.successToast}>
            <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
            <Text style={styles.successToastText}>{addSuccess}</Text>
          </View>
        ) : null}

        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          ListHeaderComponent={(
            <NutritionHeader
              selectedDateKey={selectedDateKey}
              titleDateLabel={titleDateLabel}
              options={dayOptions}
              onSelectDate={setSelectedDateKey}
            />
          )}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(120, insets.bottom + 84) },
          ]}
          refreshing={refreshing}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={nutritionColors.gold} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews
          extraData={{ loading, selectedDateKey, favoriteCount: favoriteRecipes.length }}
        />

        <AddToJournalModal
          recipe={addModalRecipe}
          adding={adding}
          onClose={() => setAddModalRecipe(null)}
          onConfirm={handleAddToJournal}
        />
      </DrawerScreenContainer>
    </AppBackground>
  );
}

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#17181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#24262A',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  smallLabel: {
    marginBottom: 8,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  portionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  portionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 11,
    alignItems: 'center',
  },
  portionBtnActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  portionBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '800',
  },
  portionBtnTextActive: {
    color: '#111',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 0.4,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 0.6,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '900',
  },
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loginMessage: {
    fontSize: 16,
    color: nutritionColors.text,
    marginBottom: 20,
  },
  block: {
    gap: 10,
  },
  blockLabel: {
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.36)',
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: {
    color: nutritionColors.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  recipeList: {
    paddingRight: 4,
    gap: 10,
  },
  recipeCard: {
    width: 220,
    height: 164,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1C20',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  recipeImage: {
    ...StyleSheet.absoluteFillObject,
  },
  recipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  recipeTop: {
    paddingHorizontal: 10,
    paddingTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kcalPill: {
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  kcalPillText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },
  recipeBottom: {
    marginTop: 'auto',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  recipeTitle: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    marginBottom: 8,
  },
  addBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    backgroundColor: GOLD,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addBtnText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 12,
  },
  successToast: {
    position: 'absolute',
    zIndex: 90,
    top: 8,
    left: 16,
    right: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.32)',
  },
  successToastText: {
    color: '#4ADE80',
    fontWeight: '700',
    fontSize: 13,
  },
});

