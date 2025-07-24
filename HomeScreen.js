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
import { goals as defaultPresetGoals } from './goals';
import { useTheme } from './ThemeContext';
import { useColors } from './ColorContext';
import { useGoals } from './GoalsContext';

const HomeScreen = ({ navigation }) => {
  const { theme, colorScheme } = useTheme();
  const { getColor } = useColors();
  const { presetGoals } = useGoals();
  
  // Function to adjust color for better contrast on badge
  const getContrastColor = (color) => {
    if (!color) return theme.background;
    
    // In dark mode (white badge), darken light colors
    if (colorScheme === 'dark') {
      // Convert hex to RGB
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // If color is too light, darken it
      if (luminance > 0.6) {
        const factor = 0.4; // Darken by 60%
        const newR = Math.floor(r * factor);
        const newG = Math.floor(g * factor);
        const newB = Math.floor(b * factor);
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
    }
    // In light mode (black badge), lighten dark colors
    else {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // If color is too dark, lighten it
      if (luminance < 0.3) {
        const factor = 2.5; // Lighten significantly
        const newR = Math.min(255, Math.floor(r * factor));
        const newG = Math.min(255, Math.floor(g * factor));
        const newB = Math.min(255, Math.floor(b * factor));
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
    }
    
    return color;
  };
  // State for managing daily goals and their completion status
  const [dailyGoals, setDailyGoals] = useState([]);
  
  // State for dimension data including counts
  const [dimensionData, setDimensionData] = useState([]);
  
  // State for suggested goals
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
   * Loads suggested goals that haven't been scheduled for today
   * Randomly selects up to 3 goals from the preset goal library
   * Provides users with quick options to add to their daily schedule
   */
  const loadSuggestedGoals = async () => {
    const todayDate = getUniversalTime().fullDate;
    const scheduledGoals = await AsyncStorage.getItem(todayDate);
    const scheduled = scheduledGoals ? JSON.parse(scheduledGoals).map(g => g.id) : [];
  
    const unscheduledGoals = Object.entries(presetGoals)
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
   * Determines if text should be black or white based on background color
   * Uses relative luminance calculation for optimal contrast
   */
  const getTextColorForBackground = (backgroundColor) => {
    if (!backgroundColor) return '#FFFFFF';
    
    // Remove # if present
    const color = backgroundColor.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    
    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use black text only for very light backgrounds (like yellow)
    // Higher threshold (0.7) means black text is used more rarely
    return luminance > 0.75 ? '#000000' : '#FFFFFF';
  };

  /**
   * Renders individual dimension cards
   * Each card shows the dimension name, count of activities, and visual indicators
   * Cards grow in size based on the number of activities (goals + habits)
   * Cards with habits show a star indicator
   */
  const renderDimensionItem = ({ item }) => {
    const hasHabits = habitsByDimension[item.name] && habitsByDimension[item.name].length > 0;
    const backgroundColor = getColor(item.name);
    const textColor = getTextColorForBackground(backgroundColor);
    
    // Shorten long dimension names for better display in circles
    const getDisplayName = (name) => {
      if (name === 'Environmental') return 'Environment';
      if (name === 'Occupational') return 'Occupation';
      return name;
    };
    
    return (
      <TouchableOpacity
        style={[
          styles.dimensionItem,
          {
            backgroundColor: backgroundColor,
            width: Math.min(120 + item.count * 10, 160),
            height: Math.min(120 + item.count * 10, 160),
            borderRadius: Math.min(120 + item.count * 10, 160) / 2,
          },
        ]}
        onPress={() => navigation.navigate('DimensionGoalsScreen', { dimensionName: item.name })}
      >
        <Text style={[styles.dimensionText, { color: textColor }]}>{getDisplayName(item.name)}</Text>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: getContrastColor(backgroundColor), marginRight: hasHabits ? 2 : 0 }]}>{item.count}</Text>
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

        <View style={styles.topContainer}>
          <TouchableOpacity
            style={styles.goalsButton}
            onPress={() => navigation.navigate('GoalSetting', { date: getUniversalTime().fullDate })}
          >
            <Ionicons name="add-circle" size={40} color={theme.primaryButtonText} />
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
                color={theme.primaryButtonText}
                style={{ marginLeft: 10 }}  // Adds space between text & toggle icon
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={refreshSuggestions}>
              <Ionicons name="refresh-circle" size={30} color={theme.primaryButtonText} />
            </TouchableOpacity>
          </View>
          {suggestionsExpanded && suggestedGoals.map((goal) => {
            const backgroundColor = getColor(goal.dimension);
            const textColor = getTextColorForBackground(backgroundColor);
            return (
              <View
                key={goal.id}
                style={[
                  styles.suggestedGoalItem,
                  { backgroundColor },
                ]}
              >
                <Text style={[styles.goalText, { color: textColor }]}>{goal.name}</Text>
                <TouchableOpacity
                  onPress={() => scheduleSuggestedGoal(goal)}
                  disabled={addedGoals[goal.id]}
                  style={{ minWidth: 30, alignItems: 'center' }}
                >
                  <Ionicons
                    name={addedGoals[goal.id] ? "checkmark-circle-outline" : "add-circle-outline"}
                    size={30}
                    color={addedGoals[goal.id] ? theme.success : textColor}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
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
  
  goalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.primaryButton,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
    marginTop: 10,
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
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
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