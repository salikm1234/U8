import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';
import { getColorForDimension } from './getColorForDimension';

const RoutineTrackingScreen = ({ navigation }) => {
  const [routines, setRoutines] = useState([]);
  const [progress, setProgress] = useState({});
  const [dimensionColors, setDimensionColors] = useState({});

  useEffect(() => {
    // Load all dimension colors on mount
    const dims = ['Physical', 'Mental', 'Environmental', 'Financial', 'Intellectual', 'Occupational', 'Social', 'Spiritual'];
    const loadColors = async () => {
      const colors = {};
      for (const dim of dims) {
        colors[dim] = await getColorForDimension(dim);
      }
      setDimensionColors(colors);
    };
    loadColors();
  }, []);

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
        routines.map((routine) => {
          // Get unique dimensions from tasks
          const taskDimensions = [...new Set((routine.tasks || []).map(t => t.dimension).filter(Boolean))];
          return (
            <TouchableOpacity
              key={routine.id}
              style={styles.routineContainer}
              onPress={() => handleStartRoutine(routine)}
            >
              {/* Segmented color bar */}
              <View style={styles.segmentedColorBar}>
                {taskDimensions.length === 0 ? (
                  <View style={{ flex: 1, height: 12, backgroundColor: '#E9ECEF', borderRadius: 8 }} />
                ) : (
                  taskDimensions.map((dim, idx) => (
                    <View
                      key={dim}
                      style={{
                        flex: 1,
                        height: 12,
                        backgroundColor: dimensionColors[dim] || '#ccc',
                        borderTopLeftRadius: idx === 0 ? 8 : 0,
                        borderBottomLeftRadius: idx === 0 ? 8 : 0,
                        borderTopRightRadius: idx === taskDimensions.length - 1 ? 8 : 0,
                        borderBottomRightRadius: idx === taskDimensions.length - 1 ? 8 : 0,
                        marginRight: idx !== taskDimensions.length - 1 ? 2 : 0,
                      }}
                    />
                  ))
                )}
              </View>
              <View style={styles.routineHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name={routine.icon || 'star'} size={32} color="#4CAF50" />
                </View>
                <TouchableOpacity onPress={() => handleEditRoutine(routine)}>
                  <Ionicons name="settings-outline" size={24} color="#6C757D" />
                </TouchableOpacity>
              </View>
              <Text style={styles.routineName}>{routine.name}</Text>
              <Text style={styles.routineDuration}>
                Total Duration: {routine.tasks.reduce((acc, t) => acc + t.duration, 0)} mins
              </Text>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  {Math.round((progress[routine.id] || 0) * 100)}% Complete
                </Text>
              </View>
              <Animated.View
                style={[styles.progressBar, { width: `${(progress[routine.id] || 0) * 100}%` }]}
              />
            </TouchableOpacity>
          );
        })
      )}
  
      {/* ✅ Always visible "Add New Routine" button */}
      <TouchableOpacity
        style={[styles.addButton, { marginTop: 20 }]}
        onPress={() => navigation.navigate('RoutineEditorScreen')}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Routine</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40, flexGrow: 0 },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: { 
    fontSize: 18, 
    color: '#6C757D',
    fontWeight: '500'
  },
  addButton: { 
    backgroundColor: '#4CAF50', 
    padding: 16, 
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16
  },
  routineContainer: { 
    padding: 20, 
    borderRadius: 16, 
    marginVertical: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  segmentedColorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 12,
  },
  routineHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routineName: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginVertical: 10,
    color: '#333',
  },
  routineDuration: { 
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBar: { 
    height: 8, 
    backgroundColor: '#4CAF50', 
    borderRadius: 4,
  },
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