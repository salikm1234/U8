import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getColorForDimension } from './getColorForDimension';
import { useTheme } from './ThemeContext';

const iconList = [
  { name: 'sunny', label: 'Morning' },
  { name: 'moon', label: 'Evening' },
  { name: 'school', label: 'Learning' },
  { name: 'fitness', label: 'Fitness' },
  { name: 'library', label: 'Study' },
  { name: 'walk', label: 'Exercise' },
  { name: 'color-palette', label: 'Creative' },
  { name: 'musical-notes', label: 'Music' },
  { name: 'leaf', label: 'Nature' },
  { name: 'flame', label: 'Energy' },
  { name: 'water', label: 'Flow' },
  { name: 'body', label: 'Wellness' },
  { name: 'star', label: 'Goals' }
];

const RoutineEditorScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const editingRoutine = route.params?.routine || null;
  const [name, setName] = useState(editingRoutine?.name || '');
  const [selectedIcon, setSelectedIcon] = useState(editingRoutine?.icon || 'sunny');
  const [weekdays, setWeekdays] = useState(editingRoutine?.weekdays ?? true);
  const [weekends, setWeekends] = useState(editingRoutine?.weekends ?? false);
  const [dimensionColors, setDimensionColors] = useState({});
  const [taskDimensions, setTaskDimensions] = useState([]);

  useEffect(() => {
    // Load dimension colors
    const dims = ['Physical', 'Mental', 'Environmental', 'Financial', 'Intellectual', 'Occupational', 'Social', 'Spiritual'];
    const loadColors = async () => {
      const colors = {};
      for (const dim of dims) {
        colors[dim] = await getColorForDimension(dim);
      }
      setDimensionColors(colors);
    };
    loadColors();
    // Get unique dimensions from tasks
    if (editingRoutine?.tasks) {
      const dimsInTasks = editingRoutine.tasks.map(t => t.dimension).filter(Boolean);
      setTaskDimensions([...new Set(dimsInTasks)]);
    }
  }, [editingRoutine]);

  // 💾 Save and load routines
  const saveRoutine = async () => {
    if (!name.trim()) return Alert.alert('Routine name is required');
    const routines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
    const newRoutine = {
      id: editingRoutine?.id || `${Date.now()}`,
      name,
      icon: selectedIcon,
      weekdays,
      weekends,
      tasks: editingRoutine?.tasks || [],
    };
    const updatedRoutines = editingRoutine
      ? routines.map((r) => (r.id === editingRoutine.id ? newRoutine : r))
      : [...routines, newRoutine];
    await AsyncStorage.setItem('routines', JSON.stringify(updatedRoutines));
    navigation.goBack();
  };

  // 🗑️ Delete routine with confirmation
  const deleteRoutine = async () => {
    Alert.alert('Delete Routine', 'Are you sure you want to delete this routine?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const routines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
          const updated = routines.filter((r) => r.id !== editingRoutine.id);
          await AsyncStorage.setItem('routines', JSON.stringify(updated));
          navigation.goBack();
        },
      },
    ]);
  };

  const styles = createStyles(theme);
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
  style={styles.backButton}
  onPress={() => navigation.goBack()} // ✅ Goes back without saving
>
  <Ionicons name="arrow-back" size={28} color={theme.text} />
  {/* <Text style={styles.backButtonText}>Back</Text> */}
</TouchableOpacity>
      <Text style={styles.label}>Routine Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter routine name" />

      <Text style={styles.label}>Select Icon</Text>
      <View style={styles.iconContainer}>
        {iconList.map((icon, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedIcon(icon.name)}
            style={[
              styles.iconCircle,
              selectedIcon === icon.name && { borderWidth: 3, borderColor: '#4CAF50', backgroundColor: '#E8F5E8' },
            ]}
          >
            <Ionicons name={icon.name} size={28} color={selectedIcon === icon.name ? '#4CAF50' : '#666'} />
            <Text style={[styles.iconLabel, selectedIcon === icon.name && { color: '#4CAF50', fontWeight: '600' }]}>{icon.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity onPress={() => setWeekdays(!weekdays)}>
          <View style={styles.checkboxItem}>
            <Ionicons name={weekdays ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={weekdays ? '#4CAF50' : '#ccc'} />
            <Text style={styles.checkboxText}>Weekdays</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekends(!weekends)}>
          <View style={styles.checkboxItem}>
            <Ionicons name={weekends ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={weekends ? '#4CAF50' : '#ccc'} />
            <Text style={styles.checkboxText}>Weekends</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveRoutine}>
        <Text style={styles.saveButtonText}>Done</Text>
      </TouchableOpacity>

      {editingRoutine && (
        <TouchableOpacity style={styles.deleteButton} onPress={deleteRoutine}>
          <Text style={styles.deleteButtonText}>Delete Routine</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { padding: 20, marginTop: 40, backgroundColor: theme.background },
  label: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: theme.text },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15, borderColor: theme.border, backgroundColor: theme.inputBackground, color: theme.text },
  iconContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  iconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  iconLabel: { 
    fontSize: 10, 
    textAlign: 'center', 
    marginTop: 4, 
    color: '#666' 
  },
  checkboxContainer: { marginVertical: 20 },
  checkboxItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8'
  },
  checkboxText: { fontSize: 16, marginLeft: 12, color: '#333' },
  saveButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10 },
  saveButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  deleteButton: { backgroundColor: 'red', padding: 15, borderRadius: 10, marginTop: 10 },
  deleteButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 18,
    marginLeft: 5,
    color: '#000',
  },
});

export default RoutineEditorScreen;