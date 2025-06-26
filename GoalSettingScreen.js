import React, { useState, useEffect, useRef } from 'react';
import ColorPickerModal from './ColorPickerModal';
import { View, Text, Button, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Modal, Dimensions, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { goals as presetGoals } from './goals'; // Assuming you have a goals.js file with default preset goals
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle } from 'react-native-svg';

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
  const [showAddGoalForDimension, setShowAddGoalForDimension] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planGoal, setPlanGoal] = useState(null);
  const [planDimension, setPlanDimension] = useState(null);
  const [planStartDate, setPlanStartDate] = useState(new Date());
  const [planRecurrence, setPlanRecurrence] = useState('none');
  const [planEndDate, setPlanEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(null);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const checkmarkAnim = useRef(new Animated.Value(0));
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(Dimensions.get('window').height);
  const [showPlusAnim, setShowPlusAnim] = useState(false);
  const plusAnim = useRef(new Animated.Value(0));
  const [plusAnimColor, setPlusAnimColor] = useState('#00BFFF');

  const recurrenceOptions = [
    { label: 'None', value: 'none' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const route = useRoute();
  const navigation = useNavigation();
  const scrollViewRef = useRef();
  const goalRefs = useRef({});
  const goalPositions = useRef({});

  useEffect(() => {
    if (route.params && route.params.date) {
      const newDate = new Date(route.params.date);
      if (!planStartDate || planStartDate.toDateString() !== newDate.toDateString()) {
        setPlanStartDate(newDate);
      }
    }
  }, [route.params]);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params && route.params.date) {
        const newDate = new Date(route.params.date);
        if (!planStartDate || planStartDate.toDateString() !== newDate.toDateString()) {
          setPlanStartDate(newDate);
        }
      }
      loadCustomGoals();
    }, [route.params, triggerRender])
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
    const dimension = showAddGoalModal;
    if (customGoalText.trim() === '') {
      Alert.alert('Error', 'Please enter a valid goal.');
      return;
    }
    // Prevent duplicate custom goal names (case-insensitive) in the correct dimension
    const allGoals = [...(localPresetGoals[dimension] || []), ...(customGoals[dimension] || [])];
    const isDuplicate = allGoals.some(goal => goal.name.trim().toLowerCase() === customGoalText.trim().toLowerCase());
    if (isDuplicate) {
      Alert.alert('Duplicate Goal', 'A goal with this name already exists in this dimension.');
      return;
    }
    // Use a more robust unique ID
    const newGoal = {
      id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      name: customGoalText,
      quantifiable: quantifiable,
      target: quantifiable ? targetCount : null,
      hasNotepad: true, // Always true
    };
    const updatedCustomGoals = {
      ...customGoals,
      [dimension]: [...(customGoals[dimension] || []), newGoal],
    };
    setCustomGoals(updatedCustomGoals);
    await AsyncStorage.setItem('customGoals', JSON.stringify(updatedCustomGoals));
    setCustomGoalText('');
    setQuantifiable(false);
    setTargetCount(1);
    setShowAddGoalModal(null);
    setExpandedDimension(dimension); // Expand the correct dimension
    setPlusAnimColor(dimensionColors[dimension] || '#00BFFF');
    setShowPlusAnim(true);
    plusAnim.current.setValue(0);
    Animated.timing(plusAnim.current, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => setShowPlusAnim(false), 600);
    });
    setTriggerRender(!triggerRender);
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
    // Remove all custom goals from state
    setCustomGoals({});
    setLocalPresetGoals(JSON.parse(JSON.stringify(presetGoals)));
    await AsyncStorage.removeItem('customGoals');
    await AsyncStorage.setItem('presetGoals', JSON.stringify(presetGoals));
    // Remove all scheduled instances of any custom goal (id starts with 'custom-')
    const allKeys = await AsyncStorage.getAllKeys();
    const dateKeys = allKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    for (const key of dateKeys) {
      const storedGoals = await AsyncStorage.getItem(key);
      if (storedGoals) {
        let parsedGoals = JSON.parse(storedGoals);
        const updatedGoals = parsedGoals.filter(goal => !(goal.id && goal.id.startsWith('custom-')));
        if (updatedGoals.length !== parsedGoals.length) {
          await AsyncStorage.setItem(key, JSON.stringify(updatedGoals));
        }
      }
    }
    setTriggerRender(!triggerRender);
    Alert.alert('Reset', 'All custom goals have been reset and their scheduled instances removed.');
  };

  const getGoalsForDimension = (dimension) => {
    const customGoalsForDimension = customGoals[dimension] || [];
    const presetGoalsForDimension = localPresetGoals[dimension] || [];
    return [...presetGoalsForDimension, ...customGoalsForDimension];
  };

  const removeGoalFromScheduledDays = async (goalId) => {
    const allKeys = await AsyncStorage.getAllKeys();
    const dateKeys = allKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    for (const key of dateKeys) {
      const storedGoals = await AsyncStorage.getItem(key);
      if (storedGoals) {
        let parsedGoals = JSON.parse(storedGoals);
        const updatedGoals = parsedGoals.filter(goal => goal.id !== goalId);
        if (updatedGoals.length !== parsedGoals.length) {
          await AsyncStorage.setItem(key, JSON.stringify(updatedGoals));
        }
      }
    }
  };

  const removeGoal = async (dimension, goalId, isCustomGoal) => {
    const currentGoals = getGoalsForDimension(dimension);
    if (currentGoals.length === 1) {
      Alert.alert('Cannot Delete', `At least one goal must remain in the ${dimension} dimension.`);
      return;
    }
    // Remove the goal from storage
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
    // Remove all scheduled instances of the deleted goal
    await removeGoalFromScheduledDays(goalId);
    setTriggerRender(!triggerRender);
  };

  const renderGoalItem = (goal, dimension) => (
    <View
      key={goal.id}
      onLayout={e => { goalPositions.current[goal.id] = e.nativeEvent.layout.y; }}
      style={{ borderRadius: 24, marginBottom: 14, backgroundColor: '#fff', padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', width: '100%' }}
    >
      <Text style={{ fontSize: 18, marginBottom: 12 }}>{goal.name}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <TouchableOpacity
          style={{ backgroundColor: dimensionColors[dimension] || '#00BFFF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 32, shadowColor: '#00BFFF', shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 }}
          onPress={() => {
            let selectedDate;
            if (route.params && route.params.date) {
              const [year, month, day] = route.params.date.split('-').map(Number);
              selectedDate = new Date(year, month - 1, day);
            } else {
              selectedDate = new Date();
            }
            setShowPlanModal(true);
            setPlanGoal(goal);
            setPlanDimension(dimension);
            setPlanStartDate(selectedDate);
            setPlanRecurrence('none');
            setPlanEndDate(selectedDate);
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeGoal(dimension, goal.id, !!goal.id.startsWith('custom-'))}>
          <Ionicons name="trash" size={26} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // DEV UTILITY: Add hasNotepad: true to all scheduled goals in AsyncStorage
  const addNotepadToAllScheduledGoals = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const dateKeys = allKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
      let updatedCount = 0;
      for (const key of dateKeys) {
        const storedGoals = await AsyncStorage.getItem(key);
        if (storedGoals) {
          let parsedGoals = JSON.parse(storedGoals);
          let changed = false;
          parsedGoals = parsedGoals.map(goal => {
            if (!goal.hasNotepad) {
              changed = true;
              return { ...goal, hasNotepad: true };
            }
            return goal;
          });
          if (changed) {
            await AsyncStorage.setItem(key, JSON.stringify(parsedGoals));
            updatedCount++;
          }
        }
      }
      Alert.alert('Migration Complete', `Updated ${updatedCount} days of scheduled goals.`);
    } catch (error) {
      Alert.alert('Migration Error', error.message);
    }
  };

  const onDateChange = (event, date) => {
    if (date) {
      setPlanStartDate(date);
    }
  };

  const confirmPlanGoal = () => {
    planGoalForDates();
    setShowPlanModal(false);
  };

  const planGoalForDates = async () => {
    // Normalize start and end dates to midnight
    let current = new Date(planStartDate);
    let end = new Date(planEndDate);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Validation
    if (end < current) {
      Alert.alert('Invalid Dates', 'End date cannot be before start date.');
      return;
    }
    if (current < today) {
      Alert.alert('Invalid Dates', 'Start date cannot be before today.');
      return;
    }
    // Generate all dates for the recurrence
    let dates = [];
    if (planRecurrence === 'none') {
      dates = [current.toISOString().split('T')[0]];
    } else {
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        if (planRecurrence === 'daily') {
          current.setDate(current.getDate() + 1);
        } else if (planRecurrence === 'weekly') {
          current.setDate(current.getDate() + 7);
        } else if (planRecurrence === 'monthly') {
          current.setMonth(current.getMonth() + 1);
        }
      }
    }
    // Prevent duplicate scheduling
    for (const date of dates) {
      const storedGoals = await AsyncStorage.getItem(date);
      let parsedGoals = storedGoals ? JSON.parse(storedGoals) : [];
      if (parsedGoals.some(g => g.id === planGoal.id)) {
        Alert.alert('Already Scheduled', 'This goal is already scheduled for that day.');
        setShowPlanModal(false);
        return;
      }
    }
    // For each date, add the goal to AsyncStorage for that date
    for (const date of dates) {
      const storedGoals = await AsyncStorage.getItem(date);
      let parsedGoals = storedGoals ? JSON.parse(storedGoals) : [];
      if (!parsedGoals.some(g => g.id === planGoal.id)) {
        parsedGoals.push({ ...planGoal, dimension: planDimension, completed: false });
        await AsyncStorage.setItem(date, JSON.stringify(parsedGoals));
      }
    }
    setShowPlanModal(false);
    setShowCheckmark(true);
    checkmarkAnim.current.setValue(0);
    Animated.timing(checkmarkAnim.current, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => setShowCheckmark(false), 1200);
    });
  };

  useEffect(() => {
    const migratePlannedGoals = async () => {
      const allKeys = await AsyncStorage.getAllKeys();
      const dateKeys = allKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
      for (const key of dateKeys) {
        const storedGoals = await AsyncStorage.getItem(key);
        if (storedGoals) {
          let parsedGoals = JSON.parse(storedGoals);
          let changed = false;
          let newGoals = [...parsedGoals];
          for (const goal of parsedGoals) {
            // If the goal has recurrence info (legacy), migrate it
            if (goal.recurrence && goal.recurrence !== 'none' && goal.recurrenceEndDate) {
              let current = new Date(key);
              let end = new Date(goal.recurrenceEndDate);
              let recurrence = goal.recurrence;
              let dates = [];
              while (current <= end) {
                dates.push(current.toISOString().split('T')[0]);
                if (recurrence === 'daily') {
                  current.setDate(current.getDate() + 1);
                } else if (recurrence === 'weekly') {
                  current.setDate(current.getDate() + 7);
                } else if (recurrence === 'monthly') {
                  current.setMonth(current.getMonth() + 1);
                } else {
                  break;
                }
              }
              for (const date of dates) {
                if (date !== key) {
                  const otherDayGoals = await AsyncStorage.getItem(date);
                  let parsedOther = otherDayGoals ? JSON.parse(otherDayGoals) : [];
                  if (!parsedOther.some(g => g.id === goal.id)) {
                    parsedOther.push({ ...goal, recurrence: undefined, recurrenceEndDate: undefined });
                    await AsyncStorage.setItem(date, JSON.stringify(parsedOther));
                  }
                }
              }
              // Remove recurrence info from the original goal
              newGoals = newGoals.map(g => g.id === goal.id ? { ...g, recurrence: undefined, recurrenceEndDate: undefined } : g);
              changed = true;
            }
          }
          if (changed) {
            await AsyncStorage.setItem(key, JSON.stringify(newGoals));
          }
        }
      }
    };
    migratePlannedGoals();
  }, []);

  // Helper for Animated SVG
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      ref={scrollViewRef}
      onScroll={e => setScrollY(e.nativeEvent.contentOffset.y)}
      onLayout={e => setViewportHeight(e.nativeEvent.layout.height)}
      scrollEventThrottle={16}
    >
      <View style={[styles.container, { width: '100%', paddingHorizontal: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'center', width: '100%', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', left: 0, padding: 8, zIndex: 2 }}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>Your Goals</Text>
        </View>
        {Object.keys(presetGoals).map((dimension) => (
          <View key={dimension}>
            <TouchableOpacity 
              onPress={() => toggleDimensionExpansion(dimension)} 
              style={[
                styles.dimensionHeader, 
                { backgroundColor: dimensionColors[dimension] || '#ccc', width: '100%', marginBottom: 8 }
              ]}
            >
              <Text style={styles.dimensionTitle}>{dimension} Goals</Text>
              <Ionicons
                name={expandedDimension === dimension ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>

            {expandedDimension === dimension && (
              <View style={{ padding: 16, backgroundColor: '#f8f8f8', borderRadius: 16, marginBottom: 24, width: '100%', alignSelf: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {/* Button Row: Add Custom Goal, Select Color, Reset Goals */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <TouchableOpacity
                    style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: dimensionColors[dimension] || '#00BFFF', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                    onPress={() => setShowAddGoalModal(dimension)}
                  >
                    <Ionicons name="add" size={24} color={dimensionColors[dimension] || '#00BFFF'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dimensionColors[dimension] || '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                    onPress={() => {
                      setCurrentColorDimension(dimension);
                      setColorPickerVisible(true);
                    }}
                  >
                    <Ionicons name="color-palette" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#e74c3c', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => resetGoalsForDimension(dimension)}
                  >
                    <Ionicons name="refresh" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
                {/* Goals List */}
                {getGoalsForDimension(dimension).map((goal) => (
                  renderGoalItem(goal, dimension)
                ))}
                {showAddGoalModal === dimension && (
                  <Modal
                    visible={true}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowAddGoalModal(null)}
                  >
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
                      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, width: 340, maxWidth: '95%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18 }}>Add Custom Goal</Text>
                        <TextInput
                          value={customGoalText}
                          onChangeText={setCustomGoalText}
                          placeholder="Custom goal name"
                          placeholderTextColor="#888"
                          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 12, backgroundColor: '#fff', width: '100%' }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <Text style={{ fontSize: 16 }}>Quantifiable</Text>
                          <TouchableOpacity onPress={() => setQuantifiable(!quantifiable)} style={{ marginLeft: 10 }}>
                            <Ionicons name={quantifiable ? 'checkbox' : 'square-outline'} size={24} color="#00BFFF" />
                          </TouchableOpacity>
                        </View>
                        {quantifiable && (
                          <View style={{ marginBottom: 12, width: '100%' }}>
                            <Text style={{ fontSize: 16 }}>Set Target Count:</Text>
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
                              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff' }}
                            />
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
                          <TouchableOpacity onPress={() => setShowAddGoalModal(null)} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#eee', marginRight: 10 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#888' }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={addCustomGoal} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#00BFFF' }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#fff' }}>Add</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                )}
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
        {/* Planning Modal */}
        {showPlanModal && (
          <Modal
            visible={showPlanModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPlanModal(false)}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, width: 340, maxWidth: '95%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18 }}>Plan Goal</Text>
                <Text style={{ fontSize: 16, marginBottom: 10 }}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 18, width: '100%', alignItems: 'center', backgroundColor: '#f8f8f8' }}>
                  <Text style={{ fontSize: 16 }}>{planStartDate ? planStartDate.toLocaleDateString() : 'Pick a date'}</Text>
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={planStartDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    style={{ marginBottom: 18 }}
                  />
                )}
                <Text style={{ fontSize: 16, marginBottom: 10 }}>Recurrence</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
                  {recurrenceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setPlanRecurrence(option.value)}
                      style={{
                        backgroundColor: planRecurrence === option.value ? '#00BFFF' : '#f0f4f8',
                        borderRadius: 18,
                        paddingVertical: 8,
                        paddingHorizontal: 18,
                        marginHorizontal: 6,
                        marginVertical: 4,
                        borderWidth: planRecurrence === option.value ? 0 : 1,
                        borderColor: '#ccc',
                        shadowColor: planRecurrence === option.value ? '#00BFFF' : 'transparent',
                        shadowOpacity: planRecurrence === option.value ? 0.12 : 0,
                        shadowRadius: 4,
                        elevation: planRecurrence === option.value ? 2 : 0,
                      }}
                    >
                      <Text style={{ color: planRecurrence === option.value ? '#fff' : '#333', fontWeight: 'bold', fontSize: 15 }}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {planRecurrence !== 'none' && (
                  <>
                    <Text style={{ fontSize: 16, marginBottom: 10 }}>End Date</Text>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 18, width: '100%', alignItems: 'center', backgroundColor: '#f8f8f8' }}>
                      <Text style={{ fontSize: 16 }}>{planEndDate ? planEndDate.toLocaleDateString() : 'Pick an end date'}</Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={planEndDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          setShowEndDatePicker(false);
                          if (date) setPlanEndDate(date);
                        }}
                        style={{ marginBottom: 18 }}
                      />
                    )}
                  </>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
                  <TouchableOpacity onPress={() => setShowPlanModal(false)} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#eee', marginRight: 10 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#888' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmPlanGoal} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#00BFFF' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#fff' }}>Plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
        {showPlusAnim && (() => {
          const size = 90;
          const scale = plusAnim.current.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0.7, 1.1, 1, 0.7] });
          const opacity = plusAnim.current.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
          return (
            <View style={{ position: 'absolute', top: scrollY + viewportHeight / 2 - size / 2, left: 0, right: 0, alignItems: 'center', zIndex: 100 }}>
              <Animated.View style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: plusAnimColor,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
                transform: [{ scale }],
                opacity,
              }}>
                <Ionicons name="add" size={44} color="#fff" />
              </Animated.View>
            </View>
          );
        })()}
        {showCheckmark && (() => {
          const size = 90;
          const strokeWidth = 8;
          const radius = (size - strokeWidth) / 2;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = checkmarkAnim.current.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
          const checkOpacity = checkmarkAnim.current.interpolate({ inputRange: [0.8, 1], outputRange: [0, 1] });
          return (
            <View style={{ position: 'absolute', top: scrollY + viewportHeight / 2 - size / 2, left: 0, right: 0, alignItems: 'center', zIndex: 100 }}>
              <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#4BB543', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 }}>
                <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#fff"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={0}
                    opacity={0.15}
                  />
                  <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#fff"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </Svg>
                <Animated.View style={{ opacity: checkOpacity, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark" size={44} color="#fff" />
                </Animated.View>
              </View>
            </View>
          );
        })()}
        {/* {__DEV__ && (
          <TouchableOpacity
            style={{ marginTop: 32, marginBottom: 32, alignSelf: 'center', backgroundColor: '#e74c3c', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16 }}
            onPress={async () => {
              await removeAllScheduledCustomGoals();
              Alert.alert('Done', 'All scheduled custom goal instances have been removed.');
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Remove All Scheduled Custom Goals (DEV)</Text>
          </TouchableOpacity>
        )} */}
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
  planButton: {
    padding: 10,
    borderWidth: 2,
    borderColor: '#00BFFF',
    borderRadius: 10,
  },
  planButtonText: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 10,
  },
  addAnotherGoalButton: {
    padding: 10,
    borderWidth: 2,
    borderColor: '#00BFFF',
    borderRadius: 10,
    marginBottom: 10,
  },
  addAnotherGoalText: {
    fontSize: 18,
    color: '#00BFFF',
  },
  addGoalInputContainer: {
    marginBottom: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planModalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 18,
    marginBottom: 10,
  },
  datePickerButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderRadius: 5,
  },
  datePickerText: {
    fontSize: 18,
  },
  recurrenceOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  recurrenceOption: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderRadius: 5,
  },
  recurrenceOptionSelected: {
    backgroundColor: '#00BFFF',
  },
  recurrenceOptionText: {
    fontSize: 18,
  },
  recurrenceOptionTextSelected: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderRadius: 5,
  },
  submitButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderRadius: 5,
  },
  cancelButtonText: {
    fontSize: 18,
    color: '#00BFFF',
  },
  submitButtonText: {
    fontSize: 18,
    color: '#fff',
  },
});

export default GoalSettingsScreen;
