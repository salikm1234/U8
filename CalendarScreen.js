import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';
import { useTheme } from './ThemeContext';
import { useColors } from './ColorContext';

const CalendarScreen = ({ navigation }) => {
  const { theme, colorScheme } = useTheme();
  const { getColor } = useColors();
  const [selectedDate, setSelectedDate] = useState(getUniversalTime().fullDate);
  const [dailyGoals, setDailyGoals] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [counterGoal, setCounterGoal] = useState(null);
  const [count, setCount] = useState(0);
  
  /**
   * Determines if text should be black or white based on background color
   * Uses relative luminance calculation for optimal contrast
   */
  const getTextColorForBackground = (backgroundColor) => {
    if (!backgroundColor) return '#FFFFFF';
    
    // Remove # if present
    const color = backgroundColor.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    
    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use black text only for very light backgrounds (like yellow)
    // Higher threshold (0.75) means black text is used more rarely
    return luminance > 0.75 ? '#000000' : '#FFFFFF';
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
    }, [selectedDate])
  );

  const loadGoals = async (date) => {
    const goals = await AsyncStorage.getItem(date);
    const parsedGoals = goals ? JSON.parse(goals) : [];
    // Only show scheduled goals, not habits (habits have a createdOn property)
    const scheduledGoals = parsedGoals.filter(goal => !goal.createdOn);
    const updatedGoals = await Promise.all(
      scheduledGoals.map(async (goal) => {
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

  const renderItem = ({ item }) => {
    const backgroundColor = getColor(item.dimension);
    const textColor = getTextColorForBackground(backgroundColor);
    
    return (
      <View style={[styles.goalItem, { backgroundColor }]}>
        <Text style={[styles.goalText, { color: textColor }, item.completed && styles.completedText]}>{item.name}</Text>
    
        {/* ✅ Just display count (no interaction) */}
        {item.quantifiable && (
          <View style={styles.counter}>
            <Text style={[styles.counterText, { color: textColor }]}>{item.count}/{item.target}</Text>
          </View>
        )}
    
        <TouchableOpacity onPress={() => deleteGoal(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-bin" size={20} color="#E57373" />
        </TouchableOpacity>
      </View>
    );
  };

  const styles = createStyles(theme);
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Calendar
  key={colorScheme} // Force re-render when theme changes
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
    indicatorColor: theme.calendarArrowColor,
    arrowColor: theme.calendarArrowColor,
    textDayFontWeight: '300',
    textMonthFontWeight: 'bold',
    textDayHeaderFontWeight: '300',
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 16,
    'stylesheet.calendar.header': {
      header: {
        backgroundColor: theme.calendarBackground,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 10,
        alignItems: 'center'
      },
      monthText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.calendarMonthTextColor,
        margin: 10
      }
    },
    'stylesheet.day.basic': {
      base: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center'
      },
      text: {
        marginTop: 0,
        fontSize: 16,
        fontWeight: '300',
        color: theme.calendarDayTextColor,
        backgroundColor: 'transparent'
      }
    }
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
      
      {selectedDate && (
        <View>
          {dailyGoals.length > 0 ? (
            <FlatList
              data={dailyGoals}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={<Text style={styles.header}>Goals for {selectedDate}</Text>}
              scrollEnabled={false}
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

const createStyles = (theme) => StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: theme.background,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
    color: theme.text,
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
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: theme.textSecondary,
  },
  counter: {
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 5,
    borderRadius: 5,
  },
  counterText: {
    fontSize: 16,
  },
  noGoals: {
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Soft white background
    borderRadius: 18, // More rounded
    padding: 8, // Slightly more padding
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12, // Move further from text
  },
});

export default CalendarScreen;