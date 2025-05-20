import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniversalTime } from './dateUtils';
import Ionicons from 'react-native-vector-icons/Ionicons';

const HabitSummaryScreen = ({navigation}) => {
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState(null);
//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
//   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [monthlyData, setMonthlyData] = useState([]);
  const [averageCount, setAverageCount] = useState(0);

  const { fullDate } = getUniversalTime();
  const initialDate = new Date(`${fullDate}T00:00:00-08:00`);
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear().toString());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
      .filter(([, dates]) => dates.length >= 2) // ✅ Persisted at least 2 days
      .map(([name, data]) => ({
        name,
        totalDays: data.length,
        isDeleted: data.some((d) => d.deleted),
        data,
      }));
  
    setHabits(filteredHabits);
    if (filteredHabits.length > 0) setSelectedHabit(filteredHabits[0].name);
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

  useEffect(() => { loadHabits(); }, []);
  useEffect(() => { loadMonthlyData(); }, [selectedHabit, selectedMonth, selectedYear, habits]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Habit Selector */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
  <Ionicons name="arrow-back" size={28} color="#00BFFF" />
  <Text style={styles.backText}>Back to Habits</Text>
</TouchableOpacity>
      <Text style={styles.label}>Select Habit:</Text>
      <Picker selectedValue={selectedHabit} onValueChange={(v) => setSelectedHabit(v)}>
  {habits.map((h) => (
    <Picker.Item
      key={h.name}
      label={`${h.name} (${h.totalDays} days tracked)${h.isDeleted ? ' - Deleted' : ''}`}
      value={h.name}
    />
  ))}
</Picker>

      {/* Month & Year Selector */}
      <View style={styles.dateSelector}>
  <Picker selectedValue={selectedMonth} style={{ flex: 1 }} onValueChange={(v) => setSelectedMonth(v)}>
    {months.map((m, idx) => {
      const isFutureMonth = parseInt(selectedYear, 10) === new Date().getFullYear() && idx > new Date().getMonth();
      return (
        <Picker.Item key={idx} label={m} value={idx.toString()} enabled={!isFutureMonth} />
      );
    })}
  </Picker>

  <Picker selectedValue={selectedYear} style={{ flex: 1 }} onValueChange={(v) => setSelectedYear(v)}>
    {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
      <Picker.Item key={y} label={y} value={y} />
    ))}
  </Picker>
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

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5', marginTop: 50 },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  dateSelector: { flexDirection: 'row', marginBottom: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBox: { width: '13%', height: 60, margin: 5, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  dayText: { fontSize: 16, fontWeight: 'bold' },
  countText: { fontSize: 14 },
  averageText: { fontSize: 20, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
backText: { fontSize: 18, color: '#00BFFF', marginLeft: 10 },
});

export default HabitSummaryScreen;