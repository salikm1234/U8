/**
 * GoalsContext - Global Goals Management
 * 
 * This context provides centralized goal management across the entire app.
 * It ensures that when goals are added, edited, or removed, all components
 * using goals will update immediately without needing to reload.
 * 
 * Features:
 * - Real-time goal updates across all screens
 * - Persistent storage with AsyncStorage
 * - Manages both preset and custom goals
 * - Efficient re-rendering only when goals change
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goals as defaultPresetGoals } from './goals';

const GoalsContext = createContext();

export const useGoals = () => {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
};

export const GoalsProvider = ({ children }) => {
  const [presetGoals, setPresetGoals] = useState(defaultPresetGoals);
  const [loading, setLoading] = useState(true);

  // Load goals from storage on mount
  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const storedGoals = await AsyncStorage.getItem('presetGoals');
      if (storedGoals) {
        setPresetGoals(JSON.parse(storedGoals));
      } else {
        // Initialize with default goals if none exist
        await AsyncStorage.setItem('presetGoals', JSON.stringify(defaultPresetGoals));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get goals for a specific dimension
  const getGoalsForDimension = (dimension) => {
    return presetGoals[dimension] || [];
  };

  // Add a new goal to a dimension
  const addGoal = async (dimension, goal) => {
    const updatedGoals = {
      ...presetGoals,
      [dimension]: [...(presetGoals[dimension] || []), goal]
    };
    setPresetGoals(updatedGoals);
    await AsyncStorage.setItem('presetGoals', JSON.stringify(updatedGoals));
  };

  // Update an existing goal
  const updateGoal = async (dimension, goalId, updatedGoal) => {
    const updatedGoals = {
      ...presetGoals,
      [dimension]: presetGoals[dimension].map(g => 
        g.id === goalId ? { ...g, ...updatedGoal } : g
      )
    };
    setPresetGoals(updatedGoals);
    await AsyncStorage.setItem('presetGoals', JSON.stringify(updatedGoals));
  };

  // Remove a goal from a dimension
  const removeGoal = async (dimension, goalId) => {
    const updatedGoals = {
      ...presetGoals,
      [dimension]: presetGoals[dimension].filter(g => g.id !== goalId)
    };
    setPresetGoals(updatedGoals);
    await AsyncStorage.setItem('presetGoals', JSON.stringify(updatedGoals));
  };

  // Reset all goals to defaults
  const resetAllGoals = async () => {
    setPresetGoals(defaultPresetGoals);
    await AsyncStorage.setItem('presetGoals', JSON.stringify(defaultPresetGoals));
  };

  // Reset goals for a specific dimension
  const resetDimensionGoals = async (dimension) => {
    const updatedGoals = {
      ...presetGoals,
      [dimension]: defaultPresetGoals[dimension] || []
    };
    setPresetGoals(updatedGoals);
    await AsyncStorage.setItem('presetGoals', JSON.stringify(updatedGoals));
  };

  const value = {
    presetGoals,
    loading,
    getGoalsForDimension,
    addGoal,
    updateGoal,
    removeGoal,
    resetAllGoals,
    resetDimensionGoals,
    reloadGoals: loadGoals,
  };

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
};