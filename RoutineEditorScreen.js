import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ColorPickerModal from './ColorPickerModal'; // ✅ Using correct component

const emojiList = ['🌞', '🌜', '🏫', '💪', '📚', '🏃', '🎨', '🎵', '🌿', '🔥', '🌊', '🧘', '🌟'];

const RoutineEditorScreen = ({ navigation, route }) => {
  const editingRoutine = route.params?.routine || null;
  const [name, setName] = useState(editingRoutine?.name || '');
  const [color, setColor] = useState(editingRoutine?.color || '#FFB6C1');
  const [emoji, setEmoji] = useState(editingRoutine?.emoji || '🌞');
  const [weekdays, setWeekdays] = useState(editingRoutine?.weekdays ?? true);
  const [weekends, setWeekends] = useState(editingRoutine?.weekends ?? false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  // 💾 Save and load routines
  const saveRoutine = async () => {
    if (!name.trim()) return Alert.alert('Routine name is required');
    const routines = JSON.parse(await AsyncStorage.getItem('routines')) || [];
    const newRoutine = {
      id: editingRoutine?.id || `${Date.now()}`,
      name,
      color,
      emoji,
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
  style={styles.backButton}
  onPress={() => navigation.goBack()} // ✅ Goes back without saving
>
  <Ionicons name="arrow-back" size={28} color="#000" />
  <Text style={styles.backButtonText}>Back</Text>
</TouchableOpacity>
      <Text style={styles.label}>Routine Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter routine name" />

      <Text style={styles.label}>Select Color</Text>
      <TouchableOpacity
        style={[styles.colorPreview, { backgroundColor: color }]}
        onPress={() => setColorPickerVisible(true)}
      >
        <Ionicons name="color-palette" size={30} color="#fff" />
        <Text style={styles.colorText}>Tap to select color</Text>
      </TouchableOpacity>

      {/* 🎨 ColorPickerModal with live preview */}
      <ColorPickerModal
        visible={colorPickerVisible}
        onClose={() => setColorPickerVisible(false)}
        onColorSelected={(selectedColor) => setColor(selectedColor)}
      />

      <Text style={styles.label}>Select Emoji</Text>
      <View style={styles.emojiContainer}>
        {emojiList.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setEmoji(item)}
            style={[
              styles.emojiCircle,
              emoji === item && { borderWidth: 2, borderColor: '#4CAF50' },
            ]}
          >
            <Text style={styles.emoji}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity onPress={() => setWeekdays(!weekdays)}>
          <Text style={styles.checkboxText}>{weekdays ? '☑️' : '⬜️'} Weekdays</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekends(!weekends)}>
          <Text style={styles.checkboxText}>{weekends ? '☑️' : '⬜️'} Weekends</Text>
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

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  label: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 15 },
  colorPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  colorText: { color: '#fff', marginLeft: 10, fontSize: 16, fontWeight: 'bold' },
  emojiContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emojiCircle: { padding: 10, borderRadius: 50 },
  emoji: { fontSize: 30 },
  checkboxContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  checkboxText: { fontSize: 18 },
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