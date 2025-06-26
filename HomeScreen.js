/**
 * HomeScreen - Main Dashboard Component
 * 
 * This is the primary dashboard screen of the U8 wellness tracking app. It serves
 * as the central hub where users can view their daily progress across all 8 wellness
 * dimensions and access key features of the app.
 * 
 * Key Features:
 * - Displays wellness dimensions as interactive circular cards
 * - Shows daily goal and habit counts for each dimension
 * - Provides quick access to goal planning
 * - Shows suggested goals that can be added to today's schedule
 * - Integrates habit tracking data with goal tracking
 * 
 * The screen automatically loads and displays:
 * - Today's scheduled goals and their completion status
 * - Daily habits and their counts by dimension
 * - Suggested goals from the preset goal library
 * - Color-coded dimension cards that grow based on activity level
 * 
 * Navigation:
 * - Tapping dimension cards navigates to detailed dimension view
 * - "Plan a Goal" button navigates to goal setting screen
 * - Suggested goals can be added directly to today's schedule
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getUniversalTime } from './dateUtils';
import { getColorForDimension } from './getColorForDimension';
import { goals as presetGoals } from './goals';

const HomeScreen = ({ navigation }) => {
  // State for managing daily goals and their completion status
  const [dailyGoals, setDailyGoals] = useState([]);
  
  // State for dimension data including counts and colors
  const [dimensionData, setDimensionData] = useState([]);
  const [dimensionColors, setDimensionColors] = useState({});
  
  // State for today's date and suggested goals
  const [todayDate, setTodayDate] = useState(getUniversalTime().fullDate);
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [addedGoals, setAddedGoals] = useState({});
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  
  // State for habit tracking integration
  const [habitCounts, setHabitCounts] = useState({});
  const [habitsByDimension, setHabitsByDimension] = useState({});

  /**
   * Loads today's habits from AsyncStorage and processes them by dimension
   * Counts habits per dimension and stores habit names for display
   * Calls loadGoals with the updated counts to refresh the display
   */
  const loadHabits = async () => {
    const today = getUniversalTime().fullDate;
    const storedHabits = await AsyncStorage.getItem('allHabits');
    const parsedHabits = storedHabits ? JSON.parse(storedHabits) : {};
    const todayHabits = parsedHabits[today]?.habits || [];
    
    // Count habits per dimension and store habit names
    const counts = {};
    const byDimension = {};
    todayHabits.forEach(habit => {
      if (habit.dimension) {
        counts[habit.dimension] = (counts[habit.dimension] || 0) + 1;
        if (!byDimension[habit.dimension]) byDimension[habit.dimension] = [];
        byDimension[habit.dimension].push(habit.name);
      }
    });
    setHabitCounts(counts);
    setHabitsByDimension(byDimension);
    
    // Call loadGoals with the new counts
    loadGoals(counts);
  };

  /**
   * Loads today's goals from AsyncStorage and combines them with habit data
   * Creates dimension data objects that include both goal and habit counts
   * This provides a unified view of all daily activities by dimension
   */
  const loadGoals = async (countsArg) => {
    const todayDate = getUniversalTime().fullDate;
    const goals = await AsyncStorage.getItem(todayDate);
    const parsedGoals = goals ? JSON.parse(goals) : [];
    setDailyGoals(parsedGoals);

    // Count goals per dimension
    const goalMap = {};
    parsedGoals.forEach(goal => {
      goalMap[goal.dimension] = (goalMap[goal.dimension] || 0) + 1;
    });

    // Merge with habit counts, and get union of all dimensions
    const habitCountsToUse = countsArg || habitCounts;
    const allDimensions = new Set([
      ...Object.keys(goalMap),
      ...Object.keys(habitCountsToUse)
    ]);
    const dimensions = Array.from(allDimensions).map(dimension => ({
      name: dimension,
      count: (goalMap[dimension] || 0) + (habitCountsToUse[dimension] || 0),
    }));

    setDimensionData(dimensions);
  };

  /**
   * Loads color schemes for each wellness dimension
   * Colors are used to visually distinguish different dimensions
   * and create a cohesive visual experience
   */
  const loadDimensionColors = async () => {
    try {
      const storedPresetGoals = await AsyncStorage.getItem('presetGoals');
      const presetGoalsParsed = storedPresetGoals ? JSON.parse(storedPresetGoals) : {};
  
      const allDimensions = Object.keys(presetGoalsParsed);
      const colors = {};
  
      for (const dimension of allDimensions) {
        colors[dimension] = await getColorForDimension(dimension);
      }
  
      setDimensionColors(colors);
    } catch (error) {
      console.error('Error loading dimension colors:', error);
    }
  };

  /**
   * Loads suggested goals that haven't been scheduled for today
   * Randomly selects up to 3 goals from the preset goal library
   * Provides users with quick options to add to their daily schedule
   */
  const loadSuggestedGoals = async () => {
    let allGoalsData = await AsyncStorage.getItem('presetGoals');
    let allGoals;
  
    // Fallback to default goals if not found in AsyncStorage
    if (!allGoalsData) {
      await AsyncStorage.setItem('presetGoals', JSON.stringify(presetGoals));
      allGoals = presetGoals;
    } else {
      allGoals = JSON.parse(allGoalsData);
    }
  
    const todayDate = getUniversalTime().fullDate;
    const scheduledGoals = await AsyncStorage.getItem(todayDate);
    const scheduled = scheduledGoals ? JSON.parse(scheduledGoals).map(g => g.id) : [];
  
    const unscheduledGoals = Object.entries(allGoals)
      .flatMap(([dimension, goals]) =>
        goals.map(goal => ({ ...goal, dimension }))
      )
      .filter(goal => !scheduled.includes(goal.id));
  
    if (unscheduledGoals.length > 3) {
      const randomGoals = unscheduledGoals.sort(() => 0.5 - Math.random()).slice(0, 3);
      setSuggestedGoals(randomGoals);
      setShowSuggestions(true);
    } else if (unscheduledGoals.length > 0) {
      setSuggestedGoals(unscheduledGoals);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  /**
   * Refreshes the suggested goals list
   * Clears previously added goals and loads new suggestions
   */
  const refreshSuggestions = () => {
    setAddedGoals({});
    loadSuggestedGoals();
  };

  /**
   * Adds a suggested goal to today's schedule
   * Saves the goal to AsyncStorage and updates the UI
   * Refreshes the home screen to show the new goal
   */
  const scheduleSuggestedGoal = async (goal) => {
    const todayDate = getUniversalTime().fullDate;
    const existingGoals = await AsyncStorage.getItem(todayDate);
    const updatedGoals = existingGoals ? JSON.parse(existingGoals) : [];
    updatedGoals.push({ ...goal, completed: false });
  
    await AsyncStorage.setItem(todayDate, JSON.stringify(updatedGoals));
    setAddedGoals(prev => ({ ...prev, [goal.id]: true }));
    loadGoals(); // Refresh HomeScreen dynamically
  };

  /**
   * Toggles the expansion of the suggestions section
   * Uses layout animation for smooth transitions
   */
  const toggleSuggestions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSuggestionsExpanded(!suggestionsExpanded);
  };

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadDimensionColors();    // Load all colors first
      loadHabits();             // Load today's habits (calls loadGoals)
      loadSuggestedGoals();     // Load suggestions
    }, [])
  );

  // Enable layout animations on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  /**
   * Renders individual dimension cards
   * Each card shows the dimension name, count of activities, and visual indicators
   * Cards grow in size based on the number of activities (goals + habits)
   * Cards with habits show a star indicator
   */
  const renderDimensionItem = ({ item }) => {
    const hasHabits = habitsByDimension[item.name] && habitsByDimension[item.name].length > 0;
    return (
      <TouchableOpacity
        style={[
          styles.dimensionItem,
          {
            backgroundColor: dimensionColors[item.name] || '#D3D3D3',
            width: Math.min(120 + item.count * 10, 160),
            height: Math.min(120 + item.count * 10, 160),
            borderRadius: Math.min(120 + item.count * 10, 160) / 2,
          },
        ]}
        onPress={() => navigation.navigate('DimensionGoalsScreen', { dimensionName: item.name })}
      >
        <Text style={styles.dimensionText}>{item.name}</Text>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: dimensionColors[item.name] || '#000', marginRight: hasHabits ? 2 : 0 }]}>{item.count}</Text>
          {hasHabits && (
            <Ionicons name="star" size={16} color="#FFD700" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
      {/* Header section with title and main action button */}
      <View>
        <Text style={styles.header}>Today's Wellness Dimensions</Text>

        <View style={styles.topContainer}>
          <TouchableOpacity
            style={styles.goalsButton}
            onPress={() => navigation.navigate('GoalSetting', { date: getUniversalTime().fullDate })}
          >
            <Ionicons name="add-circle" size={40} color="#00BFFF" />
            <Text style={styles.goalsButtonText}>Plan a Goal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dimension cards display - shows all wellness dimensions with activity counts */}
      {dimensionData.length > 0 ? (
        <View style={{ flexGrow: 1 }}>
          <FlatList
            data={dimensionData}
            renderItem={renderDimensionItem}
            keyExtractor={(item) => item.name}
            numColumns={2}
            columnWrapperStyle={styles.dimensionRow}
            contentContainerStyle={styles.dimensionList}
            scrollEnabled={false}   // Keeps FlatList from scrolling independently
          />
        </View>
      ) : (
        <Text style={styles.noGoalsText}>No goals scheduled for today.</Text>
      )}

      {/* Suggested goals section - expandable list of recommended goals */}
      {showSuggestions && (
        <View style={styles.suggestedContainer}>
          <View style={styles.suggestedHeader}>
            <TouchableOpacity
              style={styles.suggestedHeaderToggle}
              onPress={toggleSuggestions} // Animated toggle
            >
              <Text style={styles.suggestedHeaderText}>Suggested Goals</Text>
              <Ionicons
                name={suggestionsExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={30}
                color="#00BFFF"
                style={{ marginLeft: 10 }}  // Adds space between text & toggle icon
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={refreshSuggestions}>
              <Ionicons name="refresh-circle" size={30} color="#00BFFF" />
            </TouchableOpacity>
          </View>
          {suggestionsExpanded && suggestedGoals.map((goal) => (
            <View
              key={goal.id}
              style={[
                styles.suggestedGoalItem,
                { backgroundColor: dimensionColors[goal.dimension] || '#D3D3D3' },
              ]}
            >
              <Text style={styles.goalText}>{goal.name}</Text>
              <TouchableOpacity
                onPress={() => scheduleSuggestedGoal(goal)}
                disabled={addedGoals[goal.id]}
              >
                <Ionicons
                  name={addedGoals[goal.id] ? "checkmark-circle-outline" : "add-circle-outline"}
                  size={30}
                  color={addedGoals[goal.id] ? "green" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

/**
 * Styles for the HomeScreen component
 * Defines the visual appearance of all UI elements including:
 * - Layout containers and spacing
 * - Dimension cards with dynamic sizing
 * - Buttons and interactive elements
 * - Text styling and colors
 * - Suggested goals section styling
 */
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,            // Ensure the ScrollView takes full height
    paddingTop: 80,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  topContainer: {
    flexDirection: 'row',            // Side-by-side alignment
    justifyContent: 'space-between', // Push buttons to edges
    alignItems: 'center',            // Align vertically at the center
    marginBottom: 20,
  },
  
  goalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#E0F7FF',
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
    marginTop: 10,
    shadowColor: '#00BFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  
  goalsButtonText: {
    fontSize: 20,
    marginLeft: 15,
    color: '#00BFFF',
    fontWeight: 'bold',
  },
  
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,                     // Same height as planButtonTop
    paddingVertical: 10,
    paddingHorizontal: 15,          // Same padding for alignment
    backgroundColor: '#E0F7FF',
    borderRadius: 10,
    width: '48%',                   // Adjust width for alignment
  },
  
  settingsLabel: {
    fontSize: 18,
    color: '#00BFFF',
    marginRight: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center', /* Center the text */
    width: '100%',       /* Ensure it spans full width for proper centering */
  },
  dimensionList: {
    justifyContent: 'center',
    marginTop:20,
  },
  dimensionRow: {
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  dimensionItem: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,    // Increased minimum width
    height: 120,   // Increased minimum height
    borderRadius: 60, // Adjusted for circle shape
    position: 'relative',
  },
  dimensionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'black',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  badgeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  noGoalsText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
    color: 'gray',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', 
    marginTop: 0,
  },
  planButtonText: {
    fontSize: 18,
    marginLeft: 10,
    color: '#00BFFF',
  },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  suggestedContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#E8F6FF',
    borderRadius: 10,
    borderWidth: 2,             // Add border
    borderColor: 'black',         // Make it obvious if hidden
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,                  // Adds small spacing between text & icons
  },
  
  suggestedHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 0,          // Reduce space before the refresh button
  },
  suggestedHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  suggestedGoalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  goalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;