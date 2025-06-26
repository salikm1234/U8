import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';
// import { getColorForDimension } from './dateUtils';
import { getColorForDimension } from './getColorForDimension';

const CalendarScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(getUniversalTime().fullDate);
  const [dailyGoals, setDailyGoals] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [counterGoal, setCounterGoal] = useState(null);
  const [count, setCount] = useState(0);
  const [dimensionColors, setDimensionColors] = useState({});
  
  const loadDimensionColors = async () => {
    const allDimensions = ['Physical', 'Mental', 'Environmental', 'Financial', 'Intellectual', 'Occupational', 'Social', 'Spiritual'];
    const colors = {};
    for (const dimension of allDimensions) {
      colors[dimension] = await getColorForDimension(dimension);
    }
    setDimensionColors(colors);
  };
  
  useFocusEffect(
    React.useCallback(() => {
      if (selectedDate) {
        loadGoals(selectedDate);
        setMarkedDates({
          [selectedDate]: {
            selected: true,
            selectedColor: '#00adf5', // ✅ Always blue when loading
          },
        });
      }
      loadDimensionColors();
    }, [selectedDate])
  );

  const loadGoals = async (date) => {
    const goals = await AsyncStorage.getItem(date);
    const parsedGoals = goals ? JSON.parse(goals) : [];
  
    const updatedGoals = await Promise.all(
      parsedGoals.map(async (goal) => {
        if (goal.quantifiable) {
          const savedCount = await AsyncStorage.getItem(`count-${goal.id}-${date}`);
          goal.count = savedCount ? parseInt(savedCount) : 0;
        }
        return goal;
      })
    );
  
    setDailyGoals(updatedGoals);
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setMarkedDates({
      [day.dateString]: {
        selected: true,
        selectedColor: '#00adf5', // ✅ Blue color for selected date
      },
    });
  };

  const deleteGoal = async (goalId) => {
    const updatedGoals = dailyGoals.filter(goal => goal.id !== goalId);
    setDailyGoals(updatedGoals);

    if (selectedDate) {
      await AsyncStorage.setItem(selectedDate, JSON.stringify(updatedGoals));
      await AsyncStorage.removeItem(`count-${goalId}-${selectedDate}`);
    }
  };

  const resetGoals = async () => {
    if (selectedDate) {
      await AsyncStorage.removeItem(selectedDate);
      setDailyGoals([]);
    }
  };

  const openCounterModal = async (goal) => {
    const savedCount = await AsyncStorage.getItem(`count-${goal.id}-${selectedDate}`);
    setCount(savedCount ? parseInt(savedCount) : 0);
    setCounterGoal(goal);
    setModalVisible(true);
  };

  const incrementCount = async () => {
    const newCount = count + 1;
    setCount(newCount);
    await AsyncStorage.setItem(`count-${counterGoal.id}-${selectedDate}`, newCount.toString());
    loadGoals(selectedDate); // Refresh UI after change
  };
  
  const decrementCount = async () => {
    const newCount = count - 1;
    if (newCount >= 0) {
      setCount(newCount);
      await AsyncStorage.setItem(`count-${counterGoal.id}-${selectedDate}`, newCount.toString());
      loadGoals(selectedDate); // Refresh UI after change
    }
  };

  const closeCounterModal = () => {
    setModalVisible(false);
    setCounterGoal(null);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.goalItem, { backgroundColor: dimensionColors[item.dimension] || '#D3D3D3' }]}>
      <Text style={[styles.goalText, item.completed && styles.completedText]}>{item.name}</Text>
  
      {/* ✅ Just display count (no interaction) */}
      {item.quantifiable && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>{item.count}/{item.target}</Text>
        </View>
      )}
  
      <TouchableOpacity onPress={() => deleteGoal(item.id)} style={styles.deleteButton}>
        <Ionicons name="trash-bin" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Calendar
  onDayPress={onDayPress}
  markedDates={markedDates}
  renderHeader={(date) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return (
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        {month} {year}
      </Text>
    );
  }}
/>
      
      {selectedDate && (
        <View>
          {dailyGoals.length > 0 ? (
            <FlatList
              data={dailyGoals}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={<Text style={styles.header}>Goals for {selectedDate}</Text>}
            />
          ) : (
            <View style={styles.noGoals}>
              <Text>No goals planned for this day.</Text>
            </View>
          )}
          <Button
            title="Add More Goals"
            onPress={() => {
              navigation.navigate('HomeStack', { screen: 'GoalSetting', params: { date: selectedDate } });
            }}
          />
          <Button title="Reset Goals" onPress={resetGoals} color="red" />
        </View>
      )}

{/* <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeCounterModal}>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>{counterGoal?.name}</Text>
      <Text style={styles.counterText}>Count: {count}/{counterGoal?.target}</Text>

      <TouchableOpacity onPress={incrementCount} style={styles.counterButton}>
        <Text style={styles.counterButtonText}>+1</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={decrementCount} style={styles.counterButton}>
        <Text style={styles.counterButtonText}>-1</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={closeCounterModal} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal> */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  goalText: {
    fontSize: 18,
    color: '#fff',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  counter: {
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 5,
    borderRadius: 5,
  },
  counterText: {
    fontSize: 16,
    color: '#fff',
  },
  noGoals: {
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButton: {
    borderWidth: 2, // Thin border for visibility
    borderColor: '#fff', // White border for contrast
    borderRadius: 15, // Rounded shape
    padding: 5, // Padding for spacing
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Light overlay for better visibility
  },
});

export default CalendarScreen;