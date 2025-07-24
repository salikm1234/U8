// mostly depricated

import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { goals as defaultPresetGoals } from './goals';
import { getUniversalTime } from './dateUtils';
import { useColors } from './ColorContext';
import { useGoals } from './GoalsContext';

const GoalSelectionScreen = ({ route, navigation }) => {
    const { getColor } = useColors();
    const { presetGoals } = useGoals();
    const date = route.params?.date || getUniversalTime().fullDate;
        const [selectedDimension, setSelectedDimension] = useState('Physical'); // Default to first dimension
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [scheduledGoals, setScheduledGoals] = useState([]);
  const [availableGoals, setAvailableGoals] = useState({});
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('Daily');
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Reset selected goals when screen is opened
  useFocusEffect(
    React.useCallback(() => {
      setSelectedGoals([]); 
      loadScheduledGoals(); 
      loadGoals(); 
    }, [])
  );
  
  // Reload goals when presetGoals change
  useEffect(() => {
    loadGoals();
  }, [presetGoals]);

  // Load preset and custom goals
  const loadGoals = async () => {
    try {
      const storedCustomGoals = await AsyncStorage.getItem('customGoals');
      const customGoals = storedCustomGoals ? JSON.parse(storedCustomGoals) : {};
  
      // Merge custom and preset goals from context
      const mergedGoals = {};
      for (let dimension of Object.keys(presetGoals)) {
        mergedGoals[dimension] = [...presetGoals[dimension], ...(customGoals[dimension] || [])];
      }
  
      setAvailableGoals(mergedGoals);
      setSelectedGoal(mergedGoals[selectedDimension]?.[0]?.id || '');
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  };

  // Load the scheduled goals for the specific day to prevent duplicates
  const loadScheduledGoals = async () => {
    const storedGoals = await AsyncStorage.getItem(date);
    setScheduledGoals(storedGoals ? JSON.parse(storedGoals) : []);
};


  const getAdjustedTodayDate = () => getUniversalTime().fullDate;

  const onDimensionChange = (dimension) => {
    setSelectedDimension(dimension);
    setSelectedGoal(availableGoals[dimension][0]?.id || '');
  };

  const addGoal = async () => {
    const existingGoals = await AsyncStorage.getItem(date); // Use the selected date
    const scheduledGoalsForDate = existingGoals ? JSON.parse(existingGoals) : [];
  
    const goal = availableGoals[selectedDimension].find(g => g.id === selectedGoal);
  
    // Check if the goal is already scheduled for the selected date (not just today)
    if (scheduledGoalsForDate.some(g => g.id === goal.id)) {
      Alert.alert('Duplicate Goal', `${goal.name} is already scheduled for this day!`);
      return;
    }
  
    // Check if goal is already in the selection list
    if (selectedGoals.some(g => g.id === goal.id)) {
      Alert.alert('Duplicate Goal', `${goal.name} is already in your selection list!`);
      return;
    }
  
    // Proceed to add the goal
    setSelectedGoals(prevGoals => {
      return [...prevGoals, { ...goal, dimension: selectedDimension }];
    });
  };
  

  const removeGoal = (goalId) => {
    setSelectedGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
  };

  const saveGoals = async () => {
    const existingGoals = await AsyncStorage.getItem(date);
    const updatedGoals = existingGoals ? JSON.parse(existingGoals) : [];

    const finalGoals = [...updatedGoals, ...selectedGoals.map(goal => ({ ...goal, completed: false }))];
    await AsyncStorage.setItem(date, JSON.stringify(finalGoals));

    if (recurring) {
        scheduleRecurringGoals();
    }

    // ✅ Check if `goBack()` is possible before calling it
    if (navigation.canGoBack()) {
        navigation.goBack();
    } else {
        navigation.navigate('Home'); // Fallback navigation if `goBack()` isn't possible
    }
};

const scheduleRecurringGoals = async () => {
    let currentDate = new Date(date);
    let finalEndDate = endDate ? new Date(endDate) : new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    while (currentDate <= finalEndDate) {  // ✅ Allow `finalEndDate`, then remove last recurrence manually
        // ✅ Convert `currentDate` to Pacific Time format correctly
        const formattedDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(currentDate);

        const existingGoals = await AsyncStorage.getItem(formattedDate);
        const updatedGoals = existingGoals ? JSON.parse(existingGoals) : [];

        // ✅ Prevent duplicates
        const newGoals = selectedGoals.filter(goal => !updatedGoals.some(g => g.id === goal.id));

        if (newGoals.length > 0) {
            await AsyncStorage.setItem(formattedDate, JSON.stringify([...updatedGoals, ...newGoals.map(goal => ({ ...goal, completed: false }))]));
        }

        // ✅ Move to the next recurrence AFTER scheduling
        let nextDate = getNextRecurrenceDate(new Date(currentDate));

        // ✅ Manually remove the last recurrence if it's extra
        if (nextDate > finalEndDate) break;

        currentDate = nextDate;
    }
};

  const getNextRecurrenceDate = (currentDate) => {
    switch (recurrenceType) {
      case 'Daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'Weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'Biweekly':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'Monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        break;
    }
    return currentDate;
  };


  const renderGoalItem = ({ item }) => {
    return (
      <View style={[styles.goalItem, { backgroundColor: getColor(item.dimension) }]}>
        <Text style={styles.goalText}>{item.name}</Text>
        <TouchableOpacity onPress={() => removeGoal(item.id)}>
          <Ionicons name="remove-circle" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };
  

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.label}>Select Dimension</Text>
        <Picker
  selectedValue={selectedDimension}
  onValueChange={onDimensionChange}
  style={styles.picker}
>
  {Object.keys(availableGoals || {}).map((dim) => (
    <Picker.Item key={dim} label={dim} value={dim} />
  ))}
</Picker>

<Picker
  selectedValue={selectedGoal}
  onValueChange={(goal) => setSelectedGoal(goal)}
  style={styles.picker}
>
  {(availableGoals[selectedDimension] || []).map((goal) => (
    <Picker.Item key={goal.id} label={goal.name} value={goal.id} />
  ))}
</Picker>

        <TouchableOpacity style={styles.addButton} onPress={addGoal}>
          <Ionicons name="add-circle" size={40} color="#00BFFF" />
          <Text style={styles.addButtonText}>Add Goal</Text>
        </TouchableOpacity>

        <FlatList
          data={selectedGoals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text style={styles.header}>Selected Goals</Text>}
          scrollEnabled={false}
        />

        <View style={styles.recurrenceContainer}>
          <Text style={styles.label}>Recurring Goal?</Text>
          <TouchableOpacity onPress={() => setRecurring(!recurring)}>
            <Ionicons name={recurring ? 'checkbox' : 'square-outline'} size={24} color="#000" />
          </TouchableOpacity>

          {recurring && (
            <View style={styles.recurrenceOptions}>
              <Text style={styles.label}>Recurrence Type</Text>
              <Picker
                selectedValue={recurrenceType}
                onValueChange={(value) => setRecurrenceType(value)}
                style={styles.picker}
              >
                <Picker.Item label="Daily" value="Daily" />
                <Picker.Item label="Weekly" value="Weekly" />
                <Picker.Item label="Biweekly" value="Biweekly" />
                <Picker.Item label="Monthly" value="Monthly" />
              </Picker>

              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar" size={24} color="#000" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setEndDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          )}
        </View>

        <Button title="Submit Goals" onPress={saveGoals} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 60, // Extreme padding for spacing
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 18,
    marginBottom: 0, // Spacing between scroll wheel and label
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 160, // More padding below the scroll wheel
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 60,
  },
  addButtonText: {
    fontSize: 20,
    marginLeft: 30, // Extreme margin for text spacing
    color: '#00BFFF',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30, // Additional spacing for goal section
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 45, // Extreme padding for each goal
    borderRadius: 10,
    marginBottom: 30, // Space between goals
  },
  goalText: {
    fontSize: 18,
    color: '#fff',
  },
  recurrenceContainer: {
    marginTop: 20,
  },
  recurrenceOptions: {
    marginTop: 10,
  },
});

export default GoalSelectionScreen;


