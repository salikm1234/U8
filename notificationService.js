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

// ✅ Function to trigger a goals ring completion notification
export const sendGoalRingCompletionNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💙 Goals Ring Closed!",
      body: "You've completed all your goals for today! Amazing work!",
      sound: 'default',
      badge: 1,
      priority: 'max',
      vibrate: [0, 250, 250, 250],
    },
    trigger: null,
  });
};

// ✅ Function to trigger a habits ring completion notification
export const sendHabitRingCompletionNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💚 Habits Ring Closed!",
      body: "All habits completed! You're building great consistency!",
      sound: 'default',
      badge: 1,
      priority: 'max',
      vibrate: [0, 250, 250, 250],
    },
    trigger: null,
  });
};

// ✅ Function to trigger a routines ring completion notification
export const sendRoutineRingCompletionNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "❤️ Routines Ring Closed!",
      body: "All routine tasks completed! You're crushing it today!",
      sound: 'default',
      badge: 1,
      priority: 'max',
      vibrate: [0, 250, 250, 250],
    },
    trigger: null,
  });
};

// ✅ Function to trigger all rings completion notification
export const sendAllRingsCompletionNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🏆 Perfect Day!",
      body: "All activity rings closed! You've achieved excellence today!",
      sound: 'default',
      badge: 1,
      priority: 'max',
      vibrate: [0, 250, 250, 250],
    },
    trigger: null,
  });
};