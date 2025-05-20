import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';

const RoutineTrackingScreen = ({ navigation }) => {
  const [routines, setRoutines] = useState([]);
  const [progress, setProgress] = useState({});

  const loadRoutines = async () => {
    const storedRoutines = await AsyncStorage.getItem('routines');
    if (storedRoutines) {
      const parsedRoutines = JSON.parse(storedRoutines);
      const today = new Date();
      const filtered = parsedRoutines.filter(r => {
        const isWeekday = today.getDay() !== 0 && today.getDay() !== 6;
        return (isWeekday && r.weekdays) || (!isWeekday && r.weekends);
      });
      setRoutines(filtered);
      await calculateProgress(filtered);
    }
  };

  const calculateProgress = async (routinesList) => {
    try {
        const todayKey = getUniversalTime().fullDate;
        const updatedProgress = {};

        for (const routine of routinesList) {
            const storedCompletion = JSON.parse(await AsyncStorage.getItem(`completion-${routine.id}-${todayKey}`)) || {};
            const totalTasks = routine.tasks?.length || 0;
            const completedTasks = routine.tasks?.filter((task) => storedCompletion[task.id]).length || 0;

            updatedProgress[routine.id] = totalTasks > 0 ? completedTasks / totalTasks : 0;
        }

        setProgress(updatedProgress);
    } catch (error) {
        console.error('Error calculating progress:', error);
    }
};

useFocusEffect(
    React.useCallback(() => {
      const checkProgressUpdate = async () => {
        const updated = await AsyncStorage.getItem('routineProgressUpdated');
        if (updated === 'true') {
          console.log('Routine progress update detected.');
          await AsyncStorage.removeItem('routineProgressUpdated');
          await loadRoutines(); // ✅ Use the correct function
        }
      };
  
      checkProgressUpdate();
      loadRoutines(); // ✅ Use the correct function
    }, [])
  );

  const handleEditRoutine = (routine) => {
    navigation.navigate('RoutineEditorScreen', { routine });
  };

  const handleStartRoutine = (routine) => {
    navigation.navigate('RoutineActionScreen', { routine });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
  <Text style={styles.titleText}>Today's Routines</Text>
</View>
      {routines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No routines created for today</Text>
        </View>
      ) : (
        routines.map((routine) => (
          <TouchableOpacity
            key={routine.id}
            style={[styles.routineContainer, { backgroundColor: routine.color }]}
            onPress={() => handleStartRoutine(routine)}
          >
            <View style={styles.routineHeader}>
              <Text style={styles.routineEmoji}>{routine.emoji}</Text>
              <TouchableOpacity onPress={() => handleEditRoutine(routine)}>
                <Ionicons name="information-circle-outline" size={24} color="blue" />
              </TouchableOpacity>
            </View>
            <Text style={styles.routineName}>{routine.name}</Text>
            <Text style={styles.routineDuration}>
              Total Duration: {routine.tasks.reduce((acc, t) => acc + t.duration, 0)} mins
            </Text>
            <Animated.View
              style={[styles.progressBar, { width: `${(progress[routine.id] || 0) * 100}%` }]}
            />
          </TouchableOpacity>
        ))
      )}
  
      {/* ✅ Always visible "Add New Routine" button */}
      <TouchableOpacity
        style={[styles.addButton, { marginTop: 20 }]}
        onPress={() => navigation.navigate('RoutineEditorScreen')}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Routine</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyText: { fontSize: 18, marginBottom: 20 },
  addButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  routineContainer: { padding: 15, borderRadius: 15, marginVertical: 10 },
  routineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routineEmoji: { fontSize: 40 },
  routineName: { fontSize: 22, fontWeight: 'bold', marginVertical: 10 },
  routineDuration: { fontSize: 16 },
  progressBar: { height: 10, backgroundColor: 'green', borderRadius: 5, marginTop: 10 },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,  // Space below heading
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default RoutineTrackingScreen;