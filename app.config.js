import 'dotenv/config';

export default {
  expo: {
    name: "U8_expo",
    slug: "U8_expo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourname.U8expo",
      infoPlist: {
        UIBackgroundModes: ["fetch", "remote-notification"],
        NSUserTrackingUsageDescription: "This app uses notifications to remind you about completed habits."
      }
    },
    android: {
      package: "com.yourname.U8expo",
      permissions: ["RECEIVE_BOOT_COMPLETED"],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#FFFFFF",
          // sounds: ["default"]
        }
      ]
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY,
    },
  },
}; 