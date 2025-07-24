import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { themes, getTheme } from './themes';

// Create context with default light theme to prevent undefined errors
const ThemeContext = createContext({
  theme: themes.light,
  colorScheme: 'light'
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState('light');
  
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
  
  // Always get a valid theme
  const theme = getTheme(colorScheme) || themes.light;
  
  return (
    <ThemeContext.Provider value={{ theme, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  // If no context, return default light theme
  if (!context) {
    return { theme: themes.light, colorScheme: 'light' };
  }
  
  // Ensure theme is never undefined
  const theme = context.theme || themes.light;
  const colorScheme = context.colorScheme || 'light';
  
  return { theme, colorScheme };
};