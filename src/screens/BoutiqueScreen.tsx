import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Animated,
} from 'react-native';
import AppBackground from '../components/AppBackground';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useProductsStore } from '../store/productsStore';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAuthStore } from '../store/authStore';
import { useSubscription } from '../context/SubscriptionContext';
import { useSnackbar } from '../components/Snackbar';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { Product, ProductFilters } from '../services/productsService';
import UHPremiumBanner from '../components/boutique/UHPremiumBanner';
import ProductCardV2, {
  ProductCardSkeleton,
  CARD_WIDTH,
  GRID_PADDING,
  CARD_GAP,
} from '../components/boutique/ProductCardV2';
import TopFilterBar, {
  CATEGORY_CHIPS,
  SORT_OPTIONS,
  type SortId,
} from '../components/boutique/TopFilterBar';
import FilterBottomSheet from '../components/boutique/FilterBottomSheet';

type BoutiqueScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Boutique'>;

const GOLD = '#D4AF37';
const SKELETON_COUNT = 6;

// ─── Header Icons ────────────────────────────────────────────────────────────

function HeaderIcons({
  cartCount,
  favCount,
  onCartPress,
  onFavPress,
}: {
  cartCount: number;
  favCount: number;
  onCartPress: () => void;
  onFavPress: () => void;
}) {
  return (
    <View style={headerStyles.row}>
      <Pressable
        style={({ pressed }) => [
          headerStyles.btn,
          pressed && headerStyles.btnPressed
        ]}
        onPress={onFavPress}
      >
        <Ionicons
          name={favCount > 0 ? 'heart' : 'heart-outline'}
          size={22}
          color={favCount > 0 ? '#FF6B9D' : 'rgba(255,255,255,0.8)'}
        />
        {favCount > 0 && (
          <View style={[headerStyles.badge, headerStyles.favBadge]}>
            <Text style={headerStyles.badgeText}>{favCount > 99 ? '99+' : favCount}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          headerStyles.btn,
          pressed && headerStyles.btnPressed
        ]}
        onPress={onCartPress}
      >
        <Ionicons name="bag-outline" size={22} color="rgba(255,255,255,0.8)" />
        {cartCount > 0 && (
          <View style={[headerStyles.badge, headerStyles.cartBadge]}>
            <Text style={headerStyles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  btnPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ scale: 0.95 }],
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2.5,
    borderColor: '#0C0C0C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  cartBadge: { backgroundColor: GOLD },
  favBadge: { backgroundColor: '#FF6B9D' },
  badgeText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: -0.3 },
});

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.iconRing}>
        <Ionicons name="search-outline" size={28} color="rgba(255,255,255,0.3)" />
      </View>
      <Text style={emptyStyles.title}>Aucun produit trouvé</Text>
      <Text style={emptyStyles.subtitle}>
        Essayez un autre terme ou réinitialisez les filtres.
      </Text>
      <Pressable style={emptyStyles.btn} onPress={onReset}>
        <Text style={emptyStyles.btnText}>Réinitialiser</Text>
      </Pressable>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 40 },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Result Count ────────────────────────────────────────────────────────────

