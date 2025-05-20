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

export const getColorForDimension = async (dimension) => {
  try {
    const storedColors = await AsyncStorage.getItem('dimensionColors');
    const dimensionColors = storedColors ? JSON.parse(storedColors) : {};
    return dimensionColors[dimension] || defaultColors[dimension] || '#D3D3D3';
  } catch (error) {
    console.error('Error fetching color for dimension:', error);
    return '#D3D3D3'; // Fallback color
  }
};