import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniversalTime } from './dateUtils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from './ThemeContext';

const HabitSummaryScreen = ({navigation}) => {
  const { theme } = useTheme();
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [averageCount, setAverageCount] = useState(0);

  const { fullDate } = getUniversalTime();
  const initialDate = new Date(`${fullDate}T00:00:00-08:00`);
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear().toString());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Dropdown state
  const [habitOpen, setHabitOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [habitItems, setHabitItems] = useState([]);
  const [monthItems, setMonthItems] = useState([]);
  const [yearItems, setYearItems] = useState([]);

  const loadHabits = async () => {
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
  
    const habitTracker = {};
  
    Object.entries(parsedHabits).forEach(([date, { habits, counts }]) => {
      habits.forEach((habit) => {
        if (!habitTracker[habit.name]) habitTracker[habit.name] = [];
        habitTracker[habit.name].push({ 
            date, 
            count: counts[habit.id] || 0,
            target: habit.target || 1 // 🔥 Store the target value
        });
      });
  
      // ✅ Include deleted habits historically
      const deletedHabits = parsedHabits[date]?.deletedHabits || [];
      deletedHabits.forEach((deletedId) => {
        if (!habitTracker[deletedId]) habitTracker[deletedId] = [];
        habitTracker[deletedId].push({ date, count: null, deleted: true });
      });
    });
  
    const filteredHabits = Object.entries(habitTracker)
      .filter(([, dates]) => dates.length >= 1) // ✅ Show all habits, including new ones
      .map(([name, data]) => ({
        name,
        totalDays: data.length,
        isDeleted: data.some((d) => d.deleted),
        data,
      }));
  
    setHabits(filteredHabits);
    if (filteredHabits.length > 0) setSelectedHabit(filteredHabits[0].name);
    setHabitItems(filteredHabits.map((h) => ({
      label: `${h.name} (${h.totalDays} ${h.totalDays === 1 ? 'day' : 'days'} tracked)${h.isDeleted ? ' - Deleted' : ''}`,
      value: h.name
    })));
  };

  const loadMonthlyData = () => {
    if (!selectedHabit) return;
  
    const habitData = habits.find((h) => h.name === selectedHabit)?.data || [];
    const filtered = habitData.filter(
      (d) => {
        const dateObj = new Date(`${d.date}T00:00:00-08:00`); // ✅ Force PST
        return (
          dateObj.getMonth() === parseInt(selectedMonth, 10) &&
          dateObj.getFullYear() === parseInt(selectedYear, 10)
        );
      }
    );
  
    const daysInMonth = new Date(parseInt(selectedYear, 10), parseInt(selectedMonth, 10) + 1, 0).getDate();
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
        const habitEntry = filtered.find((d) => new Date(`${d.date}T00:00:00-08:00`).getDate() === i + 1);
        return {
            day: i + 1,
            count: habitEntry?.count ?? null,
            target: habitEntry?.target ?? 1 // 🔥 Ensure the target is included
        };
    });
  
    setMonthlyData(calendarDays);
    
    const validCounts = calendarDays.filter((d) => d.count !== null).map((d) => d.count);
    setAverageCount(validCounts.length ? (validCounts.reduce((sum, c) => sum + c, 0) / validCounts.length).toFixed(2) : 0);
  };

  const deleteHabitFromHistory = async (habitName) => {
    Alert.alert(
      'Delete Habit History',
      `Are you sure you want to remove "${habitName}" from your history? This will remove it from the summary but won't affect your daily tracking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove the habit from all historical data
              const storedHabits = await AsyncStorage.getItem('allHabits');
              const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
              
              // Go through each date and remove this habit
              Object.keys(parsedHabits).forEach(date => {
                if (parsedHabits[date].habits) {
                  parsedHabits[date].habits = parsedHabits[date].habits.filter(
                    habit => habit.name !== habitName
                  );
                }
              });
              
              // Save the updated data
              await AsyncStorage.setItem('allHabits', JSON.stringify(parsedHabits));
              
              // Reload habits and reset selection
              await loadHabits();
              setSelectedHabit(null);
              Alert.alert('Success', 'Habit removed from history');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete habit from history');
            }
          }
        }
      ]
    );
  };

  useEffect(() => { 
    loadHabits(); 
    // Setup month and year dropdowns
    setMonthItems(months.map((m, idx) => ({ label: m, value: idx.toString() })));
    const currentYear = new Date().getFullYear();
    setYearItems(Array.from({ length: 5 }, (_, i) => ({ label: (currentYear - i).toString(), value: (currentYear - i).toString() })));
  }, []);
  useEffect(() => { loadMonthlyData(); }, [selectedHabit, selectedMonth, selectedYear, habits]);

  const styles = createStyles(theme);
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Habit Selector */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color={theme.text} />
        <Text style={styles.backText}>Back to Habits</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Select Habit:</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <DropDownPicker
            open={habitOpen}
            value={selectedHabit}
            items={habitItems}
            setOpen={setHabitOpen}
            setValue={setSelectedHabit}
            setItems={setHabitItems}
            placeholder="Select a habit"
            style={{}}
            containerStyle={{ zIndex: 30 }}
            dropDownContainerStyle={{ zIndex: 30 }}
          />
        </View>
        {selectedHabit && (
          <TouchableOpacity 
            style={{ 
              marginLeft: 10, 
              backgroundColor: '#FF6B6B', 
              borderRadius: 8, 
              padding: 10,
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onPress={() => deleteHabitFromHistory(selectedHabit)}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Month & Year Selector */}
      <View style={styles.dateSelector}>
        <View style={{ flex: 1, marginRight: 8, zIndex: 20 }}>
          <DropDownPicker
            open={monthOpen}
            value={selectedMonth}
            items={monthItems}
            setOpen={setMonthOpen}
            setValue={setSelectedMonth}
            setItems={setMonthItems}
            placeholder="Month"
            style={{}}
            containerStyle={{ zIndex: 20 }}
            dropDownContainerStyle={{ zIndex: 20 }}
            disabled={false}
          />
        </View>
        <View style={{ flex: 1, zIndex: 10 }}>
          <DropDownPicker
            open={yearOpen}
            value={selectedYear}
            items={yearItems}
            setOpen={setYearOpen}
            setValue={setSelectedYear}
            setItems={setYearItems}
            placeholder="Year"
            style={{}}
            containerStyle={{ zIndex: 10 }}
            dropDownContainerStyle={{ zIndex: 10 }}
            disabled={false}
          />
        </View>
      </View>

      {/* Calendar Grid */}
      <Text style={styles.label}>Habit Counts for {months[selectedMonth]} {selectedYear}:</Text>
      <View style={styles.gridContainer}>
      {monthlyData.map(({ day, count, target }) => {
    // console.log("Day:", day, "Count:", count, "Target:", target, "Meets Target:", Number(count) >= target);

    return (
        <View key={day} style={[
            styles.dayBox, 
            { 
                backgroundColor: count === null 
                    ? '#E0E0E0' 
                    : Number(count) >= target
                        ? '#90EE90'  
                        : '#FF6347'  
            }
        ]}>
            <Text style={styles.dayText}>{day}</Text>
            {count !== null && <Text style={styles.countText}>{count}</Text>}
        </View>
    );
})}
      </View>

      {/* Average */}
      <Text style={styles.averageText}>Average per day: {averageCount}</Text>
    </ScrollView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: theme.background, marginTop: 50 },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: theme.text },
  dateSelector: { flexDirection: 'row', marginBottom: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBox: { width: '13%', height: 60, margin: 5, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  dayText: { fontSize: 16, fontWeight: 'bold' },
  countText: { fontSize: 14 },
  averageText: { fontSize: 20, fontWeight: 'bold', marginTop: 20, textAlign: 'center', color: theme.text },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backText: { fontSize: 18, color: theme.primaryButtonText, marginLeft: 10 },
});

export default HabitSummaryScreen;