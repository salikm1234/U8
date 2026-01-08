/**
 * HabitTrackingScreen - Daily Habit Management Component
 * 
 * This screen allows users to create, track, and manage daily habits across the 8 wellness dimensions.
 * Users can add new habits, set daily targets, track completion counts, and view their progress.
 * 
 * Key Features:
 * - Create new habits with custom names, targets, and dimensions
 * - Track habit completion with increment/decrement counters
 * - Date-based habit management with calendar picker
 * - Automatic cloning of yesterday's habits to today
 * - Color-coded habits by wellness dimension
 * - Push notifications when habit targets are met
 * - Persistent storage of habit data
 * 
 * Data Structure:
 * - Habits are stored by date in AsyncStorage
 * - Each habit has an ID, name, target count, dimension, and creation date
 * - Counts are tracked separately and persist across app sessions
 * - Habits can be carried forward from previous days
 * 
 * Navigation:
 * - Floating action button to add new habits
 * - Date picker to view habits from different days
 * - Navigation to habit summary screen for analytics
 */

import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, ScrollView, Modal, Animated, Keyboard, TouchableOpacity, TextInput, FlatList, Alert, Platform, UIManager, TouchableWithoutFeedback, StyleSheet, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getUniversalTime } from './dateUtils';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { configureNotifications, sendHabitCompletionNotification } from './notificationService';
import { Picker } from '@react-native-picker/picker';
import { getColorForDimension } from './getColorForDimension';
import { useTheme } from './ThemeContext';
import { getContrastColor } from './colorUtils';

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Helper function to format date strings from YYYY-MM-DD to 'Month Day, Year'
 * Used for displaying user-friendly date formats in the UI
 */
