import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ActivityRing from './ActivityRing';
import { getUniversalTime } from './dateUtils';
import { useTheme } from './ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  sendGoalRingCompletionNotification, 
  sendHabitRingCompletionNotification,
  sendRoutineRingCompletionNotification,
  sendAllRingsCompletionNotification 
} from './notificationService';

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
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
      const dateData = parsedHabits[date];
      
      if (!dateData || !dateData.habits || dateData.habits.length === 0) {
        return { completed: 0, total: 0, percentage: 0 };
      }
      
      const dateHabits = dateData.habits;
      const counts = dateData.counts || {};
      
      let totalTarget = 0;
      let totalCompleted = 0;
      let habitsCompleted = 0;
      
      dateHabits.forEach(habit => {
        const count = counts[habit.id] || 0;
        const target = habit.target || 1;
        totalTarget += target;
        totalCompleted += Math.min(count, target);
        
        if (count >= target) {
          habitsCompleted++;
        }
      });
      
      const percentage = totalTarget > 0 ? (totalCompleted / totalTarget) : 0;
      
      return { 
        completed: habitsCompleted, 
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
    // Get previous ring state to detect completions
    const previousDataStr = await AsyncStorage.getItem(`activityRings_${date}`);
    const previousData = previousDataStr ? JSON.parse(previousDataStr) : null;
    
    const [goals, habits, routines] = await Promise.all([
      calculateGoalsProgress(date),
      calculateHabitsProgress(date),
      calculateRoutinesProgress(date)
    ]);
    
    setRingsData({ goals, habits, routines });
    
    // Only check for notifications if this is today's date
    if (date === getUniversalTime().fullDate) {
      // Check if any rings just reached 100% completion
      const goalsJustCompleted = goals.total > 0 && goals.percentage >= 1 && 
        (!previousData || previousData.goals.percentage < 1);
      const habitsJustCompleted = habits.total > 0 && habits.percentage >= 1 && 
        (!previousData || previousData.habits.percentage < 1);
      const routinesJustCompleted = routines.total > 0 && routines.percentage >= 1 && 
        (!previousData || previousData.routines.percentage < 1);
      
      // Send individual ring completion notifications
      if (goalsJustCompleted) {
        await sendGoalRingCompletionNotification();
      }
      if (habitsJustCompleted) {
        await sendHabitRingCompletionNotification();
      }
      if (routinesJustCompleted) {
        await sendRoutineRingCompletionNotification();
      }
      
      // Check if all rings are now closed
      const allRingsNowClosed = 
        (goals.total === 0 || goals.percentage >= 1) &&
        (habits.total === 0 || habits.percentage >= 1) &&
        (routines.total === 0 || routines.percentage >= 1) &&
        (goals.total > 0 || habits.total > 0 || routines.total > 0);
      
      const allRingsWereClosed = previousData && previousData.allRingsClosed;
      
      // Send all rings completion notification only if all rings just became closed
      if (allRingsNowClosed && !allRingsWereClosed) {
        await sendAllRingsCompletionNotification();
      }
    }
    
    // Save to storage for history
    const ringData = {
      goals,
      habits,
      routines,
      allRingsClosed: 
        (goals.total === 0 || goals.percentage >= 1) &&
        (habits.total === 0 || habits.percentage >= 1) &&
        (routines.total === 0 || routines.percentage >= 1) &&
        (goals.total > 0 || habits.total > 0 || routines.total > 0)
    };
    
    await AsyncStorage.setItem(`activityRings_${date}`, JSON.stringify(ringData));
  };

  // Load marked dates for calendar
  const loadMarkedDates = async () => {
    const marks = {};
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      
      // Process each potential date
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      const allDates = new Set();
      
      // Get all valid dates from goals
      const dateKeys = keys.filter(key => datePattern.test(key));
      for (const date of dateKeys) {
        allDates.add(date);
      }
      
      // Get all dates from habits
      const habitsData = await AsyncStorage.getItem('allHabits');
      if (habitsData) {
        const habits = JSON.parse(habitsData);
        Object.keys(habits).forEach(date => {
          if (datePattern.test(date)) {
            allDates.add(date);
          }
        });
      }
      
      // Get all dates from activity rings
      const ringKeys = keys.filter(key => key.startsWith('activityRings_'));
      for (const key of ringKeys) {
        const date = key.replace('activityRings_', '');
        if (datePattern.test(date)) {
          allDates.add(date);
        }
      }
      
      // Now process each date to determine dot color
      for (const date of allDates) {
        // Calculate progress for each ring
        const [goals, habits, routines] = await Promise.all([
          calculateGoalsProgress(date),
          calculateHabitsProgress(date),
          calculateRoutinesProgress(date)
        ]);
        
        const hasGoals = goals.total > 0;
        const hasHabits = habits.total > 0;
        const hasRoutines = routines.total > 0;
        
        // Skip if no data exists for this date
        if (!hasGoals && !hasHabits && !hasRoutines) {
          continue;
        }
        
        // Count how many rings exist and how many are complete
        let totalRings = 0;
        let completedRings = 0;
        
        if (hasGoals) {
          totalRings++;
          if (goals.percentage >= 1) completedRings++;
        }
        
        if (hasHabits) {
          totalRings++;
          if (habits.percentage >= 1) completedRings++;
        }
        
        if (hasRoutines) {
          totalRings++;
          if (routines.percentage >= 1) completedRings++;
        }
        
        // Determine dot color based on completion
        let dotColor;
        if (completedRings === 0) {
          // Grey: data exists but nothing completed
          dotColor = '#8E8E93';
        } else if (completedRings === totalRings) {
          // Gold: all rings completed
          dotColor = '#FFD700';
        } else {
          // Green: partial completion
          dotColor = '#34C759';
        }
        
        marks[date] = { marked: true, dotColor };
      }
      
      // Mark selected date
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: theme.primaryButtonText,
      };
      
      setMarkedDates(marks);
    } catch (error) {
      console.error('Error loading marked dates:', error);
    }
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
            key={`calendar-${colorScheme}`}
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
            renderHeader={(date) => {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              const month = monthNames[date.getMonth()];
              const year = date.getFullYear();
              return (
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: theme.text }}>
                  {month} {year}
                </Text>
              );
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
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
    flex: 1,
    marginRight: 10,
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