import React, { useState, useEffect } from 'react';
import ColorPickerModal from './ColorPickerModal';
import { View, Text, Button, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { goals as presetGoals } from './goals'; // Assuming you have a goals.js file with default preset goals

const GoalSettingsScreen = () => {
  const [selectedDimension, setSelectedDimension] = useState('Physical');
  const [customGoalText, setCustomGoalText] = useState('');
  const [customGoals, setCustomGoals] = useState({});
  const [localPresetGoals, setLocalPresetGoals] = useState(JSON.parse(JSON.stringify(presetGoals)));
  const [expandedDimension, setExpandedDimension] = useState(null);
  const [triggerRender, setTriggerRender] = useState(false);
  const [quantifiable, setQuantifiable] = useState(false);
  const [targetCount, setTargetCount] = useState(1);
  const [hasNotepad, setHasNotepad] = useState(false); // Track if the goal has a notepad
  const [dimensionColors, setDimensionColors] = useState({});
const [colorPickerVisible, setColorPickerVisible] = useState(false);
const [currentColorDimension, setCurrentColorDimension] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadCustomGoals();
    }, [triggerRender])
  );
  const defaultColors = {
    Physical: '#FFA07A',
    Mental: '#87CEFA',
    Environmental: '#98FB98',
    Financial: '#FFD700',
    Intellectual: '#BA55D3',
    Occupational: '#20B2AA',
    Social: '#FF6347',
    Spiritual: '#EE82EE',
  };
  
  // ✅ Initialize default + current color arrays in AsyncStorage
  useEffect(() => {
    initializeColorStorage();
  }, []);
  
  // 🏃‍♂️ Initialize AsyncStorage with separate default and mutable arrays
  const initializeColorStorage = async () => {
    const defaultsKey = 'defaultDimensionColors';
    const currentKey = 'dimensionColors';
  
    try {
      const storedDefaults = await AsyncStorage.getItem(defaultsKey);
      const storedCurrent = await AsyncStorage.getItem(currentKey);
  
      // 🌈 Save default colors if missing (permanent constants)
      if (!storedDefaults) {
        await AsyncStorage.setItem(defaultsKey, JSON.stringify(defaultColors));
      }
  
      // 🎨 If current colors missing, copy defaults to current
      if (!storedCurrent) {
        await AsyncStorage.setItem(currentKey, JSON.stringify(defaultColors));
        setDimensionColors(defaultColors);
      } else {
        setDimensionColors(JSON.parse(storedCurrent));
      }
    } catch (error) {
      console.error('Error initializing color storage:', error);
    }
  };
  
  // 💾 Save currently selected colors to AsyncStorage
  const saveDimensionColors = async (updatedColors) => {
    setDimensionColors(updatedColors);
    await AsyncStorage.setItem('dimensionColors', JSON.stringify(updatedColors));
  };
  
  // 🎯 Handle individual dimension color selection
  const handleColorSelect = async (color) => {
    const updatedColors = { ...dimensionColors, [currentColorDimension]: color };
    await saveDimensionColors(updatedColors);
  };
  
  // ♻️ Reset color for a specific dimension (pull from default array)
  const resetColorForDimension = async (dimension) => {
    try {
      const defaults = JSON.parse(await AsyncStorage.getItem('defaultDimensionColors'));
      const updatedColors = { ...dimensionColors, [dimension]: defaults[dimension] };
      await saveDimensionColors(updatedColors);
    } catch (error) {
      console.error('Error resetting dimension color:', error);
    }
  };
  
  // 🔄 Reset all dimension colors back to defaults
  const resetAllColors = async () => {
    try {
      const defaults = JSON.parse(await AsyncStorage.getItem('defaultDimensionColors'));
      await saveDimensionColors(defaults);
    } catch (error) {
      console.error('Error resetting all colors:', error);
    }
  };

  const loadCustomGoals = async () => {
    const storedCustomGoals = await AsyncStorage.getItem('customGoals');
    if (storedCustomGoals) {
      setCustomGoals(JSON.parse(storedCustomGoals));
    }
    const storedPresetGoals = await AsyncStorage.getItem('presetGoals');
    if (storedPresetGoals) {
      setLocalPresetGoals(JSON.parse(storedPresetGoals));
    }
  };

  const toggleDimensionExpansion = (dimension) => {
    setExpandedDimension(prev => (prev === dimension ? null : dimension));
  };

  const addCustomGoal = async () => {
    if (customGoalText.trim() === '') {
      Alert.alert('Error', 'Please enter a valid goal.');
      return;
    }

    const isDuplicate = Object.keys(localPresetGoals).some(dim =>
      localPresetGoals[dim].some(goal => goal.name.toLowerCase() === customGoalText.toLowerCase())
    ) || Object.keys(customGoals).some(dim =>
      customGoals[dim]?.some(goal => goal.name.toLowerCase() === customGoalText.toLowerCase())
    );

    if (isDuplicate) {
      Alert.alert('Duplicate Goal', `${customGoalText} already exists in another dimension!`);
      return;
    }

    const newGoal = {
      id: `custom-${Date.now()}`,
      name: customGoalText,
      quantifiable: quantifiable,
      target: quantifiable ? targetCount : null,
      hasNotepad: hasNotepad, // Set the notepad value
    };

    setExpandedDimension(null);

    const updatedCustomGoals = {
      ...customGoals,
      [selectedDimension]: [...(customGoals[selectedDimension] || []), newGoal],
    };

    setCustomGoals(updatedCustomGoals);
    setCustomGoalText('');
    setQuantifiable(false); // Reset quantifiable checkbox
    setTargetCount(1); // Reset target count
    setHasNotepad(false); // Reset notepad checkbox

    await AsyncStorage.setItem('customGoals', JSON.stringify(updatedCustomGoals));

    setLocalPresetGoals(prev => ({
      ...prev,
      [selectedDimension]: [...prev[selectedDimension], newGoal],
    }));

    setTriggerRender(!triggerRender);
    Alert.alert('Success', 'Custom goal added successfully!');
  };

  const resetGoalsForDimension = async (dimension) => {
    const updatedCustomGoals = { ...customGoals };
    delete updatedCustomGoals[dimension];

    setCustomGoals(updatedCustomGoals);
    setLocalPresetGoals(prev => ({
      ...prev,
      [dimension]: JSON.parse(JSON.stringify(presetGoals[dimension]))
    }));

    await AsyncStorage.setItem('customGoals', JSON.stringify(updatedCustomGoals));
    await AsyncStorage.setItem('presetGoals', JSON.stringify({ ...localPresetGoals, [dimension]: presetGoals[dimension] }));
    setTriggerRender(!triggerRender);
    Alert.alert('Reset', `${dimension} goals have been reset.`);
  };

  const resetAllGoals = async () => {
    setCustomGoals({});
    setLocalPresetGoals(JSON.parse(JSON.stringify(presetGoals)));

    await AsyncStorage.removeItem('customGoals');
    await AsyncStorage.setItem('presetGoals', JSON.stringify(presetGoals));

    const allKeys = await AsyncStorage.getAllKeys();
    const scheduledDays = allKeys.filter(key => key.includes('-')); // Assuming dates are stored with "-" format

    for (let day of scheduledDays) {
      const scheduledGoals = await AsyncStorage.getItem(day);
      const parsedGoals = scheduledGoals ? JSON.parse(scheduledGoals) : [];

      const updatedGoals = parsedGoals.filter(goal => {
        const isCustomGoal = Object.keys(customGoals).some(dim => customGoals[dim]?.some(g => g.id === goal.id));
        return !isCustomGoal;
      });

      if (updatedGoals.length !== parsedGoals.length) {
        await AsyncStorage.setItem(day, JSON.stringify(updatedGoals));
      }
    }

    setTriggerRender(!triggerRender);
    Alert.alert('Reset', 'All custom goals have been reset and their scheduled instances removed.');
  };

  const getGoalsForDimension = (dimension) => {
    const customGoalsForDimension = customGoals[dimension] || [];
    return [...localPresetGoals[dimension], ...customGoalsForDimension];
  };

  const removeGoalFromScheduledDays = async (goalId) => {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const scheduledDays = allKeys.filter(key => key.match(/^\d{4}-\d{2}-\d{2}$/)); // ✅ Only select date-based storage keys

        for (const day of scheduledDays) {
            const storedGoals = await AsyncStorage.getItem(day);
            if (storedGoals) {
                let parsedGoals = JSON.parse(storedGoals);
                const updatedGoals = parsedGoals.filter(goal => goal.id !== goalId); // ✅ Remove the deleted goal

                if (updatedGoals.length !== parsedGoals.length) {
                    await AsyncStorage.setItem(day, JSON.stringify(updatedGoals));
                }
            }
        }
    } catch (error) {
        console.error("Error removing goal from scheduled instances:", error);
    }
};

  const removeGoal = async (dimension, goalId, isCustomGoal) => {
    const currentGoals = getGoalsForDimension(dimension);

    if (currentGoals.length === 1) {
        Alert.alert('Cannot Delete', `At least one goal must remain in the ${dimension} dimension.`);
        return;
    }

    // ✅ Remove the goal from storage
    if (isCustomGoal) {
        const updatedCustomGoals = {
            ...customGoals,
            [dimension]: customGoals[dimension].filter(goal => goal.id !== goalId),
        };
        setCustomGoals(updatedCustomGoals);
        await AsyncStorage.setItem('customGoals', JSON.stringify(updatedCustomGoals));
    } else {
        const updatedPresetGoals = localPresetGoals[dimension].filter(goal => goal.id !== goalId);
        setLocalPresetGoals(prev => ({
            ...prev,
            [dimension]: updatedPresetGoals
        }));
        await AsyncStorage.setItem('presetGoals', JSON.stringify({ ...localPresetGoals, [dimension]: updatedPresetGoals }));
    }

    // ✅ Remove all scheduled instances of the deleted goal
    await removeGoalFromScheduledDays(goalId);

    // ✅ Refresh UI
    setTriggerRender(!triggerRender);
};

  const renderGoalItem = (goal, dimension) => (
    <View key={goal.id} style={styles.goalItem}>
      <Text>{goal.name}</Text>
      <TouchableOpacity onPress={() => removeGoal(dimension, goal.id, !!goal.id.startsWith('custom-'))}>
        <Ionicons name="trash" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.label}>Select Dimension</Text>
        <Picker
          selectedValue={selectedDimension}
          onValueChange={(dimension) => setSelectedDimension(dimension)}
          style={styles.picker}
        >
          {Object.keys(presetGoals).map((dim) => (
            <Picker.Item key={dim} label={dim} value={dim} />
          ))}
        </Picker>

        <Text style={styles.label}>Enter Custom Goal</Text>
        <TextInput
          value={customGoalText}
          onChangeText={setCustomGoalText}
          placeholder="Custom goal"
          style={styles.input}
        />

        {/* Quantifiable Goal Toggle */}
        <View style={styles.quantifiableToggleContainer}>
          <Text>Add Counter</Text>
          <TouchableOpacity onPress={() => setQuantifiable(!quantifiable)}>
            <Ionicons name={quantifiable ? 'checkbox' : 'square-outline'} size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {quantifiable && (
          <View style={styles.targetInputContainer}>
            <Text>Set Target Count:</Text>
            <TextInput
              value={targetCount.toString()}
              onChangeText={(value) => {
                if (value === '') {
                  setTargetCount('');
                } else {
                  const parsedValue = parseInt(value);
                  if (!isNaN(parsedValue)) {
                    setTargetCount(parsedValue);
                  }
                }
              }}
              keyboardType="numeric"
              style={styles.targetInput}
            />
          </View>
        )}

        {/* Notepad Toggle */}
        <View style={styles.quantifiableToggleContainer}>
          <Text>Add Notepad</Text>
          <TouchableOpacity onPress={() => setHasNotepad(!hasNotepad)}>
            <Ionicons name={hasNotepad ? 'checkbox' : 'square-outline'} size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addCustomGoal}>
          <Ionicons name="add-circle" size={40} color="#00BFFF" />
          <Text style={styles.addButtonText}>Add Custom Goal</Text>
        </TouchableOpacity>

        {Object.keys(presetGoals).map((dimension) => (
          <View key={dimension}>
            <TouchableOpacity 
  onPress={() => toggleDimensionExpansion(dimension)} 
  style={[
    styles.dimensionHeader, 
    { backgroundColor: dimensionColors[dimension] || '#ccc' }
  ]}
>
  <Text style={styles.dimensionTitle}>{dimension} Goals</Text>
  <Ionicons
    name={expandedDimension === dimension ? 'chevron-up' : 'chevron-down'}
    size={24}
    color="#fff" // ✅ White for contrast
  />
</TouchableOpacity>

            {expandedDimension === dimension && (
              <View>
                <TouchableOpacity
  style={[styles.selectColorButton, { backgroundColor: dimensionColors[dimension] || '#ccc' }]}
  onPress={() => {
    setCurrentColorDimension(dimension);
    setColorPickerVisible(true);
  }}
>
  <Ionicons name="color-palette" size={24} color="#fff" />
  <Text style={styles.selectColorText}>Select Color</Text>
</TouchableOpacity>

                <Button title={`Reset ${dimension} Goals`} onPress={() => resetGoalsForDimension(dimension)} />
                {getGoalsForDimension(dimension).map((goal) => renderGoalItem(goal, dimension))}
              </View>
            )}
          </View>
        ))}
<Button title="Reset All Colors to Default" onPress={resetAllColors} />
        <Button title="Reset All Dimensions" onPress={resetAllGoals} />
        <ColorPickerModal
  visible={colorPickerVisible}
  onClose={() => setColorPickerVisible(false)} 
  onColorSelected={handleColorSelect}
  dimensionKey={currentColorDimension}
/>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 60,
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 18,
    marginBottom: 0,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 200,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
    width: '100%',
  },
  quantifiableToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  targetInputContainer: {
    marginBottom: 20,
  },
  targetInput: {
    borderWidth: 1,
    padding: 10,
    width: '100%',
    marginTop: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 60,
  },
  addButtonText: {
    fontSize: 20,
    marginLeft: 30,
    color: '#00BFFF',
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15, // ✅ Makes it rounded
    marginBottom: 10,
    shadowColor: '#000', // ✅ Adds a subtle shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  dimensionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 45,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  selectColorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#00BFFF',
    borderRadius: 10,
    marginBottom: 15,
  },
  selectColorText: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 10,
  },
});

export default GoalSettingsScreen;
