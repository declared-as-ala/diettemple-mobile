import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface AlternativeOption {
  _id: string;
  name: string;
  muscleGroup?: string;
  equipment?: string;
  videoUrl?: string;
}

interface AlternativeBottomSheetProps {
  visible: boolean;
  title?: string;
  alternatives: AlternativeOption[];
  onSelect: (alternative: AlternativeOption) => void;
  onClose: () => void;
}

const ACCENT = '#D4AF37';

export default function AlternativeBottomSheet({
  visible,
  title = 'Use instead',
  alternatives,
  onSelect,
  onClose,
}: AlternativeBottomSheetProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.cardBackground }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Machine occupée ? Pas de câble ? Choisis une alternative pour cette séance.
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {alternatives.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>Aucune alternative</Text>
            ) : (
              alternatives.map((alt) => (
                <TouchableOpacity
                  key={alt._id}
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => {
                    onSelect(alt);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="barbell-outline" size={22} color={ACCENT} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowName, { color: colors.text }]}>{alt.name}</Text>
                    {(alt.equipment || alt.muscleGroup) && (
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                        {[alt.equipment, alt.muscleGroup].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={[styles.cancel, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingBottom: 16,
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  cancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