function formatDateLong(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const HabitTrackingScreen = ({navigation}) => {
  const { theme, colorScheme } = useTheme();
  // State for date selection and management
  const [selectedDate, setSelectedDate] = useState(getUniversalTime().fullDate);
  useEffect(() => {
    setSelectedDate(getUniversalTime().fullDate);
  }, []);

  // State for habit data and UI management
  const [habits, setHabits] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newHabitDropdown, setNewHabitDropdown] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('');
  const [counts, setCounts] = useState({});
  const [allHabits, setAllHabits] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitDimension, setNewHabitDimension] = useState('Physical');
  const [dimensionColors, setDimensionColors] = useState({});

  const formatDate = (date) => date;

  /**
   * Loads habits for a specific date from AsyncStorage
   * Retrieves both habit definitions and their completion counts
   * Automatically clones yesterday's habits if today has no habits
   */
  const loadHabitsForDate = async (date) => {
    const dateKey = formatDate(date);
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
  
    const dayHabits = parsedHabits[dateKey]?.habits || [];
    const dayCounts = parsedHabits[dateKey]?.counts || {};
  
    setHabits(dayHabits);
    setCounts(dayCounts);
    setAllHabits(parsedHabits);
  
    if (dateKey === getUniversalTime().fullDate) {
      await ensureCountsResetForPastDays();  // Create habits for missed days
      await cloneYesterdayHabits();  // Clone yesterday's habits if missing
    }
  };

  // Initialize notifications and load initial data
  useEffect(() => {
    configureNotifications(); // Initialize notifications on app load
    loadHabitsForDate(selectedDate);
  }, []);

  // Load dimension colors for visual distinction
  useEffect(() => {
    const loadColors = async () => {
      const dims = ['Physical', 'Mental', 'Environmental', 'Financial', 'Intellectual', 'Occupational', 'Social', 'Spiritual'];
      const colors = {};
      for (const dim of dims) {
        colors[dim] = await getColorForDimension(dim);
      }
      setDimensionColors(colors);
    };
    loadColors();
  }, []);

  // Reset to today's date when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const today = getUniversalTime().fullDate;
      setSelectedDate(today);        // Reset the date
      setShowDatePicker(false);      // Reset calendar popup state
      loadHabitsForDate(today);      // Reload habits for today
    }, [])
  );

  /**
   * Saves habit data to AsyncStorage
   * Updates both habit definitions and completion counts for the selected date
   */
  const saveHabits = async (date, habitsData, countsData) => {
    const dateKey = formatDate(date);
    const updatedHabits = {
      ...allHabits,
      [dateKey]: { habits: habitsData, counts: countsData },
    };
    await AsyncStorage.setItem('allHabits', JSON.stringify(updatedHabits));
    setAllHabits(updatedHabits);
  };

  /**
   * Handles date selection from the date picker
   * Only allows selection of today or past dates
   * Reloads habits for the selected date
   */
  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    const formatted = date.toISOString().split('T')[0];
    if (formatted <= getUniversalTime().fullDate) {
      setSelectedDate(formatted);
      loadHabitsForDate(formatted);
    } else {
      Alert.alert('Invalid Date', 'Future dates cannot be selected.');
    }
  };

  /**
   * Decrements the completion count for a habit
   * Prevents count from going below 0
   * Automatically saves changes to storage
   */
  const decrementCount = (habitId) => {
    setCounts((prev) => {
      const updated = { ...prev, [habitId]: Math.max((prev[habitId] || 0) - 1, 0) };
      saveHabits(selectedDate, habits, updated);
      return updated;
    });
  };

  /**
   * Increments the completion count for a habit
   * Sends notification when target is reached
   * Automatically saves changes to storage
   */
  const incrementCount = async (habitId) => {
    setCounts((prev) => {
      const updated = { ...prev, [habitId]: (prev[habitId] || 0) + 1 };
      
      // Check if the target is met
      const habit = habits.find(h => h.id === habitId);
      if (updated[habitId] === habit.target) { // Only trigger when reaching the exact target
        sendHabitCompletionNotification(habit.name);
      }
      
      saveHabits(selectedDate, habits, updated);
      return updated;
    });
  };

  /**
   * Handles manual input of habit completion counts
   * Filters input to only allow numeric values
   * Automatically saves changes to storage
   */
  const handleInputChange = (habitId, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setCounts((prev) => {
      const updated = { ...prev, [habitId]: parseInt(numericValue || '0', 10) };
      saveHabits(selectedDate, habits, updated);
      return updated;
    });
  };

  /**
   * Creates a new habit and adds it to the current date
   * Validates input and creates unique habit ID
   * Resets form and closes modal on success
   */
  const addNewHabit = async () => {
    if (!newHabitName.trim() || !newHabitTarget.trim() || isNaN(newHabitTarget) || newHabitTarget < 0) {
      Alert.alert('Invalid Input', 'Ensure valid habit name and target count (non-negative).');
      return;
    }
    const newHabit = {
      id: new Date().getTime().toString(),
      name: newHabitName,
      target: parseInt(newHabitTarget, 10),
      createdOn: formatDate(new Date(getUniversalTime().fullDate)),
      dimension: newHabitDimension,
    };
    const updatedHabits = [...habits, newHabit];
    const updatedCounts = { ...counts, [newHabit.id]: 0 };
    setHabits(updatedHabits);
    setCounts(updatedCounts);
    await saveHabits(selectedDate, updatedHabits, updatedCounts);
    
    // Also save to habit templates for persistence
    const habitTemplatesData = await AsyncStorage.getItem('habitTemplates');
    const habitTemplates = habitTemplatesData ? JSON.parse(habitTemplatesData) : [];
    const newTemplate = {
      id: newHabit.id,
      name: newHabit.name,
      target: newHabit.target,
      dimension: newHabit.dimension
    };
    habitTemplates.push(newTemplate);
    await AsyncStorage.setItem('habitTemplates', JSON.stringify(habitTemplates));
    
    setNewHabitName('');
    setNewHabitTarget('');
    setNewHabitDimension('Physical');
    setShowAddModal(false);
  };

  /**
   * Shows confirmation dialog before deleting a habit
   * Prevents accidental deletion of habits
   */
  const confirmDeleteHabit = (habitId) => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habitId),
      },
    ]);
  };

  /**
   * Ensures all past days have their counts reset to 0
   * Creates habits for any missed days between last usage and today
   */
  const ensureCountsResetForPastDays = async () => {
    const today = getUniversalTime().fullDate;
    const habitTemplatesData = await AsyncStorage.getItem('habitTemplates');
    const habitTemplates = habitTemplatesData ? JSON.parse(habitTemplatesData) : [];
    
    if (habitTemplates.length === 0) return;
    
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
    
    // Find the most recent date with habits
    const datesWithHabits = Object.keys(parsedHabits).sort().reverse();
    if (datesWithHabits.length === 0) return;
    
    const mostRecentDate = datesWithHabits[0];
    const startDate = new Date(mostRecentDate);
    const endDate = new Date(today);
    
    // Create habits for all days between last usage and today
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // Start from day after last usage
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // If no habits exist for this date, create them with counts at 0
      if (!parsedHabits[dateStr] || parsedHabits[dateStr].habits.length === 0) {
        const dayHabits = habitTemplates.map(template => ({
          ...template,
          createdOn: dateStr
        }));
        const dayCounts = {};
        dayHabits.forEach((habit) => { dayCounts[habit.id] = 0; });
        
        parsedHabits[dateStr] = { habits: dayHabits, counts: dayCounts };
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await AsyncStorage.setItem('allHabits', JSON.stringify(parsedHabits));
    setAllHabits(parsedHabits);
  };

  /**
   * Loads habit templates and creates today's habits if they don't exist
   * Habit templates persist until explicitly deleted
   * Daily counts reset to 0 for new days
   */
  const cloneYesterdayHabits = async () => {
    const today = getUniversalTime().fullDate;
    
    // Load habit templates (persistent habits)
    const habitTemplatesData = await AsyncStorage.getItem('habitTemplates');
    let habitTemplates = habitTemplatesData ? JSON.parse(habitTemplatesData) : [];
    
    // Load all daily habit data
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
    
    // If no templates exist, try to create them from any recent habits
    if (habitTemplates.length === 0) {
      // Look for the most recent day with habits
      const datesWithHabits = Object.keys(parsedHabits)
        .filter(date => parsedHabits[date]?.habits?.length > 0)
        .sort()
        .reverse();
      
      if (datesWithHabits.length > 0) {
        const recentHabits = parsedHabits[datesWithHabits[0]].habits;
        // Save recent habits as templates
        habitTemplates = recentHabits.map(habit => ({
          id: habit.id.split('-')[0], // Remove date suffix if it exists
          name: habit.name,
          target: habit.target,
          dimension: habit.dimension
        }));
        await AsyncStorage.setItem('habitTemplates', JSON.stringify(habitTemplates));
      }
    }
    
    // Create today's habits from templates if they don't exist
    if (!parsedHabits[today] || parsedHabits[today]?.habits.length === 0) {
      if (habitTemplates.length > 0) {
        const todayHabits = habitTemplates.map(template => ({
          ...template,
          createdOn: today
        }));
        const countsClone = {};
        todayHabits.forEach((habit) => { countsClone[habit.id] = 0; });
        
        parsedHabits[today] = { habits: todayHabits, counts: countsClone };
        await AsyncStorage.setItem('allHabits', JSON.stringify(parsedHabits));
        setHabits(todayHabits);
        setCounts(countsClone);
        setAllHabits(parsedHabits);
      }
    }
  };

  const deleteHabit = async (habitId) => {
    const updatedHabits = habits.filter((h) => h.id !== habitId);
    const updatedCounts = { ...counts };
    delete updatedCounts[habitId];
  
    const updatedDayData = {
      habits: updatedHabits,
      counts: updatedCounts,
      deletedHabits: [...(allHabits[selectedDate]?.deletedHabits || []), habitId], // ✅ Deletes for *selectedDate* only
    };
  
    const updatedAllHabits = { ...allHabits, [selectedDate]: updatedDayData };
    await AsyncStorage.setItem('allHabits', JSON.stringify(updatedAllHabits));
    setHabits(updatedHabits);
    setCounts(updatedCounts);
    setAllHabits(updatedAllHabits);
    
    // Also remove from habit templates for permanent deletion
    const habitTemplatesData = await AsyncStorage.getItem('habitTemplates');
    const habitTemplates = habitTemplatesData ? JSON.parse(habitTemplatesData) : [];
    const updatedTemplates = habitTemplates.filter(template => template.id !== habitId);
    await AsyncStorage.setItem('habitTemplates', JSON.stringify(updatedTemplates));
  };

  useEffect(() => {
    loadHabitsForDate(selectedDate);
  }, []);

  const styles = createStyles(theme, colorScheme);
  
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.container]} keyboardShouldPersistTaps="handled">
          {/* Modern Header */}
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            {selectedDate === getUniversalTime().fullDate ? (
              <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text, marginTop: 10 }}>Your Habits Today</Text>
            ) : (
              <Text style={{ fontSize: 18, fontWeight: '500', color: theme.text, marginTop: 10 }}>
                Your Habits on {formatDateLong(selectedDate)}
              </Text>
            )}
          </View>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Remove the large date text here to avoid crowding the header */}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.graphIconButton} onPress={() => navigation.navigate('HabitSummaryScreen')}>
                <View style={styles.graphIconBackground}>
                  <Ionicons name="analytics-outline" size={26} color={theme.primaryButtonText} />
                </View>
              </TouchableOpacity>
              <View style={{ marginLeft: 10 }}>
                <DateTimePicker
                  value={new Date(`${selectedDate}T00:00:00`)}
                  mode="date"
                  display="default"
                  maximumDate={new Date(getUniversalTime().fullDate + 'T23:59:59')}
                  onChange={handleDateChange}
                  style={{ width: 44 }}
                  themeVariant={colorScheme}
                />
              </View>
            </View>
          </View>
          {/* Encouragement if all complete */}
          {habits.length > 0 && habits.every(h => counts[h.id] >= h.target) && (
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.success }}>All done! 🎉</Text>
              <Text style={{ fontSize: 16, color: theme.textSecondary, marginTop: 6 }}>You completed all your habits today!</Text>
            </View>
          )}
          {habits.length === 0 ? (
            <Text style={styles.noHabitsText}>No habits were scheduled for this day.</Text>
          ) : (
            <FlatList
              data={habits}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const completed = counts[item.id] >= item.target;
                const color = dimensionColors[item.dimension] || '#00BFFF';
                return (
                  <View style={{
                    backgroundColor: theme.cardBackground,
                    borderRadius: 20,
                    marginVertical: 10,
                    padding: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: theme.shadowColor,
                    shadowOpacity: 0.07,
                    shadowRadius: 8,
                    elevation: 2,
                    borderLeftWidth: 8,
                    borderLeftColor: color,
                  }}>
                    <TouchableOpacity
                      onPress={() => selectedDate === getUniversalTime().fullDate && confirmDeleteHabit(item.id)}
                      disabled={selectedDate !== getUniversalTime().fullDate}
                      style={{ marginRight: 10 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={28}
                        color={selectedDate === getUniversalTime().fullDate ? "#e74c3c" : "#ccc"}
                      />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: completed ? '#4BB543' : theme.text, textDecorationLine: completed ? 'line-through' : 'none' }}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <Text style={{ fontSize: 15, color: theme.textSecondary, marginRight: 8 }}>{counts[item.id] || 0} / {item.target}</Text>
                        {completed && <Ionicons name="star" size={20} color="#FFD700" style={{ marginLeft: 4 }} />}
                      </View>
                      {/* Progress Bar */}
                      <View style={{ width: '100%', height: 10, backgroundColor: theme.border, borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
                        <View style={{ height: '100%', backgroundColor: completed ? '#4BB543' : color, borderRadius: 6, width: `${Math.min((counts[item.id] || 0) / item.target * 100, 100)}%` }} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                      <TouchableOpacity onPress={() => decrementCount(item.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.secondaryButton, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                        <Ionicons name="remove" size={22} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TextInput
                        value={counts[item.id]?.toString() || '0'}
                        style={{ width: 40, height: 32, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 15, backgroundColor: theme.inputBackground, marginHorizontal: 2, borderColor: theme.border, color: theme.text }}
                        keyboardType="number-pad"
                        onChangeText={(value) => handleInputChange(item.id, value)}
                      />
                      <TouchableOpacity onPress={() => incrementCount(item.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: completed ? '#4BB543' : color, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>
                        <Ionicons name="add" size={22} color={theme.background} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={{ paddingBottom: 40 }}
              scrollEnabled={false}
            />
          )}
          {/* Add Habit Modal */}
          <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: theme.modalBackground, borderRadius: 20, padding: 28, width: 320, maxWidth: '95%', alignItems: 'center', shadowColor: theme.shadowColor, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 14, color: theme.text }}>Add a New Habit</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10, width: '100%', backgroundColor: theme.inputBackground, color: theme.text }}
                    placeholder="Habit Name"
                    placeholderTextColor={theme.placeholderText}
                    value={newHabitName}
                    onChangeText={setNewHabitName}
                  />
                  <TextInput
                    style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10, width: '100%', backgroundColor: theme.inputBackground, color: theme.text }}
                    placeholder="Target Count"
                    placeholderTextColor={theme.placeholderText}
                    value={newHabitTarget}
                    keyboardType="number-pad"
                    onChangeText={setNewHabitTarget}
                  />
                  <View style={{ width: '100%', marginBottom: 14 }}>
                    <Text style={{ fontSize: 15, marginBottom: 4, color: theme.text }}>Dimension</Text>
                    <Picker
                      selectedValue={newHabitDimension}
                      onValueChange={setNewHabitDimension}
                      style={{ width: '100%', color: theme.text }}
                    >
                      {Object.keys(dimensionColors).map((dim) => (
                        <Picker.Item key={dim} label={dim} value={dim} color={dimensionColors[dim]} />
                      ))}
                    </Picker>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: theme.secondaryButton, marginRight: 10 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.secondaryButtonText }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={addNewHabit} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: theme.primaryButtonText }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 15, color: getContrastColor(theme.primaryButtonText, colorScheme) }}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Floating Add Habit Button */}
      {formatDate(selectedDate) === getUniversalTime().fullDate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={38} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: theme.background, marginTop:40 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  headerText: { fontSize: 18, fontWeight: '500', marginRight: 10, color: theme.text },
  noHabitsText: { textAlign: 'center', fontSize: 18, color: theme.textSecondary, marginTop: 30 },
  habitItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  habitName: { flex: 1, fontSize: 20, marginLeft: 15, color: theme.text },
  counterContainer: { flexDirection: 'row', alignItems: 'center' },
  counterInput: { width: 50, height: 40, borderWidth: 1, borderRadius: 10, textAlign: 'center', marginHorizontal: 10, borderColor: theme.border, backgroundColor: theme.inputBackground, color: theme.text },
  newHabitContainer: { marginTop: 20, backgroundColor: theme.suggestedContainer, borderRadius: 10, padding: 15 },
  newHabitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newHabitHeaderText: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10, borderColor: theme.border, backgroundColor: theme.inputBackground, color: theme.text },
  addButton: { backgroundColor: theme.primaryButtonText, padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  addButtonText: { color: getContrastColor(theme.primaryButtonText, colorScheme), fontWeight: 'bold', fontSize: 18 },
  summaryButton: {
    fontSize: 18,
    color: theme.primaryButtonText,
    fontWeight: 'bold',
    marginRight: 5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  summaryButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  summaryButtonText: {
    fontSize: 16,
    color: theme.primaryButtonText,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  habitDetails: {
    flex: 1,
    marginLeft: 15,
  },
  
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#D3D3D3',  // Light gray background
    borderRadius: 5,
    marginTop: 5,
    overflow: 'hidden',
  },
  
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00BFFF', // Blue color for progress
    borderRadius: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#00BFFF',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00BFFF',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  graphIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphIconBackground: {
    backgroundColor: '#e6f4fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HabitTrackingScreen;