const { Expo } = require("expo-server-sdk");
const expo = new Expo();

/**
 * Send a push notification to a specific user
 * @param {string} pushToken - The target user's Expo Push Token
 * @param {string} title - Title of the notification
 * @param {string} body - Body content
 * @param {object} data - Extra data to send with the notification
 */
exports.sendPushNotification = async (pushToken, title, body, data = {}) => {
  // Check if token is valid
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }

  const messages = [
    {
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
      url: "split2://", // 🚀 Opens your custom standalone app instead of Expo Go
    },
  ];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};
