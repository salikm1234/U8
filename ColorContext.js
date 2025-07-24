/**
 * ColorContext - Global Color Management for Dimensions
 * 
 * This context provides centralized color management for wellness dimensions
 * across the entire app. It ensures that when a dimension's color is changed,
 * all components using that color will update immediately.
 * 
 * Features:
 * - Real-time color updates across all screens
 * - Persistent storage with AsyncStorage
 * - Default color fallbacks
 * - Efficient re-rendering only when colors change
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const ColorContext = createContext();

export const useColors = () => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error('useColors must be used within a ColorProvider');
  }
  return context;
};

export const ColorProvider = ({ children }) => {
  const [dimensionColors, setDimensionColors] = useState(defaultColors);

  // Load colors from storage on mount
  useEffect(() => {
    loadColors();
  }, []);

  const loadColors = async () => {
    try {
      const storedColors = await AsyncStorage.getItem('dimensionColors');
      if (storedColors) {
        setDimensionColors(JSON.parse(storedColors));
      }
    } catch (error) {
      console.error('Error loading dimension colors:', error);
    }
  };

  // Get color for a specific dimension
  const getColor = (dimension) => {
    return dimensionColors[dimension] || defaultColors[dimension] || '#D3D3D3';
  };

  // Update color for a specific dimension
  const updateColor = async (dimension, color) => {
    const updatedColors = { ...dimensionColors, [dimension]: color };
    setDimensionColors(updatedColors);
    await AsyncStorage.setItem('dimensionColors', JSON.stringify(updatedColors));
  };

  // Update multiple colors at once
  const updateColors = async (colors) => {
    setDimensionColors(colors);
    await AsyncStorage.setItem('dimensionColors', JSON.stringify(colors));
  };

  // Reset a single dimension to default
  const resetColor = async (dimension) => {
    const updatedColors = { ...dimensionColors, [dimension]: defaultColors[dimension] };
    setDimensionColors(updatedColors);
    await AsyncStorage.setItem('dimensionColors', JSON.stringify(updatedColors));
  };

  // Reset all colors to defaults
  const resetAllColors = async () => {
    setDimensionColors(defaultColors);
    await AsyncStorage.setItem('dimensionColors', JSON.stringify(defaultColors));
  };

  const value = {
    dimensionColors,
    getColor,
    updateColor,
    updateColors,
    resetColor,
    resetAllColors,
  };

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
};