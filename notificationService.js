import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert } from 'react-native';

// 🔥 Configure how notifications behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // ✅ Shows as a banner
    shouldPlaySound: true,   // ✅ Plays notification sound
    shouldSetBadge: true,    // ✅ Updates app icon badge
  }),
});

// 🔥 Request permissions for notifications
export const configureNotifications = async () => {
  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert("Permission Required", "Enable notifications in settings to receive reminders.");
        return;
      }
    }
  } else {
    console.log("Must use a physical device for push notifications.");
  }
};

// ✅ Function to trigger a habit completion notification
export const sendHabitCompletionNotification = async (habitName) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🎉 Habit Completed!",
      body: `You've completed your habit: ${habitName}! Keep up the great work!`,
      sound: 'default',   // ✅ Ensures sound plays
      badge: 1,           // ✅ Adds a badge to app icon
      priority: 'max',    // ✅ Ensures highest priority (for Android)
      vibrate: [0, 250, 250, 250], // ✅ Vibration pattern
    },
    trigger: null, // ✅ Sends immediately
  });
};