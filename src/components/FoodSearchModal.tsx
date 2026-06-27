import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet as RN,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foodsService } from '../services/foodsService';
import type { FoodSearchItem } from '../services/meService';

const ACCENT = '#D4AF37';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (food: FoodSearchItem) => void;
  title?: string;
};

export default function FoodSearchModal({ visible, onClose, onSelect, title = 'Choisir un aliment' }: Props) {
  const [q, setQ] = useState('');
  const [foods, setFoods] = useState<FoodSearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (q.trim().length >= 1) {
        setLoading(true);
        foodsService
          .search(q.trim(), 25)
          .then((r) => setFoods(r.foods || []))
          .catch(() => setFoods([]))
          .finally(() => setLoading(false));
      } else {
        foodsService.search('', 20).then((r) => setFoods(r.foods || [])).catch(() => setFoods([]));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [visible, q]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/*
       * Architecture: the KAV fills the screen with flex:1 + justifyContent:'flex-end'.
       * behavior='padding' (iOS) shrinks the flex content area by the keyboard height,
       * which pushes the sheet above the keyboard.
       * behavior='height' (Android) shrinks the KAV's height directly — same net effect.
       * An absolute TouchableOpacity inside the KAV handles backdrop-tap-to-dismiss;
       * because it is rendered before the sheet, the sheet's z-order sits on top of it.
       */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* Dismiss on backdrop tap */}
        <TouchableOpacity
          style={RN.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        {/* Sheet */}
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Rechercher (ex. poulet, riz…)"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={ACCENT} />
            </View>
          ) : (
            <FlatList
              data={foods}
              keyExtractor={(item) => item.foodId}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.foodName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.macros}>
                    {item.macrosPer100g.kcal} kcal · P {item.macrosPer100g.protein}g C {item.macrosPer100g.carbs}g L {item.macrosPer100g.fat}g / 100g
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>Aucun résultat</Text>}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  input: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loader: { padding: 40, alignItems: 'center' },
  row: {
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  foodName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  macros: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  empty: { padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.5)' },
});
