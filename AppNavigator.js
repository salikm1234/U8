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
import RoutineTrackingScreen from './RoutineTrackingScreen'; // ✅ Routine Tracking
import RoutineEditorScreen from './RoutineEditorScreen';     // ✅ Routine Editor
import RoutineActionScreen from './RoutineActionScreen';     // ✅ Routine Action
import Ionicons from 'react-native-vector-icons/Ionicons';
import AddTaskScreen from './AddTaskScreen';
import { getUniversalTime } from './dateUtils';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const getRoutineIcon = () => {
    const currentHour = getUniversalTime().rawDate.getHours();
    return currentHour >= 5 && currentHour < 20 ? 'sunny' : 'moon';
  };

// ✅ HomeStack with related screens
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

// ✅ HabitStack with Tracking & Summary screens
function HabitStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HabitTrackingScreen" component={HabitTrackingScreen} />
      <Stack.Screen name="HabitSummaryScreen" component={HabitSummaryScreen} />
    </Stack.Navigator>
  );
}

// ✅ RoutineStack with Tracking, Editor, and Action screens
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

// ✅ Bottom Tab Navigator with Routine section added
export default function AppNavigator() {
    return (
      <Tab.Navigator initialRouteName="HomeStack" screenOptions={{ tabBarShowLabel: false }}>
        <Tab.Screen
          name="Routines"
          component={RoutineStack} // ✅ First in order
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name={getRoutineIcon()} color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Habits"
          component={HabitStack} // ✅ Second in order
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="HomeStack"
          component={HomeStack} // ✅ Opens first on app launch
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen} // ✅ Fourth in order
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="GPT"
          component={GptPrompterScreen} // ✅ Last in order (Chat)
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
          }}
        />
      </Tab.Navigator>
    );
  }