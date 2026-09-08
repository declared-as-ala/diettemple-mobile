import { BRAND_YELLOW } from '../constants/brand';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { RootStackParamList } from '../types';
import { useProductsStore } from '../store/productsStore';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { useAuthStore } from '../store/authStore';
import { useSubscription } from '../context/SubscriptionContext';
import { useSnackbar } from '../components/Snackbar';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { Product, ProductFilters } from '../services/productsService';
import { getProductCategoryOptions } from '../utils/productCategories';
import ProductCardV2, { ProductCardSkeleton, GRID_PADDING, CARD_GAP } from '../components/boutique/ProductCardV2';
import TopFilterBar, { SORT_OPTIONS } from '../components/boutique/TopFilterBar';
import FilterBottomSheet from '../components/boutique/FilterBottomSheet';
import UHPremiumBanner from '../components/boutique/UHPremiumBanner';

const GOLD = BRAND_YELLOW;

export default function BoutiqueScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Boutique'>>();
  const { width, fontScale } = useWindowDimensions();
  const columns = fontScale > 1.4 ? 1 : width >= 720 ? 3 : 2;
  const cardWidth = (width - GRID_PADDING * 2 - CARD_GAP * (columns - 1)) / columns;
  const { showSnackbar } = useSnackbar();
  const { products, categories, loading, loadingMore, error, loadMoreError, pagination, filters,
    fetchProducts, loadMoreProducts, fetchCategories, setFilters, resetFilters } = useProductsStore();
  const { items: cartItems, getItemCount, getCartItem, fetchCart, addToCart, updateQuantity, removeFromCart } = useCartStore();
  const { isFavorited, addFavorite, removeFavorite, favoriteProducts, fetchFavorites } = useFavoritesStore();
  const { isAuthenticated } = useAuthStore();
  const { subscriptionState } = useSubscription();
  const { isAvailable: isDrawerAvailable } = useDrawerOpen();
  const [search, setSearch] = useState(filters.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const hasActiveSubscription = subscriptionState.isActive;
  const categoryOptions = useMemo(() => getProductCategoryOptions(categories), [categories]);

  useEffect(() => { fetchCategories(); fetchCart(); fetchFavorites(); }, [fetchCategories, fetchCart, fetchFavorites]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  // Discard legacy hardcoded category slugs when the actual catalog arrives.
  useEffect(() => {
    if (categories.length && filters.category && !categories.includes(filters.category)) setFilters({ category: undefined });
  }, [categories, filters.category, setFilters]);

  const queryFilters = useMemo<ProductFilters>(() => ({
    page: 1, limit: 20, category: filters.category || undefined, search: debouncedSearch || undefined,
    sort: filters.sort || 'popular', inStock: filters.inStock || undefined,
    minPrice: filters.minPrice, maxPrice: filters.maxPrice,
  }), [filters.category, filters.sort, filters.inStock, filters.minPrice, filters.maxPrice, debouncedSearch]);
  useEffect(() => { fetchProducts(queryFilters); }, [queryFilters, fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([fetchCategories(), fetchProducts(queryFilters)]); } finally { setRefreshing(false); }
  }, [fetchCategories, fetchProducts, queryFilters]);
  const reset = useCallback(() => {
    setSearch(''); setDebouncedSearch(''); resetFilters();
  }, [resetFilters]);
  const handleUHPress = useCallback(() => {
    if (!isAuthenticated) navigation.navigate('Login', { redirectTo: 'UH' });
    else navigation.navigate(hasActiveSubscription ? 'PremiumHome' : 'UHPreview');
  }, [isAuthenticated, hasActiveSubscription, navigation]);

  const toggleFavorite = useCallback(async (product: Product) => {
    try {
      if (isFavorited(product._id)) { await removeFavorite(product._id); showSnackbar({ message: 'Retiré des favoris', duration: 1800 }); }
      else { await addFavorite(product); showSnackbar({ message: 'Ajouté aux favoris', duration: 1800 }); }
    } catch { showSnackbar({ message: 'Impossible de modifier les favoris', duration: 2500 }); }
  }, [isFavorited, removeFavorite, addFavorite, showSnackbar]);
  const addProduct = useCallback(async (product: Product) => {
    try {
      await addToCart(product, 1);
      showSnackbar({ message: 'Ajouté au panier', duration: 2000, action: { label: 'Voir le panier', onPress: () => navigation.navigate('Cart') } });
    } catch { showSnackbar({ message: 'Impossible d’ajouter au panier', duration: 2500 }); }
  }, [addToCart, showSnackbar, navigation]);
  const changeQuantity = useCallback(async (productId: string, delta: number) => {
    const item = getCartItem(productId);
    if (!item) return;
    try {
      const quantity = Math.max(0, item.quantity + delta);
      if (quantity === 0) await removeFromCart(productId); else await updateQuantity(productId, quantity);
    } catch { showSnackbar({ message: 'Impossible de modifier la quantité', duration: 2000 }); }
  }, [getCartItem, removeFromCart, updateQuantity, showSnackbar]);

  const applied = useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (filters.category) chips.push({ id: 'category', label: categoryOptions.find((c) => c.id === filters.category)?.label || filters.category });
    if (filters.inStock) chips.push({ id: 'inStock', label: 'En stock' });
    if (filters.minPrice != null) chips.push({ id: 'minPrice', label: 'Dès ' + filters.minPrice + ' DT' });
    if (filters.maxPrice != null) chips.push({ id: 'maxPrice', label: 'Jusqu’à ' + filters.maxPrice + ' DT' });
    if (filters.sort && filters.sort !== 'popular') chips.push({ id: 'sort', label: SORT_OPTIONS.find((s) => s.id === filters.sort)?.label || '' });
    return chips;
  }, [filters.category, filters.inStock, filters.sort, filters.minPrice, filters.maxPrice, categoryOptions]);
  const removeFilter = useCallback((id: string) => { setFilters({ [id]: undefined, page: 1 }); }, [setFilters]);

  const renderProduct = useCallback(({ item }: { item: Product }) => <ProductCardV2
    product={item} width={cardWidth} cartQuantity={getCartItem(item._id)?.quantity || 0}
    isFavorited={isFavorited(item._id)} isUhSubscribed={hasActiveSubscription}
    onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
    onFavoritePress={() => toggleFavorite(item)} onAddToCart={() => addProduct(item)}
    onUpdateQuantity={(delta) => changeQuantity(item._id, delta)} onUhCtaPress={handleUHPress}
  />, [cardWidth, cartItems, favoriteProducts, getCartItem, isFavorited, hasActiveSubscription, navigation, toggleFavorite, addProduct, changeQuantity, handleUHPress]);

  const header = <>
    {!hasActiveSubscription ? <UHPremiumBanner onPress={handleUHPress} /> : <View style={s.intro}>
      <Text style={s.eyebrow}>NUTRITION & PERFORMANCE</Text>
      <Text style={s.headline}>Le meilleur pour<Text style={s.headlineGold}> progresser.</Text></Text>
      <Text style={s.description}>Votre sélection de nutrition sportive.</Text>
    </View>}
    <TopFilterBar categories={categoryOptions} searchValue={search} onSearchChange={setSearch}
      selectedCategoryId={filters.category || ''} onCategorySelect={(category) => setFilters({ category: category || undefined, page: 1 })}
      filterBadgeCount={applied.length} onFilterPress={() => setSheetVisible(true)}
      activeFilterChips={applied} onRemoveFilterChip={removeFilter} />
    <View style={s.resultRow}>
      <View style={s.resultHeading}>
        <Text style={s.resultTitle}>{filters.category ? categoryOptions.find((c) => c.id === filters.category)?.label || filters.category : 'La sélection'}</Text>
        {!loading && !error && <View style={s.count}><Text style={s.countText}>{pagination.total}</Text></View>}
      </View>
      <Pressable style={s.sortButton} onPress={() => setSheetVisible(true)} accessibilityRole="button" accessibilityLabel="Trier les produits">
        <Ionicons name="swap-vertical" size={14} color="#BAC2AF" /><Text style={s.sortText}>Trier</Text>
      </Pressable>
    </View>
    {loading && <View style={s.skeletonGrid}>{Array.from({ length: columns * 2 }, (_, index) =>
      <ProductCardSkeleton key={index} width={cardWidth} />)}</View>}
  </>;
  const cartCount = getItemCount();

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <DrawerScreenContainer title="Boutique" backgroundColor="#10130F" titleColor="#F5F3EB" headerBorderColor="#272D22"
        leftAction={!isDrawerAvailable ? <View style={s.storeMark}><Ionicons name="storefront-outline" size={23} color={GOLD} /></View> : undefined}
        rightNode={<View style={s.headerActions}>
          <Pressable style={s.headerButton} onPress={() => navigation.navigate('Favorites')} accessibilityRole="button" accessibilityLabel={'Favoris, ' + favoriteProducts.length + ' produits'}>
            <Ionicons name="heart-outline" size={22} color="#E8ECDD" />
            {favoriteProducts.length > 0 && <View style={s.favoriteDot} />}
          </Pressable>
          <Pressable style={s.headerButton} onPress={() => navigation.navigate('Cart')} accessibilityRole="button" accessibilityLabel={'Panier, ' + cartCount + ' articles'}>
            <Ionicons name="bag-outline" size={22} color="#E8ECDD" />
            {cartCount > 0 && <View style={s.cartBadge}><Text style={s.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
          </Pressable>
        </View>}>
        <FlatList key={'boutique-' + columns} data={loading || error ? [] : products} renderItem={renderProduct}
          keyExtractor={(item) => item._id} numColumns={columns} ListHeaderComponent={header}
          columnWrapperStyle={columns > 1 ? s.row : undefined}
          ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
          contentContainerStyle={[s.list, columns === 1 && { alignItems: 'center' }]}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
          ListEmptyComponent={!loading ? <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={28} color={GOLD} /></View>
            <Text style={s.emptyTitle}>{error ? 'La boutique est momentanément indisponible' : 'Aucun produit trouvé'}</Text>
            <Text style={s.emptyCaption}>{error ? 'Vérifiez votre connexion puis réessayez.' : 'Essayez une autre recherche ou retirez un filtre.'}</Text>
            <Pressable style={s.outlineButton} onPress={error ? () => fetchProducts(queryFilters) : reset} accessibilityRole="button">
              <Text style={s.outlineText}>{error ? 'Réessayer' : 'Réinitialiser les filtres'}</Text>
            </Pressable>
          </View> : null}
          ListFooterComponent={!loading && !error ? <View style={s.footer}>
            {loadMoreError && <Text style={s.emptyCaption}>La suite n’a pas pu être chargée. Réessayez.</Text>}
            {pagination.page < pagination.pages && <Pressable style={s.outlineButton} onPress={loadMoreProducts} disabled={loadingMore} accessibilityRole="button">
              {loadingMore ? <ActivityIndicator color={GOLD} /> : <Text style={s.outlineText}>{loadMoreError ? 'Réessayer' : 'Afficher plus de produits'}</Text>}
            </Pressable>}
            {products.length > 0 && <Text style={s.loadedCount}>{products.length} sur {pagination.total} produits</Text>}
          </View> : null}
        />
        <FilterBottomSheet visible={sheetVisible} categories={categoryOptions} onClose={() => setSheetVisible(false)}
          initialFilters={queryFilters} onApply={(next) => setFilters(next)} onReset={reset} />
      </DrawerScreenContainer>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10130F' },
  storeMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#252B1F', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerActions: { flexDirection: 'row', gap: 5 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  favoriteDot: { position: 'absolute', top: 5, right: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
  cartBadge: { position: 'absolute', right: 0, top: 0, backgroundColor: GOLD, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  cartBadgeText: { color: '#181B10', fontSize: 9, fontWeight: '800' },
  intro: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 2 },
  eyebrow: { color: GOLD, fontSize: 9, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  headline: { color: '#F3F2E9', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7, maxWidth: 360 },
  headlineGold: { color: GOLD },
  description: { color: '#A8B09C', fontSize: 12, marginTop: 9, lineHeight: 18 },
  resultRow: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  resultTitle: { color: '#F1F2E8', fontSize: 17, fontWeight: '700', flexShrink: 1 },
  count: { backgroundColor: '#293020', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  countText: { color: '#CBD6BA', fontSize: 10, fontWeight: '700' },
  sortButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 14 },
  sortText: { color: '#BAC2AF', fontSize: 11 },
  list: { paddingBottom: 130 },
  row: { paddingHorizontal: GRID_PADDING, gap: CARD_GAP },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_PADDING, gap: CARD_GAP },
  empty: { padding: 32, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#272E20', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#EEF0E5', textAlign: 'center', marginBottom: 10 },
  emptyCaption: { color: '#B3BDA7', fontSize: 13, lineHeight: 21, textAlign: 'center', marginBottom: 18 },
  outlineButton: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#5E5A38', borderRadius: 13 },
  outlineText: { color: GOLD, fontSize: 13, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingTop: 22 },
  loadedCount: { color: '#99A58B', fontSize: 11, textAlign: 'center', marginTop: 14, marginBottom: 24 },
});