function ResultCount({ count, loading }: { count: number; loading: boolean }) {
  if (loading || count === 0) return null;
  return (
    <View style={resultStyles.wrap}>
      <Text style={resultStyles.text}>
        {count} produit{count > 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const resultStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.3,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BoutiqueScreen() {
  const navigation = useNavigation<BoutiqueScreenNavigationProp>();
  const { showSnackbar } = useSnackbar();
  const {
    products,
    loading,
    fetchProducts,
    fetchFeaturedProducts,
    filters,
    setFilters,
    resetFilters,
  } = useProductsStore();
  const { getItemCount, getCartItem, fetchCart, addToCart, updateQuantity } = useCartStore();
  const { isFavorited, addFavorite, removeFavorite, favoriteProducts, fetchFavorites } =
    useFavoritesStore();
  const { isAuthenticated } = useAuthStore();
  const { subscriptionState } = useSubscription();
  const { isAvailable: isDrawerAvailable } = useDrawerOpen();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [sortId, setSortId] = useState<SortId>('popular');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const hasActiveSubscription = subscriptionState.isActive;

  // ── Data fetching ──

  useEffect(() => {
    fetchFeaturedProducts();
    fetchCart();
    fetchFavorites();
  }, []);

  const applyFilters = useCallback(
    (opts?: { category?: string; search?: string; sort?: SortId }) => {
      const category = opts?.category ?? selectedCategoryId;
      const search = opts?.search ?? searchQuery;
      const sort = opts?.sort ?? sortId;
      const newFilters: ProductFilters = {
        page: 1,
        limit: 20,
        category: category || undefined,
        search: search || undefined,
        sort: sort === 'popular' ? undefined : sort,
      };
      setFilters(newFilters);
      fetchProducts(newFilters);
    },
    [selectedCategoryId, searchQuery, sortId, setFilters, fetchProducts],
  );

  useEffect(() => {
    applyFilters();
  }, [selectedCategoryId, sortId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchFeaturedProducts(),
        fetchProducts({
          page: 1,
          limit: 20,
          category: selectedCategoryId || undefined,
          search: searchQuery || undefined,
          sort: sortId === 'popular' ? undefined : sortId,
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [selectedCategoryId, searchQuery, sortId]);

  // ── Handlers ──

  const handleUHPress = useCallback(() => {
    if (!isAuthenticated) {
      navigation.navigate('Login', { redirectTo: 'UH' });
      return;
    }
    if (hasActiveSubscription) {
      navigation.navigate('PremiumHome');
      return;
    }
    navigation.navigate('UHPreview');
  }, [isAuthenticated, hasActiveSubscription, navigation]);

  const handleProductPress = useCallback(
    (product: Product) => {
      if (!product?._id) return;
      navigation.navigate('ProductDetail', { productId: product._id });
    },
    [navigation],
  );

  const handleFavoriteToggle = useCallback(
    async (product: Product, e: any) => {
      if (!product?._id) return;
      e?.stopPropagation?.();
      try {
        if (isFavorited(product._id)) {
          await removeFavorite(product._id);
          showSnackbar({ message: 'Retiré des favoris', duration: 1800 });
        } else {
          await addFavorite(product);
          showSnackbar({ message: 'Ajouté aux favoris', duration: 1800 });
        }
      } catch {
        showSnackbar({ message: 'Impossible de modifier les favoris', duration: 2500 });
      }
    },
    [isFavorited, removeFavorite, addFavorite, showSnackbar],
  );

  const handleAddToCart = useCallback(
    async (product: Product, e: any) => {
      e?.stopPropagation?.();
      if (!product?._id) return;
      try {
        await addToCart(product, 1);
        showSnackbar({
          message: 'Ajouté au panier',
          duration: 2000,
          action: { label: 'Voir', onPress: () => navigation.navigate('Cart') },
        });
      } catch {
        showSnackbar({ message: "Impossible d'ajouter au panier", duration: 2500 });
      }
    },
    [addToCart, showSnackbar, navigation],
  );

  const handleUpdateQuantity = useCallback(
    async (productId: string, delta: number) => {
      const item = getCartItem(productId);
      if (!item) return;
      const newQty = Math.max(0, item.quantity + delta);
      try {
        if (newQty === 0) {
          const { removeFromCart } = useCartStore.getState();
          await removeFromCart(productId);
        } else {
          await updateQuantity(productId, newQty);
        }
      } catch {
        showSnackbar({ message: 'Erreur quantité', duration: 1500 });
      }
    },
    [getCartItem, updateQuantity, showSnackbar],
  );

  // ── Filter logic ──

  const handleFilterApply = useCallback(
    (newFilters: ProductFilters) => {
      setFilters(newFilters);
      setSelectedCategoryId(newFilters.category ?? '');
      setSortId((newFilters.sort as SortId) ?? 'popular');
      fetchProducts({ page: 1, limit: 20, ...newFilters });
    },
    [setFilters, fetchProducts],
  );

  const handleFilterReset = useCallback(() => {
    resetFilters();
    setSelectedCategoryId('');
    setSortId('popular');
    setSearchQuery('');
    fetchProducts({ page: 1, limit: 20 });
  }, [resetFilters, fetchProducts]);

  const handleSearchChange = useCallback(
    (v: string) => {
      setSearchQuery(v);
      const newFilters: ProductFilters = {
        ...filters,
        search: v || undefined,
      };
      setFilters(newFilters);
      fetchProducts({
        page: 1,
        limit: 20,
        category: selectedCategoryId || undefined,
        search: v || undefined,
        sort: sortId === 'popular' ? undefined : sortId,
      });
    },
    [selectedCategoryId, sortId, filters, setFilters, fetchProducts],
  );

  // ── Computed ──

  const filterBadgeCount = useMemo(
    () =>
      [filters.category, filters.sort && filters.sort !== 'popular', filters.inStock].filter(
        Boolean,
      ).length,
    [filters.category, filters.sort, filters.inStock],
  );

  const activeFilterChips = useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (filters.category) {
      const cat = CATEGORY_CHIPS.find((c) => c.id === filters.category);
      if (cat) chips.push({ id: 'category', label: cat.label });
    }
    if (filters.sort && filters.sort !== 'popular') {
      const opt = SORT_OPTIONS.find((o) => o.id === filters.sort);
      if (opt) chips.push({ id: 'sort', label: opt.label });
    }
    if (filters.inStock) chips.push({ id: 'inStock', label: 'En stock' });
    return chips;
  }, [filters.category, filters.sort, filters.inStock]);

  const removeFilterChip = useCallback(
    (id: string) => {
      const updatedFilters: ProductFilters = { ...filters };
      if (id === 'category') {
        setSelectedCategoryId('');
        updatedFilters.category = undefined;
      } else if (id === 'sort') {
        setSortId('popular');
        updatedFilters.sort = undefined;
      } else if (id === 'inStock') {
        updatedFilters.inStock = undefined;
      }
      setFilters(updatedFilters);
      fetchProducts({
        page: 1,
        limit: 20,
        category: id === 'category' ? undefined : filters.category,
        sort: id === 'sort' ? undefined : filters.sort,
        inStock: id === 'inStock' ? undefined : filters.inStock,
        search: searchQuery || undefined,
      });
    },
    [filters, searchQuery, setFilters, fetchProducts],
  );

  const cartItemCount = getItemCount();
  const showSkeleton = loading && products.length === 0;
  const validProducts = useMemo(
    () => products.filter((p) => p?._id && p?.name),
    [products],
  );

  // ── Render helpers ──

  const renderProduct = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <View style={[styles.cardWrap, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
        <ProductCardV2
          product={item}
          cartQuantity={getCartItem(item._id)?.quantity ?? 0}
          isFavorited={isFavorited(item._id)}
          isUhSubscribed={hasActiveSubscription}
          onPress={() => handleProductPress(item)}
          onFavoritePress={(e) => handleFavoriteToggle(item, e)}
          onAddToCart={(e) => handleAddToCart(item, e)}
          onUpdateQuantity={(delta) => handleUpdateQuantity(item._id, delta)}
          onUhCtaPress={handleUHPress}
        />
      </View>
    ),
    [
      getCartItem,
      isFavorited,
      hasActiveSubscription,
      handleProductPress,
      handleFavoriteToggle,
      handleAddToCart,
      handleUpdateQuantity,
      handleUHPress,
    ],
  );

  const keyExtractor = useCallback((item: Product) => item._id, []);

  const ListHeader = useMemo(
    () => (
      <>
        {!isAuthenticated && <UHPremiumBanner onPress={handleUHPress} />}
        <TopFilterBar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={setSelectedCategoryId}
          sortId={sortId}
          onSortSelect={setSortId}
          filterBadgeCount={filterBadgeCount}
          onFilterPress={() => setFilterSheetVisible(true)}
          activeFilterChips={activeFilterChips}
          onRemoveFilterChip={removeFilterChip}
        />
        <ResultCount count={validProducts.length} loading={loading} />
      </>
    ),
    [
      isAuthenticated,
      handleUHPress,
      searchQuery,
      handleSearchChange,
      selectedCategoryId,
      sortId,
      filterBadgeCount,
      activeFilterChips,
      removeFilterChip,
      validProducts.length,
      loading,
    ],
  );

  const SkeletonGrid = useMemo(
    () => (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <View key={i} style={[styles.cardWrap, i % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
            <ProductCardSkeleton index={i} />
          </View>
        ))}
      </View>
    ),
    [],
  );

  // ── Main render ──

  return (
    <AppBackground useSafeArea={false}>
      <DrawerScreenContainer
        title="Boutique"
        backgroundColor="transparent"
        leftAction={!isDrawerAvailable ? <View style={styles.placeholderBtn} /> : undefined}
        rightNode={
          <HeaderIcons
            cartCount={cartItemCount}
            favCount={favoriteProducts.length}
            onCartPress={() => navigation.navigate('Cart')}
            onFavPress={() => navigation.navigate('Favorites')}
          />
        }
      >
        <StatusBar style="light" />

        <FlatList
          key="products-grid-2col"
          data={showSkeleton ? [] : validProducts}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          numColumns={2}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={showSkeleton ? SkeletonGrid : null}
          ListEmptyComponent={
            !showSkeleton ? <EmptyState onReset={handleFilterReset} /> : null
          }
          columnWrapperStyle={
            !showSkeleton && validProducts.length > 0 ? styles.columnWrapper : undefined
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={6}
        />

        <FilterBottomSheet
          visible={filterSheetVisible}
          onClose={() => setFilterSheetVisible(false)}
          initialFilters={filters}
          onApply={handleFilterApply}
          onReset={handleFilterReset}
        />
      </DrawerScreenContainer>
    </AppBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  placeholderBtn: { width: 42, height: 42 },

  listContent: {
    paddingBottom: 120,
  },

  columnWrapper: {
    paddingHorizontal: GRID_PADDING,
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  cardWrap: {
    width: CARD_WIDTH,
  },
  cardLeft: {},
  cardRight: {},

  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: CARD_GAP,
  },
});
