/**
 * RoutineActionScreen - Routine Execution and Task Management Component
 * 
 * This screen allows users to execute wellness routines by completing individual tasks.
 * Users can view, complete, reorder, and manage tasks within a specific routine.
 * 
 * Key Features:
 * - Display routine tasks with completion status
 * - Drag-and-drop task reordering
 * - Task completion tracking with visual feedback
 * - Task editing and deletion capabilities
 * - Color-coded tasks by wellness dimension
 * - Daily progress persistence
 * - Integration with routine tracking system
 * 
 * Data Structure:
 * - Tasks are stored within routine objects in AsyncStorage
 * - Each task has an ID, name, description, duration, dimension, and step number
 * - Completion status is tracked separately by date and routine ID
 * - Task order is maintained through step numbers
 * 
 * User Interactions:
 * - Long press to drag and reorder tasks
 * - Tap to mark tasks as complete/incomplete
 * - Edit and delete individual tasks
 * - Add new tasks to the routine
 * 
 * Visual Design:
 * - Modern card-based layout with spacious design
 * - Color-coded accent bars for dimension identification
 * - Integrated action buttons with subtle styling
 * - Compact header with routine information
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getUniversalTime } from './dateUtils';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { getColorForDimension } from './getColorForDimension';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RoutineActionScreen = ({ navigation, route }) => {
  // Extract routine data from navigation parameters
  const { routine } = route.params;
  
  // State for task management and UI
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [lastAddedTask, setLastAddedTask] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0); // Triggers re-renders
  const flatListRef = useRef(null);
  const [dimensionColors, setDimensionColors] = useState({});

  // Load routine tasks when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRoutineTasks();
      return () => console.log('RoutineActionScreen reloaded.');
    }, [routine.id])
  );

  // Load dimension colors for visual distinction
  useEffect(() => {
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

  /**
   * Loads routine tasks from AsyncStorage and resets completion status daily
   * Handles daily completion reset to ensure fresh start each day
   * Sorts tasks by step number and loads completion status
   */
  const loadRoutineTasks = async () => {
    try {
      const todayKey = getUniversalTime().fullDate;
      const lastReset = await AsyncStorage.getItem('lastCompletionReset');
      if (lastReset !== todayKey) {
        await AsyncStorage.removeItem(`completion-${routine.id}-${todayKey}`);
        await AsyncStorage.setItem('lastCompletionReset', todayKey);
      }
      const storedRoutines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
      const currentRoutine = storedRoutines.find((r) => r.id === routine.id);
      if (!currentRoutine) return;
      const storedCompletion = JSON.parse(await AsyncStorage.getItem(`completion-${routine.id}-${todayKey}`)) || {};
      const sortedTasks = [...(currentRoutine.tasks || [])].sort((a, b) => a.stepNumber - b.stepNumber);
      const updatedTasks = sortedTasks.map((task) => ({
        ...task,
        completed: storedCompletion[task.id] || false,
      }));
      setTasks(updatedTasks);
      setRefreshFlag((prev) => prev + 1);
    } catch (error) {
      console.error('Error loading routine tasks:', error);
    }
  };

  /**
   * Persists updated task list to AsyncStorage
   * Updates the routine's task list and maintains data consistency
   * Handles daily completion reset logic
   */
  const persistTasks = async (updatedTasks) => {
    const storedRoutines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
    const updatedRoutines = storedRoutines.map((r) =>
      r.id === routine.id ? { ...r, tasks: updatedTasks } : r
    );
    await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));
    const todayKey = getUniversalTime().fullDate;
    const lastReset = await AsyncStorage.getItem('lastCompletionReset');
    if (lastReset !== todayKey) {
      await AsyncStorage.removeItem(`completion-${routine.id}-${todayKey}`);
      await AsyncStorage.setItem('lastCompletionReset', todayKey);
    }
  };

  /**
   * Toggles the completion status of a task
   * Updates both local state and persistent storage
   * Triggers progress update notification for other screens
   */
  const toggleTaskCompletion = async (taskId) => {
    try {
      const todayKey = getUniversalTime().fullDate;
      const storedCompletion = JSON.parse(await AsyncStorage.getItem(`completion-${routine.id}-${todayKey}`)) || {};
      storedCompletion[taskId] = !storedCompletion[taskId];
      await AsyncStorage.setItem(`completion-${routine.id}-${todayKey}`, JSON.stringify(storedCompletion));
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, completed: storedCompletion[taskId] } : task
      );
      setTasks(updatedTasks);
      await AsyncStorage.setItem(`routineProgressUpdated`, 'true');
    } catch (error) {
      console.error('Error updating task completion:', error);
    }
  };

  /**
   * Updates specific fields of a task
   * Used for inline editing of task properties
   */
  const handleTaskFieldChange = (taskId, field, value) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, [field]: value } : task
    );
    setTasks(updatedTasks);
  };

  /**
   * Shows confirmation dialog before deleting a task
   * Prevents accidental deletion of tasks
   */
  const confirmDeleteTask = (taskId) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask(taskId),
      },
    ]);
  };

  /**
   * Deletes a task and reorders remaining tasks
   * Updates step numbers to maintain proper order
   * Persists changes to storage
   */
  const deleteTask = async (taskId) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    updatedTasks.forEach((task, index) => (task.stepNumber = index + 1));
    setTasks(updatedTasks);
    await persistTasks(updatedTasks);
  };

  /**
   * Navigates to the add task screen
   * Handles returning new task data and updating the task list
   */
  const navigateToAddTask = async () => {
    const newTask = await navigation.navigate('AddTaskScreen', { routineId: routine.id });
    if (newTask) {
      setTasks((prevTasks) => [...prevTasks, newTask]);
    }
  };

  // Trigger re-render when refresh flag changes
  useEffect(() => {
    setTasks((prev) => [...prev]);
  }, [refreshFlag]);

  /**
   * Handles drag-and-drop reordering of tasks
   * Reassigns step numbers based on new order
   * Persists the new order to storage
   */
  const handleDragEnd = async ({ data }) => {
    // Reassign step numbers
    const reordered = data.map((task, idx) => ({ ...task, stepNumber: idx + 1 }));
    setTasks(reordered);
    await persistTasks(reordered);
  };

  /**
   * Renders individual task cards with completion status and actions
   * Each card shows task details, completion status, and action buttons
   * Supports drag-and-drop interaction for reordering
   */
  const renderTaskItem = ({ item, drag, isActive }) => {
    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          { backgroundColor: item.completed ? '#D4F1C5' : '#FFF', opacity: isActive ? 0.8 : 1 },
        ]}
        onLongPress={drag}
        delayLongPress={150}
        activeOpacity={0.9}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          {/* Accent bar for dimension */}
          <View style={{ width: 12, height: '100%', borderRadius: 8, backgroundColor: dimensionColors[item.dimension] || '#00BFFF', marginRight: 16 }} />
          <View style={styles.taskCardContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskNameText}>{item.name}</Text>
              <Text style={styles.taskDescriptionText}>{item.description}</Text>
              <Text style={styles.taskDurationText}>⏳ {item.duration} mins</Text>
            </View>
            <View style={styles.taskActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => toggleTaskCompletion(item.id)}
              >
                <Ionicons name={item.completed ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={item.completed ? '#4CAF50' : '#bbb'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => confirmDeleteTask(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#DC3545" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('AddTaskScreen', { routineId: routine.id, task: item, reloadTasks: loadRoutineTasks })}
              >
                <Ionicons name="create-outline" size={18} color="#6C757D" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.headerContainer}> 
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name={routine.icon || 'star'} size={28} color="#4CAF50" />
            </View>
            <Text style={styles.routineName}>{routine.name}</Text>
          </View>
        </View>
      </View>
      <DraggableFlatList
        ref={flatListRef}
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        onDragEnd={handleDragEnd}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20 }}
        ListFooterComponent={() => (
          <TouchableOpacity style={styles.addTaskButton} onPress={navigateToAddTask}>
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addTaskText}>Add New Task</Text>
          </TouchableOpacity>
        )}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', marginTop: 40 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    borderRadius: 15,
    marginHorizontal: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 18,
    marginLeft: 4,
    color: '#000',
  },
  taskCard: {
    minHeight: 120,
    maxHeight: 150,
    width: '92%',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  taskNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  taskDescriptionText: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4,
  },
  taskDurationText: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 0,
  },
  taskActions: {
    marginLeft: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  addTaskButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  addTaskText: { 
    fontSize: 16, 
    color: '#fff', 
    fontWeight: 'bold',
    marginLeft: 8
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routineName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default RoutineActionScreen;