import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ActivityRing from './ActivityRing';
import { getUniversalTime } from './dateUtils';
import { useTheme } from './ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ActivityRingsScreen = () => {
  const { theme, colorScheme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(getUniversalTime().fullDate);
  const [ringsData, setRingsData] = useState({
    goals: { completed: 0, total: 0, percentage: 0 },
    habits: { completed: 0, total: 0, percentage: 0 },
    routines: { completed: 0, total: 0, percentage: 0 },
  });
  const [markedDates, setMarkedDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Format date for display
  const formatDateDisplay = (dateString) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    return `${monthName} ${year}`;
  };

  // Calculate goals progress
  const calculateGoalsProgress = async (date) => {
    try {
      const goalsData = await AsyncStorage.getItem(date);
      if (!goalsData) return { completed: 0, total: 0, percentage: 0 };
      
      const goals = JSON.parse(goalsData);
      const completed = goals.filter(g => g.completed).length;
      const total = goals.length;
      const percentage = total > 0 ? (completed / total) : 0;
      
      return { completed, total, percentage };
    } catch (error) {
      console.error('Error calculating goals:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  };

  // Calculate habits progress
  const calculateHabitsProgress = async (date) => {
    try {
      const allHabitsData = await AsyncStorage.getItem('allHabits');
      if (!allHabitsData) return { completed: 0, total: 0, percentage: 0 };
      
      const parsedHabits = JSON.parse(allHabitsData);
      const dateHabits = parsedHabits[date]?.habits || [];
      
      if (dateHabits.length === 0) return { completed: 0, total: 0, percentage: 0 };
      
      let totalTarget = 0;
      let totalCompleted = 0;
      
      dateHabits.forEach(habit => {
        const count = habit.count || 0;
        const target = habit.target || 1;
        totalTarget += target;
        totalCompleted += Math.min(count, target);
      });
      
      const percentage = totalTarget > 0 ? (totalCompleted / totalTarget) : 0;
      const completed = dateHabits.filter(h => (h.count || 0) >= (h.target || 1)).length;
      
      return { 
        completed, 
        total: dateHabits.length, 
        percentage 
      };
    } catch (error) {
      console.error('Error calculating habits:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  };

  // Calculate routines progress
  const calculateRoutinesProgress = async (date) => {
    try {
      const routinesData = await AsyncStorage.getItem('routines');
      if (!routinesData) return { completed: 0, total: 0, percentage: 0 };
      
      const routines = JSON.parse(routinesData);
      let totalTasks = 0;
      let completedTasks = 0;
      
      // Check each routine's completion data
      for (const routine of routines) {
        if (routine.tasks && routine.tasks.length > 0) {
          // Check if this routine is scheduled for the day
          const dayOfWeek = new Date(date).getDay();
          const isScheduled = routine.weekdays || 
            (routine.weekendOnly && (dayOfWeek === 0 || dayOfWeek === 6)) ||
            (!routine.weekdays && !routine.weekendOnly);
            
          if (isScheduled) {
            const completionKey = `completion-${routine.id}-${date}`;
            const completionData = await AsyncStorage.getItem(completionKey);
            
            totalTasks += routine.tasks.length;
            
            if (completionData) {
              const completion = JSON.parse(completionData);
              completedTasks += Object.values(completion).filter(Boolean).length;
            }
          }
        }
      }
      
      const percentage = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
      
      return { 
        completed: completedTasks, 
        total: totalTasks, 
        percentage 
      };
    } catch (error) {
      console.error('Error calculating routines:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  };

  // Load all ring data for selected date
  const loadRingsData = async (date) => {
    const [goals, habits, routines] = await Promise.all([
      calculateGoalsProgress(date),
      calculateHabitsProgress(date),
      calculateRoutinesProgress(date)
    ]);
    
    setRingsData({ goals, habits, routines });
    
    // Save to storage for history
    const ringData = {
      goals,
      habits,
      routines,
      allRingsClosed: goals.percentage >= 1 && habits.percentage >= 1 && routines.percentage >= 1
    };
    
    await AsyncStorage.setItem(`activityRings_${date}`, JSON.stringify(ringData));
  };

  // Load marked dates for calendar
  const loadMarkedDates = async () => {
    const marks = {};
    
    // Get all dates that have any data (goals, habits, or routines)
    const keys = await AsyncStorage.getAllKeys();
    
    // Check for dates with goals
    const dateKeys = keys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    for (const date of dateKeys) {
      const goalsData = await AsyncStorage.getItem(date);
      if (goalsData && JSON.parse(goalsData).length > 0) {
        marks[date] = { marked: true, dotColor: '#007AFF' };
      }
    }
    
    // Check for dates with habits
    const habitsData = await AsyncStorage.getItem('allHabits');
    if (habitsData) {
      const habits = JSON.parse(habitsData);
      Object.keys(habits).forEach(date => {
        if (habits[date]?.habits?.length > 0) {
          marks[date] = { marked: true, dotColor: marks[date] ? '#FFD700' : '#34C759' };
        }
      });
    }
    
    // Check saved ring data
    const ringKeys = keys.filter(key => key.startsWith('activityRings_'));
    for (const key of ringKeys) {
      const date = key.replace('activityRings_', '');
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        marks[date] = {
          marked: true,
          dotColor: parsed.allRingsClosed ? '#34C759' : '#FFD700',
        };
      }
    }
    
    // Mark selected date
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: theme.primaryButtonText,
    };
    
    setMarkedDates(marks);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadRingsData(selectedDate);
      loadMarkedDates();
    }, [selectedDate])
  );

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const goToToday = () => {
    const today = getUniversalTime().fullDate;
    setSelectedDate(today);
  };

  const hasAnyData = ringsData.goals.total > 0 || ringsData.habits.total > 0 || ringsData.routines.total > 0;

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.dateText}>
          {selectedDate === getUniversalTime().fullDate ? 'Today' : formatDateDisplay(selectedDate)}
        </Text>
        {selectedDate !== getUniversalTime().fullDate && (
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasAnyData ? (
        <View style={styles.ringsContainer}>
          <View style={styles.ringsWrapper}>
            {/* Goals Ring - Outer */}
            {ringsData.goals.total > 0 && (
              <View style={styles.ringLayer}>
                <ActivityRing
                  radius={90}
                  strokeWidth={20}
                  progress={ringsData.goals.percentage}
                  color="#007AFF"
                  backgroundColor={colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)'}
                />
              </View>
            )}
            
            {/* Habits Ring - Middle */}
            {ringsData.habits.total > 0 && (
              <View style={[styles.ringLayer, { position: 'absolute' }]}>
                <ActivityRing
                  radius={65}
                  strokeWidth={20}
                  progress={ringsData.habits.percentage}
                  color="#34C759"
                  backgroundColor={colorScheme === 'dark' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.1)'}
                />
              </View>
            )}
            
            {/* Routines Ring - Inner */}
            {ringsData.routines.total > 0 && (
              <View style={[styles.ringLayer, { position: 'absolute' }]}>
                <ActivityRing
                  radius={40}
                  strokeWidth={20}
                  progress={ringsData.routines.percentage}
                  color="#FF3B30"
                  backgroundColor={colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.1)'}
                />
              </View>
            )}
          </View>

          {/* Progress Details */}
          <View style={styles.detailsContainer}>
            {ringsData.goals.total > 0 && (
              <View style={styles.detailRow}>
                <View style={[styles.colorDot, { backgroundColor: '#007AFF' }]} />
                <Text style={styles.detailLabel}>Goals</Text>
                <Text style={styles.detailValue}>
                  {Math.round(ringsData.goals.percentage * 100)}% ({ringsData.goals.completed}/{ringsData.goals.total})
                </Text>
              </View>
            )}
            
            {ringsData.habits.total > 0 && (
              <View style={styles.detailRow}>
                <View style={[styles.colorDot, { backgroundColor: '#34C759' }]} />
                <Text style={styles.detailLabel}>Habits</Text>
                <Text style={styles.detailValue}>
                  {Math.round(ringsData.habits.percentage * 100)}% ({ringsData.habits.completed}/{ringsData.habits.total})
                </Text>
              </View>
            )}
            
            {ringsData.routines.total > 0 && (
              <View style={styles.detailRow}>
                <View style={[styles.colorDot, { backgroundColor: '#FF3B30' }]} />
                <Text style={styles.detailLabel}>Routines</Text>
                <Text style={styles.detailValue}>
                  {Math.round(ringsData.routines.percentage * 100)}% ({ringsData.routines.completed}/{ringsData.routines.total})
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="fitness-outline" size={60} color={theme.textSecondary} />
          <Text style={styles.noDataText}>No activity data for this day</Text>
        </View>
      )}

      {/* Calendar Toggle Button */}
      <TouchableOpacity
        style={styles.calendarToggle}
        onPress={() => setShowCalendar(!showCalendar)}
      >
        <Ionicons name="calendar-outline" size={24} color={theme.primaryButtonText} />
        <Text style={styles.calendarToggleText}>
          {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
        </Text>
      </TouchableOpacity>

      {/* Calendar */}
      {showCalendar && (
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.calendarBackground,
              calendarBackground: theme.calendarBackground,
              textSectionTitleColor: theme.calendarTextSectionTitleColor,
              selectedDayBackgroundColor: theme.calendarSelectedDayBackgroundColor,
              selectedDayTextColor: theme.calendarSelectedDayTextColor,
              todayTextColor: theme.calendarTodayTextColor,
              dayTextColor: theme.calendarDayTextColor,
              textDisabledColor: theme.calendarTextDisabledColor,
              monthTextColor: theme.calendarMonthTextColor,
              arrowColor: theme.calendarArrowColor,
            }}
          />
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  dateText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.primaryButton,
    borderRadius: 20,
  },
  todayButtonText: {
    color: theme.primaryButtonText,
    fontWeight: '600',
  },
  ringsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  ringsWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  ringLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    width: '80%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 17,
    color: theme.text,
    flex: 1,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  noDataText: {
    fontSize: 18,
    color: theme.textSecondary,
    marginTop: 20,
  },
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: theme.secondaryButton,
    borderRadius: 12,
  },
  calendarToggleText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.primaryButtonText,
    fontWeight: '600',
  },
  calendarContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
});

export default ActivityRingsScreen;