import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { nutritionColors } from '../../constants/nutritionColors';
import type { Recipe } from '../../types';

const GOLD = '#D4AF37';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(260, SCREEN_WIDTH * 0.68);

interface FavoriteRecipesSectionProps {
  recipes: Recipe[];
  onRecipePress?: (recipe?: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onAddRecipe?: (recipe: Recipe) => void;
}

export function FavoriteRecipesSection({
  recipes,
  onRecipePress,
  onToggleFavorite,
  onAddRecipe,
}: FavoriteRecipesSectionProps) {
  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Recettes favorites</Text>
          <Text style={styles.sectionSub}>Ajoutez un plat à votre journal</Text>
        </View>
        <TouchableOpacity onPress={() => onRecipePress?.()} activeOpacity={0.7}>
          <Text style={styles.seeAll}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>📖</Text>
          </View>
          <Text style={styles.emptyTitle}>Aucune recette favorite</Text>
          <Text style={styles.emptyDesc}>
            Marquez vos recettes préférées avec ❤️ pour les retrouver ici
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => onRecipePress?.()}
            activeOpacity={0.85}
          >
            <Ionicons name="book-outline" size={15} color={GOLD} />
            <Text style={styles.emptyCtaText}>Explorer les recettes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe._id}
              recipe={recipe}
              onPress={() => onRecipePress?.(recipe)}
              onToggleFavorite={() => onToggleFavorite(recipe._id)}
              onAdd={() => onAddRecipe?.(recipe)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Recipe card ──────────────────────────────────────────────────────────────

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  onToggleFavorite: () => void;
  onAdd: () => void;
}

function RecipeCard({ recipe, onPress, onToggleFavorite, onAdd }: RecipeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={styles.imageWrap}>
        <Image
          source={{
            uri: recipe.imageUrl || undefined,
          }}
          style={styles.image}
          resizeMode="cover"
        />
        {/* Gradient overlay */}
        <View style={styles.imageOverlay} />

        {/* Kcal badge on image */}
        <View style={styles.kcalBadge}>
          <Text style={styles.kcalBadgeText}>{recipe.calories ?? 0}</Text>
          <Text style={styles.kcalBadgeUnit}>kcal</Text>
        </View>

        {/* Heart button */}
        <TouchableOpacity style={styles.heartBtn} onPress={onToggleFavorite} hitSlop={8}>
          <Ionicons name="heart" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Macro pills */}
        <View style={styles.macroPills}>
          {recipe.protein != null && (
            <View style={[styles.pill, { backgroundColor: 'rgba(255,107,157,0.12)', borderColor: 'rgba(255,107,157,0.25)' }]}>
              <Text style={[styles.pillText, { color: '#FF6B9D' }]}>🥩 {recipe.protein}g</Text>
            </View>
          )}
          {recipe.carbs != null && (
            <View style={[styles.pill, { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.25)' }]}>
              <Text style={[styles.pillText, { color: '#60A5FA' }]}>🌾 {recipe.carbs}g</Text>
            </View>
          )}
          {recipe.fat != null && (
            <View style={[styles.pill, { backgroundColor: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.25)' }]}>
              <Text style={[styles.pillText, { color: GOLD }]}>🥑 {recipe.fat}g</Text>
            </View>
          )}
        </View>

        {/* Add button */}
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#000" />
          <Text style={styles.addBtnText}>Ajouter au journal</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nutritionColors.text,
    letterSpacing: 0.1,
  },
  sectionSub: {
    fontSize: 12,
    color: nutritionColors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    paddingTop: 2,
  },

  // Empty
  empty: {
    backgroundColor: '#151518',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: nutritionColors.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: nutritionColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },

  // Carousel
  carousel: {
    paddingRight: 4,
    gap: 12,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#151518',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  imageWrap: {
    height: 120,
    backgroundColor: '#1C1C1E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  kcalBadge: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kcalBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -0.3,
  },
  kcalBadgeUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 5,
  },

  // Body
  body: {
    padding: 12,
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: nutritionColors.text,
    lineHeight: 20,
  },
  macroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 9,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },
});
