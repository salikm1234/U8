/**
 * AddTaskScreen - Task Creation and Editing Component
 * 
 * This screen allows users to create new tasks for wellness routines or edit existing ones.
 * Tasks are created by selecting a wellness dimension and a specific goal from the preset library.
 * 
 * Key Features:
 * - Create new tasks for routines
 * - Edit existing tasks
 * - Select from 8 wellness dimensions
 * - Choose from preset goals based on selected dimension
 * - Set task duration in minutes
 * - Automatic step number assignment
 * - Form validation and error handling
 * 
 * Data Structure:
 * - Tasks are stored within routine objects in AsyncStorage
 * - Each task has an ID, name, description, duration, dimension, goalId, and step number
 * - Goals are predefined and organized by dimension
 * - Task editing preserves existing step numbers
 * 
 * User Flow:
 * - Select a wellness dimension (Physical, Mental, etc.)
 * - Choose a goal from the dimension-specific list
 * - Enter task duration in minutes
 * - Save task to routine
 * 
 * Integration:
 * - Integrates with routine management system
 * - Updates routine task lists automatically
 * - Maintains task ordering through step numbers
 * - Supports both add and edit modes
 */

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
import DropDownPicker from 'react-native-dropdown-picker';
import { getColorForDimension } from './getColorForDimension';
import { goals } from './goals';
import { useTheme } from './ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

