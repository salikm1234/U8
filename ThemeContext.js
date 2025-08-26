import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, getTheme } from './themes';

// Create context with default light theme to prevent undefined errors
const ThemeContext = createContext({
  theme: themes.light,
  colorScheme: 'light',
  accessibilityMode: false,
  toggleAccessibility: () => {}
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState('light');
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  
  // Load accessibility preference from AsyncStorage on mount
  useEffect(() => {
    const loadAccessibilityPreference = async () => {
      try {
        const storedAccessibility = await AsyncStorage.getItem('accessibilityMode');
        if (storedAccessibility !== null) {
          setAccessibilityMode(storedAccessibility === 'true');
        }
      } catch (error) {
        console.error('Error loading accessibility preference:', error);
      }
    };
    loadAccessibilityPreference();
  }, []);
  
  // Initialize with system color scheme if available
  useEffect(() => {
    if (systemColorScheme) {
      setColorScheme(systemColorScheme);
    }
  }, [systemColorScheme]);
  
  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme || 'light');
    });
    
    return () => subscription?.remove();
  }, []);
  
  // Toggle accessibility mode and save preference
  const toggleAccessibility = async () => {
    const newMode = !accessibilityMode;
    setAccessibilityMode(newMode);
    try {
      await AsyncStorage.setItem('accessibilityMode', newMode.toString());
    } catch (error) {
      console.error('Error saving accessibility preference:', error);
    }
  };
  
  // Get the appropriate theme based on color scheme and accessibility mode
  const getActiveTheme = () => {
    if (accessibilityMode) {
      return colorScheme === 'dark' ? themes.darkAccessible : themes.lightAccessible;
    }
    return colorScheme === 'dark' ? themes.dark : themes.light;
  };
  
  const theme = getActiveTheme();
  
  return (
    <ThemeContext.Provider value={{ theme, colorScheme, accessibilityMode, toggleAccessibility }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  // If no context, return default light theme
  if (!context) {
    return { theme: themes.light, colorScheme: 'light', accessibilityMode: false, toggleAccessibility: () => {} };
  }
  
  // Ensure theme is never undefined
  const theme = context.theme || themes.light;
  const colorScheme = context.colorScheme || 'light';
  const accessibilityMode = context.accessibilityMode || false;
  const toggleAccessibility = context.toggleAccessibility || (() => {});
  
  return { theme, colorScheme, accessibilityMode, toggleAccessibility };
};