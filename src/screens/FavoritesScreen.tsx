import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useFavoritesStore } from '../store/favoritesStore';
import { useCartStore } from '../store/cartStore';
import { useSnackbar } from '../components/Snackbar';
import { Product } from '../services/productsService';
import AppLoader from '../components/AppLoader';

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Favorites'>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const ACCENT = '#D4AF37';

export default function FavoritesScreen() {
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { colors } = useTheme();
  const { showSnackbar } = useSnackbar();
  const { favoriteProducts, loading, fetchFavorites, removeFavorite } = useFavoritesStore();
  const { addToCart } = useCartStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  }, [fetchFavorites]);

  const handleProductPress = (product: Product) => {
    if (!product?._id) return;
    navigation.navigate('ProductDetail', { productId: product._id });
  };

  const handleRemoveFavorite = async (productId: string, e?: any) => {
    e?.stopPropagation?.();
    try {
      await removeFavorite(productId);
      showSnackbar({ message: 'Retiré des favoris', duration: 1800 });
    } catch {
      showSnackbar({ message: 'Impossible de retirer des favoris', duration: 2500 });
    }
  };

  const handleAddToCart = async (product: Product, e?: any) => {
    e?.stopPropagation?.();
    if (!product?._id) return;
    try {
      await addToCart(product, 1);
      showSnackbar({
        message: 'Ajouté au panier ✅',
        duration: 2000,
        action: { label: 'Voir', onPress: () => navigation.navigate('Cart') },
      });
    } catch {
      showSnackbar({ message: 'Impossible d\'ajouter au panier', duration: 2500 });
    }
  };

  if (loading && favoriteProducts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || '#000' }]}>
        <StatusBar style="light" />
        <View style={[styles.header, { borderBottomColor: colors.border || '#1a1a1a' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favoris</Text>
          <View style={styles.headerRight} />
        </View>
        <AppLoader variant="fullscreen" label="Chargement…" />
      </View>
    );
  }

  if (favoriteProducts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || '#000' }]}>
        <StatusBar style="light" />
        <View style={[styles.header, { borderBottomColor: colors.border || '#1a1a1a' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favoris</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-outline" size={72} color="rgba(255,255,255,0.35)" />
          </View>
          <Text style={styles.emptyTitle}>Aucun favori pour l'instant</Text>
          <Text style={styles.emptySub}>
            Les produits que vous aimez apparaîtront ici.
          </Text>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaPrimaryText}>Explorer la boutique</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const products = favoriteProducts.filter((p) => p?._id && p?.name);

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#000' }]}>
      <StatusBar style="light" />

      <View style={[styles.header, { borderBottomColor: colors.border || '#1a1a1a' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favoris</Text>
        <View style={styles.headerRight}>
          <Text style={styles.countBadge}>{products.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {products.map((product) => {
            const finalPrice =
              product.discount && product.price
                ? product.price * (1 - product.discount / 100)
                : product.price ?? 0;
            return (
              <TouchableOpacity
                key={product._id}
                style={[styles.card, { backgroundColor: colors.cardBackground || '#111', borderColor: colors.border || '#222' }]}
                onPress={() => handleProductPress(product)}
                activeOpacity={0.9}
              >
                <View style={styles.cardImageWrap}>
                  <Image
                    source={{ uri: product.images?.[0] || 'https://via.placeholder.com/200' }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={(e) => handleRemoveFavorite(product._id, e)}
                  >
                    <Ionicons name="heart" size={20} color="#E879F9" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={[styles.cardPrice, { color: colors.text }]}>
                  {Math.round(finalPrice)} DT
                </Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={(e) => handleAddToCart(product, e)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="add" size={18} color="#000" />
                  <Text style={styles.addBtnText}>Ajouter au panier</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  countBadge: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImageWrap: { position: 'relative' },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.85,
    backgroundColor: '#1a1a1a',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '600', marginHorizontal: 12, marginTop: 10, marginBottom: 4 },
  cardPrice: { fontSize: 16, fontWeight: '700', marginHorizontal: 12, marginBottom: 10 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 28 },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  ctaPrimaryText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
