import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLiftHistoryStore } from '../store/liftHistoryStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface LiftHistoryProps {
  exerciseId: string;
  exerciseName: string;
  colors: any;
  onAddLift: () => void;
}

export default function LiftHistory({
  exerciseId,
  exerciseName,
  colors,
  onAddLift,
}: LiftHistoryProps) {
  const { getPersonalRecord, getExerciseHistory, deleteLift } = useLiftHistoryStore();

  const pr = getPersonalRecord(exerciseId);
  const history = getExerciseHistory(exerciseId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* PR Section */}
      {pr && (
        <LinearGradient
          colors={['rgba(212,175,55,0.2)', 'rgba(212,175,55,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.prContainer, { borderColor: colors.border }]}
        >
          <View style={styles.prHeader}>
            <Ionicons name="trophy" size={24} color="#D4AF37" />
            <Text style={styles.prLabel}>PERSONAL RECORD</Text>
          </View>

          <Text style={styles.prWeight}>{pr.weight} kg</Text>

          <View style={styles.prDetails}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Reps
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{pr.reps}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Sets
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{pr.sets}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(pr.date)}
              </Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>
            Historique des Levées
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyScroll}
            scrollEventThrottle={16}
          >
            {history.map((lift) => (
              <View
                key={lift.id}
                style={[styles.historyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              >
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteLift(lift.id)}
                >
                  <Ionicons name="close-circle" size={18} color="rgba(255,100,100,0.7)" />
                </TouchableOpacity>

                <Text style={[styles.historyWeight, { color: '#D4AF37' }]}>
                  {lift.weight} kg
                </Text>

                <View style={styles.historyInfo}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      {lift.reps}x{lift.sets}
                    </Text>
                  </View>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {formatDate(lift.date)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add Lift Button */}
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: '#D4AF37' }]}
        onPress={onAddLift}
      >
        <Ionicons name="add" size={24} color="#1a1200" />
        <Text style={styles.addBtnText}>Ajouter une levée</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  prContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  prLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  prWeight: {
    fontSize: 36,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: -1,
  },
  prDetails: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.2)',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    gap: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  historyScroll: {
    paddingRight: 20,
    gap: 12,
  },
  historyCard: {
    width: 140,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  historyWeight: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  historyInfo: {
    alignItems: 'center',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addBtnText: {
    color: '#1a1200',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
