/**
 * Main App Component - U8 Wellness Tracking Application
 * 
 * This is the root component of the U8 wellness tracking app. The app focuses on
 * tracking health and wellness across 8 different dimensions: Physical, Mental,
 * Environmental, Financial, Intellectual, Occupational, Social, and Spiritual.
 * 
 * The app provides features for:
 * - Setting and tracking daily habits
 * - Creating and managing wellness routines
 * - Goal setting and progress monitoring
 * - Calendar-based tracking and visualization
 * - Dimension-based goal management
 * 
 * This component sets up the navigation container which wraps the entire
 * application and provides navigation context to all child components.
 */

import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import AppNavigator from './AppNavigator';
import { ThemeProvider, useTheme } from './ThemeContext';
import { ColorProvider } from './ColorContext';
import { GoalsProvider } from './GoalsContext';

function ThemedApp() {
  const { theme, colorScheme } = useTheme();
  
  const navigationTheme = {
    ...DefaultTheme,
    dark: colorScheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: theme.primaryButtonText,
      background: theme.background,
      card: theme.tabBarBackground,
      text: theme.text,
      border: theme.border,
      notification: theme.primaryButtonText,
    },
  };
  
  return (
    <NavigationContainer theme={navigationTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ColorProvider>
        <GoalsProvider>
          <ThemedApp />
        </GoalsProvider>
      </ColorProvider>
    </ThemeProvider>
  );
}
