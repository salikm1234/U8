import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Platform, UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getUniversalTime } from './dateUtils';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { configureNotifications, sendHabitCompletionNotification } from './notificationService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HabitTrackingScreen = ({navigation}) => {
  const [selectedDate, setSelectedDate] = useState(getUniversalTime().fullDate);
  useEffect(() => {
    setSelectedDate(getUniversalTime().fullDate);
  }, []);

  const [habits, setHabits] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newHabitDropdown, setNewHabitDropdown] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('');
  const [counts, setCounts] = useState({});
  const [allHabits, setAllHabits] = useState({});

  const formatDate = (date) => date;


  
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
      await cloneYesterdayHabits();  // 🎯 Clone yesterday’s habits if missing
    }
  };

  useEffect(() => {
    configureNotifications(); // ✅ Initialize notifications on app load
    loadHabitsForDate(selectedDate);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const today = getUniversalTime().fullDate;
      setSelectedDate(today);        // 🔄 Reset the date
      setShowDatePicker(false);      // 🔥 Reset calendar popup state
      loadHabitsForDate(today);      // 🔁 Reload habits for today
    }, [])
  );

  const saveHabits = async (date, habitsData, countsData) => {
    const dateKey = formatDate(date);
    const updatedHabits = {
      ...allHabits,
      [dateKey]: { habits: habitsData, counts: countsData },
    };
    await AsyncStorage.setItem('allHabits', JSON.stringify(updatedHabits));
    setAllHabits(updatedHabits);
  };

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

  const decrementCount = (habitId) => {
    setCounts((prev) => {
      const updated = { ...prev, [habitId]: Math.max((prev[habitId] || 0) - 1, 0) };
      saveHabits(selectedDate, habits, updated);
      return updated;
    });
  };

  const incrementCount = async (habitId) => {
    setCounts((prev) => {
      const updated = { ...prev, [habitId]: (prev[habitId] || 0) + 1 };
      
      // ✅ Check if the target is met
      const habit = habits.find(h => h.id === habitId);
      if (updated[habitId] === habit.target) { // ✅ Only trigger when reaching the exact target
        sendHabitCompletionNotification(habit.name);
      }
      
      saveHabits(selectedDate, habits, updated);
      return updated;
    });
  };

  const handleInputChange = (habitId, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setCounts((prev) => {
      const updated = { ...prev, [habitId]: parseInt(numericValue || '0', 10) };
      saveHabits(selectedDate, habits, updated);
      return updated;
    });
  };

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
    };

    const updatedHabits = [...habits, newHabit];
    const updatedCounts = { ...counts, [newHabit.id]: 0 };
    setHabits(updatedHabits);
    setCounts(updatedCounts);
    await saveHabits(selectedDate, updatedHabits, updatedCounts);
    setNewHabitName('');
    setNewHabitTarget('');
    setNewHabitDropdown(false);
  };

  const confirmDeleteHabit = (habitId) => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habitId),
      },
    ]);
  };

  const cloneYesterdayHabits = async () => {
    const today = getUniversalTime().fullDate;
    const yesterday = new Date(new Date(today).setDate(new Date(today).getDate() - 1))
      .toISOString().split('T')[0];
  
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
    const yesterdayHabits = parsedHabits[yesterday]?.habits || [];
  
    if (!parsedHabits[today] || parsedHabits[today]?.habits.length === 0) {
      const clonedHabits = yesterdayHabits.map((habit) => ({
        ...habit,
        id: `${habit.id}-${today}`,  // 🎯 Unique ID per day
        createdOn: today,
      }));
      const countsClone = {};
      clonedHabits.forEach((habit) => { countsClone[habit.id] = 0; });
  
      parsedHabits[today] = { habits: clonedHabits, counts: countsClone };
      await AsyncStorage.setItem('allHabits', JSON.stringify(parsedHabits));
      setHabits(clonedHabits);
      setCounts(countsClone);
      setAllHabits(parsedHabits);
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
  };

  useEffect(() => {
    loadHabitsForDate(selectedDate);
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
  
        {/* 🔥 Updated Header Section with Summary Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLeft} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.headerText}>
              {selectedDate === getUniversalTime().fullDate ? 'Today' : `Habits for ${selectedDate}`}
            </Text>
            <Ionicons name="calendar-outline" size={30} color="#00BFFF" />
          </TouchableOpacity>
  
          {/* ✅ Summary Button */}
          <TouchableOpacity style={styles.summaryButtonContainer} onPress={() => navigation.navigate('HabitSummaryScreen')}>
            <Ionicons name="analytics-outline" size={30} color="#00BFFF" />
            <Text style={styles.summaryButtonText}>Summary</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
  <DateTimePicker
    value={new Date(`${selectedDate}T00:00:00`)}  // ✅ Directly tied to updated state
    mode="date"
    display="default"
    maximumDate={new Date(getUniversalTime().fullDate + 'T23:59:59')}
    onChange={handleDateChange}
  />
)}

        {habits.length === 0 ? (
          <Text style={styles.noHabitsText}>No habits were scheduled for this day.</Text>
        ) : (
          <FlatList
            data={habits}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.habitItem}>
                <TouchableOpacity
  onPress={() => selectedDate === getUniversalTime().fullDate && confirmDeleteHabit(item.id)}
  disabled={selectedDate !== getUniversalTime().fullDate}
>
  <Ionicons
    name="trash-outline"
    size={28}
    color={selectedDate === getUniversalTime().fullDate ? "red" : "gray"}
  />
</TouchableOpacity>
<View style={styles.habitDetails}>
  <Text style={[
    styles.habitName,
    counts[item.id] >= item.target && { textDecorationLine: 'line-through', color: 'green' }
  ]}>
    {item.name} ({counts[item.id] || 0}/{item.target})
  </Text>

  {/* ✅ Progress Bar */}
  <View style={styles.progressBarContainer}>
    <View style={[
      styles.progressBarFill, 
      { width: `${Math.min((counts[item.id] || 0) / item.target * 100, 100)}%` }
    ]} />
  </View>
</View>
                <View style={styles.counterContainer}>
                  <TouchableOpacity onPress={() => decrementCount(item.id)}>
                    <Ionicons name="remove-circle-outline" size={30} color="gray" />
                  </TouchableOpacity>
                  <TextInput
  value={counts[item.id]?.toString() || '0'}
  style={[styles.counterInput, { backgroundColor: 'white' }]} // ✅ Editable for all dates
  keyboardType="number-pad"
  onChangeText={(value) => handleInputChange(item.id, value)} // ✅ Saves per date
/>
                  <TouchableOpacity onPress={() => incrementCount(item.id)}>
                    <Ionicons name="add-circle-outline" size={30} color="#00BFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {formatDate(selectedDate) === getUniversalTime().fullDate && (
          <View style={styles.newHabitContainer}>
            <TouchableOpacity onPress={() => setNewHabitDropdown(!newHabitDropdown)}>
              <View style={styles.newHabitHeader}>
                <Text style={styles.newHabitHeaderText}>New Habit</Text>
                <Ionicons
                  name={newHabitDropdown ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={30} color="#00BFFF"
                />
              </View>
            </TouchableOpacity>
            {newHabitDropdown && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Habit Name"
                  value={newHabitName}
                  onChangeText={setNewHabitName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Target Count"
                  value={newHabitTarget}
                  keyboardType="number-pad"
                  onChangeText={setNewHabitTarget}
                />
                <TouchableOpacity style={styles.addButton} onPress={addNewHabit}>
                  <Text style={styles.addButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', marginTop:40 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  headerText: { fontSize: 28, fontWeight: 'bold', marginRight: 10 },
  noHabitsText: { textAlign: 'center', fontSize: 18, color: 'gray', marginTop: 30 },
  habitItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  habitName: { flex: 1, fontSize: 20, marginLeft: 15 },
  counterContainer: { flexDirection: 'row', alignItems: 'center' },
  counterInput: { width: 50, height: 40, borderWidth: 1, borderRadius: 10, textAlign: 'center', marginHorizontal: 10 },
  newHabitContainer: { marginTop: 20, backgroundColor: '#E8F6FF', borderRadius: 10, padding: 15 },
  newHabitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newHabitHeaderText: { fontSize: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10 },
  addButton: { backgroundColor: '#00BFFF', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  summaryButton: {
    fontSize: 18,
    color: '#00BFFF',
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
    color: '#00BFFF',
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
});

export default HabitTrackingScreen;