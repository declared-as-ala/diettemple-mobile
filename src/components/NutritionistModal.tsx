import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { CoachEvent } from '../services/homeService';

interface NutritionistModalProps {
  visible: boolean;
  onClose: () => void;
  event: CoachEvent | null;
}

export default function NutritionistModal({
  visible,
  onClose,
  event,
}: NutritionistModalProps) {
  const { colors, isDarkMode } = useTheme();

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={32} color="#A855F7" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {event.title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {event.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {event.description}
              </Text>
            )}

            <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {new Date(event.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  Consultation prévue
                </Text>
              </View>
            </View>

            <View style={[styles.messageCard, { backgroundColor: '#A855F7', opacity: 0.1 }]}>
              <Ionicons name="information-circle" size={24} color="#A855F7" />
              <Text style={[styles.messageText, { color: colors.text }]}>
                Cette consultation est importante pour suivre votre progression et ajuster votre programme nutritionnel.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#A855F7' }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Compris</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#A855F7',
    opacity: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  content: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    flex: 1,
  },
  messageCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
