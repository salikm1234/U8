import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';
import { useTheme } from './ThemeContext';
import { useColors } from './ColorContext';

const RoutineTrackingScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { getColor } = useColors();
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

  const styles = createStyles(theme);
  
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
                        backgroundColor: getColor(dim),
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
                  <Ionicons name={routine.icon || 'star'} size={32} color={theme.primaryButtonText} />
                </View>
                <TouchableOpacity onPress={() => handleEditRoutine(routine)}>
                  <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
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
        <Ionicons name="add-circle" size={24} color={theme.primaryButtonText} />
        <Text style={styles.addButtonText}>Add New Routine</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { 
    padding: 20, 
    marginTop: 40, 
    flexGrow: 0, 
    backgroundColor: theme.background 
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40,
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    marginVertical: 10,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyText: { 
    fontSize: 18, 
    color: theme.textSecondary,
    fontWeight: '500'
  },
  addButton: { 
    backgroundColor: theme.primaryButton, 
    padding: 16, 
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  addButtonText: { 
    color: theme.primaryButtonText, 
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  routineContainer: { 
    padding: 20, 
    borderRadius: 16, 
    marginVertical: 10,
    backgroundColor: theme.cardBackground,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  segmentedColorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: theme.primaryButton,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.border,
  },
  routineName: { 
    fontSize: 22, 
    fontWeight: '700', 
    marginVertical: 10,
    color: theme.text,
    letterSpacing: 0.3,
  },
  routineDuration: { 
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: theme.success,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBar: { 
    height: 8, 
    backgroundColor: theme.success, 
    borderRadius: 4,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 0.5,
  },
});

export default RoutineTrackingScreen;