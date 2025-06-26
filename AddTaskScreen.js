import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Keyboard,
    TouchableWithoutFeedback,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
  } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { getColorForDimension } from './getColorForDimension';
import { goals } from './goals';

const DIMENSIONS = [
  'Physical',
  'Mental',
  'Environmental',
  'Financial',
  'Intellectual',
  'Occupational',
  'Social',
  'Spiritual',
];

const AddTaskScreen = ({ navigation, route }) => {
  const { routineId } = route.params;
  const [taskDimension, setTaskDimension] = useState(DIMENSIONS[0]);
  const [dimensionColors, setDimensionColors] = useState({});
  const [goalOptions, setGoalOptions] = useState(goals[DIMENSIONS[0]] || []);
  const [selectedGoalId, setSelectedGoalId] = useState(goals[DIMENSIONS[0]][0]?.id || '');
  const [taskDuration, setTaskDuration] = useState('');

  useEffect(() => {
    // Load dimension colors
    const loadColors = async () => {
      const colors = {};
      for (const dim of DIMENSIONS) {
        colors[dim] = await getColorForDimension(dim);
      }
      setDimensionColors(colors);
    };
    loadColors();
  }, []);

  useEffect(() => {
    setGoalOptions(goals[taskDimension] || []);
    setSelectedGoalId(goals[taskDimension][0]?.id || '');
  }, [taskDimension]);

  const saveTask = async () => {
    const selectedGoal = goalOptions.find(g => g.id === selectedGoalId);
    if (!selectedGoal || !taskDuration) {
      alert('Please select a goal and enter a duration.');
      return;
    }
    const newTask = {
      id: route.params?.task?.id || `${Date.now()}`,
      name: selectedGoal.name,
      description: selectedGoal.name, // Optionally use goal name as description
      duration: parseInt(taskDuration),
      completed: route.params?.task?.completed || false,
      dimension: taskDimension,
      goalId: selectedGoal.id,
    };
    const storedRoutines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
    const updatedRoutines = storedRoutines.map((r) => {
      if (r.id !== routineId) return r;
      let updatedTasks;
      if (route.params?.task) {
        // Edit mode: update the task in place
        updatedTasks = r.tasks.map((t) => (t.id === route.params.task.id ? { ...newTask, stepNumber: t.stepNumber } : t));
      } else {
        // Add mode: append to end
        updatedTasks = [...(r.tasks || []), { ...newTask, stepNumber: (r.tasks?.length || 0) + 1 }];
      }
      // Ensure every task gets a correct step number
      const reindexedTasks = updatedTasks.map((task, index) => ({
        ...task,
        stepNumber: index + 1,
      }));
      return { ...r, tasks: reindexedTasks };
    });
    await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));
    setTimeout(() => {
      navigation.goBack();
    }, 100);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>{route.params?.task ? 'Edit Task' : 'Add Task to Routine'}</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Dimension</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={taskDimension}
              onValueChange={setTaskDimension}
              style={{ width: '100%' }}
              itemStyle={{ fontSize: 20 }}
            >
              {DIMENSIONS.map((dim) => (
                <Picker.Item key={dim} label={dim} value={dim} color={dimensionColors[dim] || '#222'} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Goal</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedGoalId}
              onValueChange={setSelectedGoalId}
              style={{ width: '100%' }}
              itemStyle={{ fontSize: 18, numberOfLines: 3 }}
            >
              {goalOptions.map((goal) => (
                <Picker.Item key={goal.id} label={goal.name} value={goal.id} numberOfLines={2} />
              ))}
            </Picker>
          </View>
        </View>
        <TextInput
          style={styles.inputField}
          placeholder="Duration (minutes)"
          keyboardType="numeric"
          value={taskDuration}
          onChangeText={setTaskDuration}
        />
        <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
          <Text style={styles.saveButtonText}>Save Task</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#F9F9F9', paddingBottom: 20 },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 20, // ⬅️ Increase this value to lower the button
  },
  backButtonText: { fontSize: 18, marginLeft: 5 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  saveButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  inputContainer: {
    marginBottom: 15,
  },
  disabledInput: {
    backgroundColor: '#ddd',
    color: '#888',
  },
  addToEndButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  addToEndButtonActive: {
    backgroundColor: '#555',
  },
  addToEndText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddTaskScreen;