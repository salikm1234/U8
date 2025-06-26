/**
 * App Navigator - Navigation Structure for U8 Wellness App
 * 
 * This file defines the complete navigation structure of the U8 wellness tracking app.
 * It uses React Navigation with a combination of bottom tabs and stack navigators
 * to organize the app's screens into logical groups.
 * 
 * Navigation Structure:
 * - Bottom Tab Navigator (5 main sections)
 *   - Routines: Create and manage wellness routines
 *   - Habits: Track daily habits and view summaries
 *   - Home: Main dashboard and goal management
 *   - Calendar: Calendar view of activities
 *   - GPT: AI-powered wellness assistant
 * 
 * Each tab contains stack navigators that allow navigation between related screens
 * within that section. This provides a clean, organized user experience.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './HomeScreen';
import CalendarScreen from './CalendarScreen';
import GoalSettingScreen from './GoalSettingScreen';
import GptPrompterScreen from './GptPrompterScreen';
import GoalSelectionScreen from './GoalSelectionScreen';
import DimensionGoalsScreen from './DimensionGoalsScreen';
import HabitTrackingScreen from './HabitTrackingScreen';
import HabitSummaryScreen from './HabitSummaryScreen';
import RoutineTrackingScreen from './RoutineTrackingScreen';
import RoutineEditorScreen from './RoutineEditorScreen';
import RoutineActionScreen from './RoutineActionScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AddTaskScreen from './AddTaskScreen';
import { getUniversalTime } from './dateUtils';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * Dynamic routine icon based on time of day
 * Shows sun icon during daytime (5 AM - 8 PM) and moon icon at night
 */
const getRoutineIcon = () => {
    const currentHour = getUniversalTime().rawDate.getHours();
    return currentHour >= 5 && currentHour < 20 ? 'sunny' : 'moon';
  };

/**
 * Home Stack Navigator
 * Contains screens related to the main dashboard and goal management:
 * - Home: Main dashboard showing overview and quick actions
 * - GoalSelection: Choose which dimension to set goals for
 * - DimensionGoalsScreen: View and manage goals for a specific dimension
 * - GoalSetting: Create and edit individual goals
 */
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="DimensionGoalsScreen" component={DimensionGoalsScreen} />
      <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
    </Stack.Navigator>
  );
}

/**
 * Habit Stack Navigator
 * Contains screens for daily habit tracking:
 * - HabitTrackingScreen: Add and track daily habits
 * - HabitSummaryScreen: View habit statistics and summaries
 */
function HabitStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HabitTrackingScreen" component={HabitTrackingScreen} />
      <Stack.Screen name="HabitSummaryScreen" component={HabitSummaryScreen} />
    </Stack.Navigator>
  );
}

/**
 * Routine Stack Navigator
 * Contains screens for creating and managing wellness routines:
 * - RoutineTrackingScreen: View all routines and their progress
 * - RoutineEditorScreen: Create and edit routine details
 * - RoutineActionScreen: Execute routines and track task completion
 * - AddTaskScreen: Add individual tasks to routines
 */
function RoutineStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoutineTrackingScreen" component={RoutineTrackingScreen} />
        <Stack.Screen name="RoutineEditorScreen" component={RoutineEditorScreen} />
        <Stack.Screen name="RoutineActionScreen" component={RoutineActionScreen} />
        <Stack.Screen name="AddTaskScreen" component={AddTaskScreen} /> 
      </Stack.Navigator>
    );
  }

/**
 * Main App Navigator
 * Sets up the bottom tab navigation with 5 main sections.
 * Each tab has a custom icon and contains its respective stack navigator.
 * The HomeStack is set as the initial route when the app launches.
 */
export default function AppNavigator() {
    return (
      <Tab.Navigator initialRouteName="HomeStack" screenOptions={{ tabBarShowLabel: false }}>
        <Tab.Screen
          name="Routines"
          component={RoutineStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name={getRoutineIcon()} color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Habits"
          component={HabitStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="HomeStack"
          component={HomeStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="GPT"
          component={GptPrompterScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
          }}
        />
      </Tab.Navigator>
    );
  }