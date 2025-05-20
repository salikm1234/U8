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

/**
 * Fetches the color for a given dimension from AsyncStorage.
 * Falls back to default if not found.
 */
export const getColorForDimension = async (dimension) => {
  try {
    const storedColors = await AsyncStorage.getItem('dimensionColors');
    const colors = storedColors ? JSON.parse(storedColors) : defaultColors;
    return colors[dimension] || defaultColors[dimension];
  } catch (error) {
    console.error('Error fetching color for dimension:', error);
    return defaultColors[dimension];
  }
};


export const getUniversalTime = () => {
    const now = new Date();
    const options = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' };
  
    // Format Date in Pacific Time (YYYY-MM-DD)
    const formattedDate = new Intl.DateTimeFormat('en-CA', options).format(now);
  
    return {
      fullDate: formattedDate, // YYYY-MM-DD format for AsyncStorage
      rawDate: now, // Raw Date object if needed
    };
  };