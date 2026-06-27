import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';

interface LevelModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

type Level = 'Intiate' | 'Fighter' | 'Warrior' | 'Champion' | 'Elite';

export default function LevelModal({ visible, onClose }: LevelModalProps) {
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const getUserLevel = (): Level => {
    return user?.level || 'Intiate';
  };

  const getLevelOrder = (level: string): number => {
    const order: Record<string, number> = {
      'Intiate': 0,
      'Fighter': 1,
      'Warrior': 2,
      'Champion': 3,
      'Elite': 4,
    };
    return order[level] || 0;
  };

  const currentLevel = getUserLevel();

  const levelIcons: Record<string, any> = {
    Intiate: require('../../assets/level/Intiate.png'),
    Fighter: require('../../assets/level/Fighter.png'),
    Warrior: require('../../assets/level/Fighter.png'),
    Champion: require('../../assets/level/Champion.png'),
    Elite: require('../../assets/level/Elite.png'),
  };

  const levelColors: Record<string, string> = {
    Intiate: '#CD7F32', // Bronze
    Fighter: '#C0C0C0', // Silver
    Warrior: '#FFD700', // Gold
    Champion: '#FFD700', // Gold
    Elite: '#E8E8E8', // Silver/Grey
  };

  const levels: Level[] = ['Intiate', 'Fighter', 'Warrior', 'Champion', 'Elite'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Niveaux UH</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Current Level Info */}
          <View style={[styles.currentLevelCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.currentLevelLabel, { color: colors.textSecondary }]}>
              Votre niveau actuel
            </Text>
            <Text style={[styles.currentLevelText, { color: '#D4AF37' }]}>
              UH {currentLevel.toUpperCase()}
            </Text>
          </View>

          {/* Levels List */}
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.levelsContainer}>
              {levels.map((level, index) => {
                const levelKey = level;
                const isCompleted = getLevelOrder(levelKey) <= getLevelOrder(currentLevel);
                const isCurrent = levelKey === currentLevel;

                return (
                  <View key={level} style={styles.levelItem}>
                    {index > 0 && (
                      <View 
                        style={[
                          styles.levelConnector, 
                          { backgroundColor: isCompleted ? '#D4AF37' : '#333333' } 
                        ]} 
                      />
                    )}
                    <View style={styles.levelPedestal}>
                      <View
                        style={[
                          styles.levelBadgeContainer,
                          {
                            borderColor: isCurrent
                              ? '#D4AF37'
                              : isCompleted
                              ? levelColors[levelKey]
                              : '#333333',
                          },
                          isCurrent && styles.levelBadgeCurrent,
                          isCompleted && styles.levelBadgeCompleted,
                        ]}
                      >
                        <Image
                          source={levelIcons[levelKey]}
                          style={[
                            styles.levelBadgeImage,
                            !isCompleted && { opacity: 0.3 },
                          ]}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.levelBadgeLabel}>
                        <Text
                          style={[
                            styles.levelBadgeText,
                            {
                              color: isCurrent
                                ? '#D4AF37'
                                : isCompleted
                                ? levelColors[levelKey]
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          UH {level.toUpperCase()}
                        </Text>
                        {isCurrent && (
                          <Text style={[styles.currentLevelIndicator, { color: '#D4AF37' }]}>
                            (Actuel)
                          </Text>
                        )}
                      </View>
                      {isCompleted && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButtonBottom, { backgroundColor: '#D4AF37' }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  currentLevelCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  currentLevelLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentLevelText: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  levelsContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  levelItem: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  levelConnector: {
    width: 2,
    height: 30,
    marginBottom: 4,
  },
  levelPedestal: {
    alignItems: 'center',
    position: 'relative',
  },
  levelBadgeContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    padding: 4,
  },
  levelBadgeCompleted: {
    borderColor: '#D4AF37',
  },
  levelBadgeCurrent: {
    borderColor: '#D4AF37',
    borderWidth: 4,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  levelBadgeImage: {
    width: '100%',
    height: '100%',
  },
  levelBadgeLabel: {
    marginTop: 8,
    alignItems: 'center',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  currentLevelIndicator: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  closeButtonBottom: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
