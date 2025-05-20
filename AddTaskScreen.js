import React, { useState,useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Keyboard,
    TouchableWithoutFeedback,
  } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker'; // Import the Picker

const AddTaskScreen = ({ navigation, route }) => {
  const { routineId, reloadTasks } = route.params;
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDuration, setTaskDuration] = useState('');
  const [taskOrderOptions, setTaskOrderOptions] = useState(['1']); // Will update dynamically
  const [taskOrder, setTaskOrder] = useState(''); // Allow it to be empty
const [totalTasks, setTotalTasks] = useState(0); // Will track valid positions
const [addToEnd, setAddToEnd] = useState(false); // Tracks if the "Add to End" button is selected

useEffect(() => {
    const fetchTasks = async () => {
      const storedRoutines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
      const currentRoutine = storedRoutines.find((r) => r.id === routineId);
      setTotalTasks(currentRoutine?.tasks?.length || 0); // Set number of existing tasks
    };
  
    fetchTasks();
  }, []);

  useEffect(() => {
    if (route.params?.task) {
      const { task } = route.params;
      setTaskName(task.name);
      setTaskDescription(task.description);
      setTaskDuration(task.duration.toString());
      setTaskOrder(task.stepNumber.toString());
    }
  }, [route.params?.task]);
  
  // Insert task at the selected position


  const saveTask = async () => {
    if (!taskName.trim() || !taskDuration) {
      alert('Please enter valid task details');
      return;
    }
  
    let insertIndex = totalTasks; // Default to adding at the end
  
    if (!addToEnd) {
      if (!taskOrder.trim()) {
        alert('Please enter a task order or select "Add to End".');
        return;
      }
  
      insertIndex = parseInt(taskOrder) - 1;
      if (isNaN(insertIndex) || insertIndex < 0 || insertIndex > totalTasks) {
        alert(`Invalid task order. Choose a position between 1 and ${totalTasks + 1}.`);
        return;
      }
    }
  
    const newTask = {
        id: route.params?.task?.id || `${Date.now()}`, // Reuse ID if editing
        name: taskName,
        description: taskDescription,
        duration: parseInt(taskDuration),
        completed: route.params?.task?.completed || false, // Preserve completion state
        stepNumber: insertIndex + 1,
      };
  
    const storedRoutines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
    const updatedRoutines = storedRoutines.map((r) => {
        if (r.id !== routineId) return r;
      
        const updatedTasks = route.params?.task
  ? r.tasks.map((t) => (t.id === route.params.task.id ? newTask : t)) // Update if editing
  : [...(r.tasks?.slice(0, insertIndex) || []), newTask, ...(r.tasks?.slice(insertIndex) || [])];
      
        // Ensure every task gets a correct step number
        const reindexedTasks = updatedTasks.map((task, index) => ({
          ...task,
          stepNumber: index + 1, // Reassign step numbers after insertion
        }));
      
        return { ...r, tasks: reindexedTasks };
      });
  
      await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));
      setTimeout(() => {
        navigation.goBack();
      }, 100); // Delay to allow AsyncStorage to finish saving
  };


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
  <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#000" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Add New Task</Text>

      <TextInput
        style={styles.inputField}
        placeholder="Task Name"
        value={taskName}
        onChangeText={setTaskName}
      />
      <TextInput
        style={styles.inputField}
        placeholder="Description"
        value={taskDescription}
        onChangeText={setTaskDescription}
      />
      <TextInput
        style={styles.inputField}
        placeholder="Duration (minutes)"
        keyboardType="numeric"
        value={taskDuration}
        onChangeText={setTaskDuration}
      />
{!route.params?.task && (
  <>
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Task Order</Text>
      <TextInput
        style={[styles.inputField, addToEnd && styles.disabledInput]}
        placeholder={`Enter position (1-${totalTasks + 1})`}
        keyboardType="numeric"
        value={addToEnd ? '' : taskOrder} // Clears input when Add to End is selected
        onChangeText={(text) => {
          if (/^\d*$/.test(text)) setTaskOrder(text); // Allow only digits
        }}
        editable={!addToEnd} // Disable when "Add to End" is selected
      />
    </View>

    <TouchableOpacity
      style={[styles.addToEndButton, addToEnd && styles.addToEndButtonActive]}
      onPress={() => {
        setAddToEnd(!addToEnd);
        if (!addToEnd) setTaskOrder(''); // Clear task order when enabling Add to End
      }}
    >
      <Text style={styles.addToEndText}>
        {addToEnd ? 'Adding to End' : 'Add to End'}
      </Text>
    </TouchableOpacity>
  </>
)}


      <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
        <Text style={styles.saveButtonText}>Save Task</Text>
      </TouchableOpacity>
      </View>
      </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F9F9F9' },
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