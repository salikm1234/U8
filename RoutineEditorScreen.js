import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { useColors } from './ColorContext';

const iconList = [
  { name: 'sunny', label: 'Morning', color: '#FFD93D' },
  { name: 'moon', label: 'Evening', color: '#6C63FF' },
  { name: 'school', label: 'Learning', color: '#FF6B6B' },
  { name: 'fitness', label: 'Fitness', color: '#4ECDC4' },
  { name: 'library', label: 'Study', color: '#45B7D1' },
  { name: 'walk', label: 'Exercise', color: '#96CEB4' },
  { name: 'color-palette', label: 'Creative', color: '#DDA0DD' },
  { name: 'musical-notes', label: 'Music', color: '#FF8A65' },
  { name: 'leaf', label: 'Nature', color: '#81C784' },
  { name: 'flame', label: 'Energy', color: '#FF7043' },
  { name: 'water', label: 'Flow', color: '#64B5F6' },
  { name: 'body', label: 'Wellness', color: '#BA68C8' },
];

const RoutineEditorScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { getColor } = useColors();
  const editingRoutine = route.params?.routine || null;
  const [name, setName] = useState(editingRoutine?.name || '');
  const [selectedIcon, setSelectedIcon] = useState(editingRoutine?.icon || 'sunny');
  const [weekdays, setWeekdays] = useState(editingRoutine?.weekdays ?? true);
  const [weekends, setWeekends] = useState(editingRoutine?.weekends ?? false);
  const [taskDimensions, setTaskDimensions] = useState([]);

  useEffect(() => {
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
      <TextInput 
        style={styles.input} 
        value={name} 
        onChangeText={setName} 
        placeholder="Enter routine name" 
        placeholderTextColor={theme.placeholderText}
      />

      <Text style={styles.label}>Select Icon</Text>
      <View style={styles.iconContainer}>
        {iconList.map((icon, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedIcon(icon.name)}
            style={[
              styles.iconCircle,
              selectedIcon === icon.name && [styles.iconCircleSelected, { backgroundColor: icon.color, borderColor: icon.color }],
            ]}
          >
            <Ionicons name={icon.name} size={32} color={selectedIcon === icon.name ? '#FFFFFF' : icon.color} />
            {/* <Text style={[styles.iconLabel, selectedIcon === icon.name && styles.iconLabelSelected]}>{icon.label}</Text> */}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity onPress={() => setWeekdays(!weekdays)} activeOpacity={0.7}>
          <View style={[styles.checkboxItem, weekdays && styles.checkboxItemActive, weekdays && { borderColor: '#4CAF50' }]}>
            <View style={styles.checkboxIconContainer}>
              <Ionicons name={weekdays ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={weekdays ? '#4CAF50' : theme.textSecondary} />
            </View>
            <Text style={[styles.checkboxText, weekdays && styles.checkboxTextActive]}>Weekdays</Text>
            <Text style={[styles.checkboxSubtext, weekdays && styles.checkboxTextActive]}>Mon - Fri</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekends(!weekends)} activeOpacity={0.7}>
          <View style={[styles.checkboxItem, weekends && styles.checkboxItemActive, weekends && { borderColor: '#FF6B6B' }]}>
            <View style={styles.checkboxIconContainer}>
              <Ionicons name={weekends ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={weekends ? '#FF6B6B' : theme.textSecondary} />
            </View>
            <Text style={[styles.checkboxText, weekends && styles.checkboxTextActive]}>Weekends</Text>
            <Text style={[styles.checkboxSubtext, weekends && styles.checkboxTextActive]}>Sat - Sun</Text>
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
  label: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginVertical: 10, 
    color: theme.text,
    letterSpacing: 0.3,
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 20, 
    borderColor: theme.border, 
    backgroundColor: theme.inputBackground, 
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  iconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: theme.cardBackground,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  iconCircleSelected: {
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ scale: 1.08 }],
  },
  iconLabel: { 
    fontSize: 7, 
    textAlign: 'center', 
    marginTop: 5, 
    color: theme.text,
    fontWeight: '500',
  },
  iconLabelSelected: {
    color: theme.text,
    fontWeight: '500',
  },
  checkboxContainer: { 
    marginVertical: 20,
    gap: 12,
  },
  checkboxItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: theme.cardBackground,
    borderWidth: 2,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  checkboxItemActive: {
    borderWidth: 2,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  checkboxIconContainer: {
    marginRight: 12,
  },
  checkboxText: { 
    fontSize: 17, 
    color: theme.text,
    fontWeight: '700',
    flex: 1,
  },
  checkboxTextActive: {
    color: theme.text,
  },
  checkboxSubtext: {
    fontSize: 15,
    color: theme.text,
    fontWeight: '600',
    opacity: 0.7,
  },
  saveButton: { 
    backgroundColor: theme.primaryButton, 
    padding: 16, 
    borderRadius: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: { 
    color: theme.primaryButtonText, 
    textAlign: 'center', 
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  deleteButton: { 
    backgroundColor: theme.error, 
    padding: 16, 
    borderRadius: 12, 
    marginTop: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteButtonText: { 
    color: 'white', 
    textAlign: 'center', 
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
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