// getColorForDimension.js
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

// WCAG AA compliant colors for accessibility mode
const accessibleColors = {
  Physical: '#C44000',    // Darker orange
  Mental: '#0066CC',      // Darker blue
  Environmental: '#2A7F2A', // Darker green
  Financial: '#B8860B',   // Darker gold
  Intellectual: '#663399', // Darker purple
  Occupational: '#147575', // Darker teal
  Social: '#CC2200',      // Darker red
  Spiritual: '#8B008B',   // Darker magenta
};

export const getColorForDimension = async (dimension) => {
  try {
    // Check if accessibility mode is enabled
    const accessibilityMode = await AsyncStorage.getItem('accessibilityMode');
    const isAccessible = accessibilityMode === 'true';
    
    // Use accessible colors if in accessibility mode
    if (isAccessible) {
      return accessibleColors[dimension] || '#606060';
    }
    
    // Otherwise use custom or default colors
    const storedColors = await AsyncStorage.getItem('dimensionColors');
    const dimensionColors = storedColors ? JSON.parse(storedColors) : {};
    return dimensionColors[dimension] || defaultColors[dimension] || '#D3D3D3';
  } catch (error) {
    console.error('Error fetching color for dimension:', error);
    return '#D3D3D3'; // Fallback color
  }
};