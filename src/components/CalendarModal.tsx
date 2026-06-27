import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { homeService, DailyProgram } from '../services/homeService';

const { width } = Dimensions.get('window');

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  programStartDate?: string | null;
  programEndDate?: string | null;
}

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to get day name
const getDayName = (date: Date): string => {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return days[date.getDay()];
};

// Helper function to get month name
const getMonthName = (date: Date): string => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[date.getMonth()];
};

export default function CalendarModal({
  visible,
  onClose,
  selectedDate,
  onDateSelect,
  programStartDate,
  programEndDate,
}: CalendarModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [dailyPrograms, setDailyPrograms] = useState<Map<string, DailyProgram>>(new Map());
  const [loading, setLoading] = useState(false);

  // Initialize current week start to selected date's week
  useEffect(() => {
    if (visible) {
      const weekStart = new Date(selectedDate);
      const dayOfWeek = weekStart.getDay();
      const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      setCurrentWeekStart(weekStart);
    }
  }, [visible, selectedDate]);

  // Load daily programs for the visible week
  useEffect(() => {
    if (visible && programStartDate && programEndDate) {
      loadWeekPrograms();
    }
  }, [visible, currentWeekStart, programStartDate, programEndDate]);

  const loadWeekPrograms = async () => {
    if (!programStartDate || !programEndDate) return;

    setLoading(true);
    const programs = new Map<string, DailyProgram>();

    // Load programs for the week (7 days)
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const dateStr = formatDate(date);

      // Only load if within program range
      const programStart = new Date(programStartDate);
      const programEnd = new Date(programEndDate);
      if (date >= programStart && date <= programEnd) {
        try {
          const response = await homeService.getDailyProgram(dateStr);
          if (response.dailyProgram) {
            programs.set(dateStr, response.dailyProgram);
          }
        } catch (error) {
          // No program for this date - skip
        }
      }
    }

    setDailyPrograms(programs);
    setLoading(false);
  };

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleDatePress = (date: Date) => {
    onDateSelect(date);
    onClose();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  const isSelected = (date: Date): boolean => {
    return formatDate(date) === formatDate(selectedDate);
  };

  const getWeekDays = (): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getDayStatus = (date: Date): 'workout' | 'rest' | 'completed' | 'none' => {
    const dateStr = formatDate(date);
    const program = dailyPrograms.get(dateStr);
    
    if (!program) return 'none';
    if (program.completed) return 'completed';
    if (program.sessionId) return 'workout';
    return 'rest';
  };

  const weekDays = getWeekDays();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {getMonthName(currentWeekStart)} {currentWeekStart.getFullYear()}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Week Navigation */}
          <View style={styles.weekNavigation}>
            <TouchableOpacity
              onPress={handlePreviousWeek}
              style={[styles.navButton, { backgroundColor: colors.cardBackground }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.calendarContainer}
            >
              {weekDays.map((date, index) => {
                const status = getDayStatus(date);
                const isTodayDate = isToday(date);
                const isSelectedDate = isSelected(date);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateBox,
                      isSelectedDate && [styles.dateBoxSelected, { backgroundColor: '#D4AF37' }],
                      { borderColor: colors.border },
                    ]}
                    onPress={() => handleDatePress(date)}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        { color: isSelectedDate ? '#000000' : colors.textSecondary },
                      ]}
                    >
                      {getDayName(date)}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: isSelectedDate ? '#000000' : colors.text },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    {status === 'completed' && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={isSelectedDate ? '#000000' : '#D4AF37'}
                        style={styles.statusIcon}
                      />
                    )}
                    {status === 'workout' && !isSelectedDate && (
                      <View style={[styles.workoutDot, { backgroundColor: '#D4AF37' }]} />
                    )}
                    {status === 'rest' && !isSelectedDate && (
                      <Ionicons
                        name="moon-outline"
                        size={12}
                        color={colors.textSecondary}
                        style={styles.statusIcon}
                      />
                    )}
                    {isTodayDate && !isSelectedDate && (
                      <View style={styles.todayDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={handleNextWeek}
              style={[styles.navButton, { backgroundColor: colors.cardBackground }]}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D4AF37' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Séance</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Terminé</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="moon-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Repos</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  calendarContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    flex: 1,
  },
  dateBox: {
    width: (width - 100) / 7,
    minWidth: 50,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  dateBoxSelected: {
    borderWidth: 0,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusIcon: {
    position: 'absolute',
    bottom: 4,
  },
  workoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 8,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37',
    position: 'absolute',
    bottom: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});
