import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, ScrollView, Modal, Animated, Keyboard, TouchableOpacity, TextInput, FlatList, Alert, Platform, UIManager, TouchableWithoutFeedback, StyleSheet, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getUniversalTime } from './dateUtils';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { configureNotifications, sendHabitCompletionNotification } from './notificationService';
import { Picker } from '@react-native-picker/picker';
import { getColorForDimension } from './getColorForDimension';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper to format YYYY-MM-DD to 'Month Day, Year'
function formatDateLong(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitDimension, setNewHabitDimension] = useState('Physical');
  const [dimensionColors, setDimensionColors] = useState({});

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
      await cloneYesterdayHabits();  // 🎯 Clone yesterday's habits if missing
    }
  };

  useEffect(() => {
    configureNotifications(); // ✅ Initialize notifications on app load
    loadHabitsForDate(selectedDate);
  }, []);

  useEffect(() => {
    // Load all dimension colors on mount
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
      dimension: newHabitDimension,
    };
    const updatedHabits = [...habits, newHabit];
    const updatedCounts = { ...counts, [newHabit.id]: 0 };
    setHabits(updatedHabits);
    setCounts(updatedCounts);
    await saveHabits(selectedDate, updatedHabits, updatedCounts);
    setNewHabitName('');
    setNewHabitTarget('');
    setNewHabitDimension('Physical');
    setShowAddModal(false);
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
    <View style={{ flex: 1, backgroundColor: '#f5fafd' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.container]} keyboardShouldPersistTaps="handled">
          {/* Modern Header */}
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            {selectedDate === getUniversalTime().fullDate ? (
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#222', marginTop: 10 }}>Your Habits Today</Text>
            ) : (
              <Text style={{ fontSize: 18, fontWeight: '500', color: '#222', marginTop: 10 }}>
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
                  <Ionicons name="analytics-outline" size={26} color="#00BFFF" />
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
                />
              </View>
            </View>
          </View>
          {/* Encouragement if all complete */}
          {habits.length > 0 && habits.every(h => counts[h.id] >= h.target) && (
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4BB543' }}>All done! 🎉</Text>
              <Text style={{ fontSize: 16, color: '#888', marginTop: 6 }}>You completed all your habits today!</Text>
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
                    backgroundColor: '#fff',
                    borderRadius: 20,
                    marginVertical: 10,
                    padding: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
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
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: completed ? '#4BB543' : '#222', textDecorationLine: completed ? 'line-through' : 'none' }}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <Text style={{ fontSize: 15, color: '#888', marginRight: 8 }}>{counts[item.id] || 0} / {item.target}</Text>
                        {completed && <Ionicons name="star" size={20} color="#FFD700" style={{ marginLeft: 4 }} />}
                      </View>
                      {/* Progress Bar */}
                      <View style={{ width: '100%', height: 10, backgroundColor: '#E0E0E0', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
                        <View style={{ height: '100%', backgroundColor: completed ? '#4BB543' : color, borderRadius: 6, width: `${Math.min((counts[item.id] || 0) / item.target * 100, 100)}%` }} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                      <TouchableOpacity onPress={() => decrementCount(item.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                        <Ionicons name="remove" size={22} color="#888" />
                      </TouchableOpacity>
                      <TextInput
                        value={counts[item.id]?.toString() || '0'}
                        style={{ width: 40, height: 32, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 15, backgroundColor: '#fff', marginHorizontal: 2, borderColor: '#eee' }}
                        keyboardType="number-pad"
                        onChangeText={(value) => handleInputChange(item.id, value)}
                      />
                      <TouchableOpacity onPress={() => incrementCount(item.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: completed ? '#4BB543' : color, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>
                        <Ionicons name="add" size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
          {/* Add Habit Modal */}
          <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, width: 320, maxWidth: '95%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 14 }}>Add a New Habit</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10, width: '100%', backgroundColor: '#fff', color: '#222' }}
                    placeholder="Habit Name"
                    placeholderTextColor="#888"
                    value={newHabitName}
                    onChangeText={setNewHabitName}
                  />
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10, width: '100%', backgroundColor: '#fff', color: '#222' }}
                    placeholder="Target Count"
                    placeholderTextColor="#888"
                    value={newHabitTarget}
                    keyboardType="number-pad"
                    onChangeText={setNewHabitTarget}
                  />
                  <View style={{ width: '100%', marginBottom: 14 }}>
                    <Text style={{ fontSize: 15, marginBottom: 4 }}>Dimension</Text>
                    <Picker
                      selectedValue={newHabitDimension}
                      onValueChange={setNewHabitDimension}
                      style={{ width: '100%' }}
                    >
                      {Object.keys(dimensionColors).map((dim) => (
                        <Picker.Item key={dim} label={dim} value={dim} color={dimensionColors[dim]} />
                      ))}
                    </Picker>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#eee', marginRight: 10 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#888' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={addNewHabit} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#00BFFF' }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#fff' }}>Add</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', marginTop:40 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  headerText: { fontSize: 18, fontWeight: '500', marginRight: 10 },
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