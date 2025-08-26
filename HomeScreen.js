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
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, ScrollView, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getUniversalTime } from './dateUtils';
import { getColorForDimension } from './getColorForDimension';
import { goals as presetGoals } from './goals';
import { useTheme } from './ThemeContext';
import RingChart from './RingChart';
import { adjustColorForBadge, getContrastColor } from './colorUtils';

const HomeScreen = ({ navigation }) => {
  const { theme, colorScheme } = useTheme();
  
  // Function to get display name for dimensions (shortened for long names)
  const getDimensionDisplayName = (name) => {
    if (name === 'Environmental') return 'Environment';
    if (name === 'Occupational') return 'Occupation';
    return name;
  };
  
  // State for managing daily goals and their completion status
  const [dailyGoals, setDailyGoals] = useState([]);
  
  // State for dimension data including counts and colors
  const [dimensionData, setDimensionData] = useState([]);
  const [dimensionColors, setDimensionColors] = useState({});
  
  // State for view mode (ring or circles)
  const [viewMode, setViewMode] = useState('ring');
  
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

  /**
   * Load view mode preference from AsyncStorage
   */
  const loadViewMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('homeViewMode');
      if (savedMode) {
        setViewMode(savedMode);
      }
    } catch (error) {
      console.error('Error loading view mode:', error);
    }
  };

  /**
   * Toggle between ring and circles view and save preference
   */
  const toggleViewMode = async () => {
    const newMode = viewMode === 'ring' ? 'circles' : 'ring';
    setViewMode(newMode);
    try {
      await AsyncStorage.setItem('homeViewMode', newMode);
    } catch (error) {
      console.error('Error saving view mode:', error);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadViewMode();           // Load view mode preference
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
        <Text style={[styles.dimensionText, { color: getContrastColor(dimensionColors[item.name] || '#D3D3D3', colorScheme) }]}>{getDimensionDisplayName(item.name)}</Text>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: adjustColorForBadge(dimensionColors[item.name], colorScheme, theme) || theme.background, marginRight: hasHabits ? 2 : 0 }]}>{item.count}</Text>
          {hasHabits && (
            <Ionicons name="star" size={16} color="#FFD700" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);
  
  return (
    <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
      {/* Header section with title and main action button */}
      <View>
        <Text style={styles.header}>Today's Wellness Dimensions</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.goalsButton, { flex: 1, marginRight: 8 }]}
            onPress={() => navigation.navigate('GoalSetting', { date: getUniversalTime().fullDate })}
          >
            <Ionicons name="add-circle" size={32} color={theme.primaryButtonText} />
            <Text style={[styles.goalsButtonText, { fontSize: 16 }]}>Plan a Goal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewToggleButton}
            onPress={toggleViewMode}
          >
            <Ionicons 
              name={viewMode === 'ring' ? 'pie-chart' : 'grid'} 
              size={24} 
              color={theme.primaryButtonText} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dimension display - either ring chart or circles based on view mode */}
      {dimensionData.length > 0 ? (
        viewMode === 'ring' ? (
          <View style={styles.chartContainer}>
            <RingChart
              data={dimensionData.filter(d => d.count > 0).map(d => ({
                ...d,
                color: dimensionColors[d.name] || '#D3D3D3',
                hasHabits: habitsByDimension[d.name] && habitsByDimension[d.name].length > 0
              }))}
              onSlicePress={(item) => navigation.navigate('DimensionGoalsScreen', { dimensionName: item.name })}
              size={280}
              innerRadius={85}
              outerRadius={120}
            />
            
            {/* Color key/legend */}
            <View style={styles.legendContainer}>
              {dimensionData.filter(d => d.count > 0).map((dimension) => (
                <View key={dimension.name} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: dimensionColors[dimension.name] || '#D3D3D3' }]} />
                  <Text style={styles.legendText}>{getDimensionDisplayName(dimension.name)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            data={dimensionData.filter(d => d.count > 0)}
            renderItem={renderDimensionItem}
            keyExtractor={(item) => item.name}
            numColumns={2}
            columnWrapperStyle={styles.dimensionRow}
            contentContainerStyle={styles.dimensionList}
          />
        )
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
                color={theme.primaryButtonText}
                style={{ marginLeft: 10 }}  // Adds space between text & toggle icon
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={refreshSuggestions}>
              <Ionicons name="refresh-circle" size={30} color={theme.primaryButtonText} />
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
              <Text style={[styles.goalText, { color: getContrastColor(dimensionColors[goal.dimension] || '#D3D3D3', colorScheme) }]}>{goal.name}</Text>
              <TouchableOpacity
                onPress={() => scheduleSuggestedGoal(goal)}
                disabled={addedGoals[goal.id]}
                style={{ minWidth: 30, alignItems: 'center' }}
              >
                <Ionicons
                  name={addedGoals[goal.id] ? "checkmark-circle-outline" : "add-circle-outline"}
                  size={30}
                  color={addedGoals[goal.id] ? theme.success : "#fff"}
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
const createStyles = (theme) => StyleSheet.create({
  container: {
    flexGrow: 1,            // Ensure the ScrollView takes full height
    paddingTop: 80,
    paddingHorizontal: 20,
    backgroundColor: theme.background,
  },
  topContainer: {
    flexDirection: 'row',            // Side-by-side alignment
    justifyContent: 'space-between', // Push buttons to edges
    alignItems: 'center',            // Align vertically at the center
    marginBottom: 20,
  },
  
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  
  viewToggleButton: {
    width: 56,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.secondaryButton,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  
  goalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.primaryButton,
    borderRadius: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  
  goalsButtonText: {
    fontSize: 18,
    marginLeft: 12,
    color: theme.primaryButtonText,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  
  legendText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.secondaryButton,
    borderRadius: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  settingsLabel: {
    fontSize: 18,
    color: theme.primaryButtonText,
    marginRight: 5,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
    width: '100%',
    color: theme.text,
    letterSpacing: 0.5,
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
    width: 130,
    height: 130,
    borderRadius: 20,
    position: 'relative',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dimensionText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    // textShadowColor: 'rgba(0, 0, 0, 0.3)',
    // textShadowOffset: { width: 0, height: 1 },
    // textShadowRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.text,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    // borderWidth: 2,
    // borderColor: theme.background,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 13,
    color: theme.background,
  },
  noGoalsText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
    color: theme.textSecondary,
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
    color: theme.primaryButtonText,
  },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  suggestedContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: theme.suggestedContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    fontSize: 19,
    fontWeight: '600',
    color: theme.text,
    letterSpacing: 0.2,
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
    // fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
});

export default HomeScreen;