// Available wellness dimensions for task categorization
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
  const { theme } = useTheme();
  // Extract routine ID from navigation parameters
  const { routineId } = route.params;
  
  // State for form inputs and UI
  const [taskDimension, setTaskDimension] = useState(DIMENSIONS[0]);
  const [dimensionColors, setDimensionColors] = useState({});
  const [goalOptions, setGoalOptions] = useState(goals[DIMENSIONS[0]] || []);
  const [selectedGoalId, setSelectedGoalId] = useState(goals[DIMENSIONS[0]][0]?.id || '');
  const [taskDuration, setTaskDuration] = useState('');
  const [allGoals, setAllGoals] = useState(goals);
  const [isCustomGoal, setIsCustomGoal] = useState(false);
  const [customGoalName, setCustomGoalName] = useState('');
  
  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownItems, setDropdownItems] = useState([]);

  // Load goals from AsyncStorage to get latest updates
  const loadGoals = async () => {
    try {
      const storedGoals = await AsyncStorage.getItem('presetGoals');
      if (storedGoals) {
        const parsedGoals = JSON.parse(storedGoals);
        setAllGoals(parsedGoals);
        setGoalOptions(parsedGoals[taskDimension] || []);
        if (parsedGoals[taskDimension] && parsedGoals[taskDimension].length > 0) {
          setSelectedGoalId(parsedGoals[taskDimension][0].id);
        }
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  // Reload goals when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadGoals();
    }, [taskDimension])
  );

  // Load dimension colors for visual distinction
  useEffect(() => {
    const loadColors = async () => {
      const colors = {};
      const items = [];
      for (const dim of DIMENSIONS) {
        const color = await getColorForDimension(dim);
        colors[dim] = color;
        items.push({ 
          label: dim, 
          value: dim,
          labelStyle: {
            color: dim === taskDimension ? color : theme.text
          }
        });
      }
      setDimensionColors(colors);
      setDropdownItems(items);
    };
    loadColors();
  }, [taskDimension, theme]);

  // Update goal options when dimension changes
  useEffect(() => {
    setGoalOptions(allGoals[taskDimension] || []);
    setSelectedGoalId(allGoals[taskDimension] && allGoals[taskDimension][0]?.id || '');
    setIsCustomGoal(false);
    setCustomGoalName('');
  }, [taskDimension, allGoals]);

  /**
   * Saves the task to the routine
   * Handles both creating new tasks and editing existing ones
   * Validates form inputs and updates AsyncStorage
   * Automatically assigns step numbers to maintain task order
   */
  const saveTask = async () => {
    let taskName, goalId;
    
    if (isCustomGoal) {
      if (!customGoalName.trim() || !taskDuration) {
        alert('Please enter a goal name and duration.');
        return;
      }
      taskName = customGoalName;
      goalId = `custom-${Date.now()}`;
    } else {
      const selectedGoal = goalOptions.find(g => g.id === selectedGoalId);
      if (!selectedGoal || !taskDuration) {
        alert('Please select a goal and enter a duration.');
        return;
      }
      taskName = selectedGoal.name;
      goalId = selectedGoal.id;
    }
    
    // Create task object with all necessary properties
    const newTask = {
      id: route.params?.task?.id || `${Date.now()}`,
      name: taskName,
      description: taskName, // Use goal name as description
      duration: parseInt(taskDuration),
      completed: route.params?.task?.completed || false,
      dimension: taskDimension,
      goalId: goalId,
      isCustom: isCustomGoal,
    };
    
    // Update routine in AsyncStorage
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
    
    // Navigate back after a short delay to ensure data is saved
    setTimeout(() => {
      navigation.goBack();
    }, 100);
  };

  const styles = createStyles(theme);
  
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Navigation header with back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
          {/* <Text style={styles.backButtonText}>Back</Text> */}
        </TouchableOpacity>
        
        {/* Screen title - changes based on add/edit mode */}
        <Text style={styles.header}>{route.params?.task ? 'Edit Task' : 'Add Task to Routine'}</Text>
        
        {/* Dimension selection dropdown */}
        <View style={[styles.inputContainer, { zIndex: 3000 }]}>
          <Text style={styles.label}>Dimension</Text>
          <DropDownPicker
            open={dropdownOpen}
            value={taskDimension}
            items={dropdownItems}
            setOpen={setDropdownOpen}
            setValue={setTaskDimension}
            setItems={setDropdownItems}
            style={{
              backgroundColor: theme.inputBackground,
              borderColor: theme.border,
            }}
            dropDownContainerStyle={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
            textStyle={{
              color: theme.text,
            }}
            labelStyle={{
              color: dimensionColors[taskDimension] || theme.text,
            }}
            arrowIconStyle={{
              tintColor: theme.text,
            }}
            tickIconStyle={{
              tintColor: theme.primaryButton,
            }}
            listItemLabelStyle={{
              color: theme.text,
            }}
            selectedItemLabelStyle={{
              color: theme.text,
              fontWeight: '800',
            }}
          />
        </View>
        
        {/* Toggle between existing goal and custom goal */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !isCustomGoal && styles.toggleButtonActive]}
            onPress={() => setIsCustomGoal(false)}
          >
            <Text style={[styles.toggleText, !isCustomGoal && styles.toggleTextActive]}>
              Select Existing Goal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isCustomGoal && styles.toggleButtonActive]}
            onPress={() => setIsCustomGoal(true)}
          >
            <Text style={[styles.toggleText, isCustomGoal && styles.toggleTextActive]}>
              Create Custom Goal
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Goal selection or custom goal input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{isCustomGoal ? 'Custom Goal Name' : 'Goal'}</Text>
          {isCustomGoal ? (
            <TextInput
              style={styles.inputField}
              placeholder="Enter your custom goal"
              placeholderTextColor={theme.placeholderText}
              value={customGoalName}
              onChangeText={setCustomGoalName}
              maxLength={100}
            />
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedGoalId}
                onValueChange={setSelectedGoalId}
                style={{ width: '100%' }}
                itemStyle={{ 
                  fontSize: 18, 
                  numberOfLines: 3,
                  color: dimensionColors[taskDimension] || theme.text 
                }}
              >
                {goalOptions.map((goal) => (
                  <Picker.Item 
                    key={goal.id} 
                    label={goal.name} 
                    value={goal.id} 
                    numberOfLines={2}
                    color={dimensionColors[taskDimension] || theme.text}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>
        
        {/* Duration input field */}
        <TextInput
          style={styles.inputField}
          placeholder="Duration (minutes)"
          placeholderTextColor={theme.placeholderText}
          keyboardType="numeric"
          value={taskDuration}
          onChangeText={setTaskDuration}
        />
        
        {/* Save button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
          <Text style={styles.saveButtonText}>Save Task</Text>
        </TouchableOpacity>
        
        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * Styles for the AddTaskScreen component
 * Defines the visual appearance of form elements and layout
 * Includes responsive design considerations for different screen sizes
 */
const createStyles = (theme) => StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: theme.background, paddingBottom: 20 },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 20,
  },
  backButtonText: { 
    fontSize: 18, 
    marginLeft: 5, 
    color: theme.text, 
    fontWeight: '500' 
  },
  header: { 
    fontSize: 28, 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: 30, 
    color: theme.text,
    letterSpacing: 0.5,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: theme.inputBackground,
    borderColor: theme.border,
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: theme.primaryButton,
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  saveButtonText: { 
    color: theme.primaryButtonText, 
    textAlign: 'center', 
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: theme.inputBackground,
    borderColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    height: 50,
    width: '100%',
    color: theme.text,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.text,
    letterSpacing: 0.2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  disabledInput: {
    backgroundColor: theme.border,
    color: theme.textSecondary,
  },
  addToEndButton: {
    backgroundColor: theme.info,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.border,
  },
  addToEndButtonActive: {
    backgroundColor: theme.textSecondary,
  },
  addToEndText: {
    color: theme.primaryButtonText,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.secondaryButton,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonActive: {
    backgroundColor: theme.primaryButton,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  toggleTextActive: {
    color: theme.primaryButtonText,
  },
});

export default AddTaskScreen;