import AsyncStorage from '@react-native-async-storage/async-storage';

// One-time script to remove all scheduled instances of custom goals from AsyncStorage
export async function removeAllScheduledCustomGoals() {
  try {
    // Get all date keys
    const allKeys = await AsyncStorage.getAllKeys();
    const dateKeys = allKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    let totalRemoved = 0;
    for (const key of dateKeys) {
      const storedGoals = await AsyncStorage.getItem(key);
      if (storedGoals) {
        let parsedGoals = JSON.parse(storedGoals);
        // Remove any goal whose id starts with 'custom-'
        const updatedGoals = parsedGoals.filter(goal => !(goal.id && goal.id.startsWith('custom-')));
        if (updatedGoals.length !== parsedGoals.length) {
          await AsyncStorage.setItem(key, JSON.stringify(updatedGoals));
          totalRemoved += parsedGoals.length - updatedGoals.length;
        }
      }
    }
    console.log(`Removed ${totalRemoved} scheduled custom goal instances (by id prefix).`);
  } catch (error) {
    console.error('Error removing scheduled custom goals:', error);
  }
}

// To run this script, import and call removeAllScheduledCustomGoals() from your app or a dev screen. 