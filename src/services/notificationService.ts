import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { RepeatType } from '../store/taskStore';

// Lazy getter để tránh circular dependency:
// notificationService → useNotificationStore → syncService → notificationService
const getNotificationStore = () => require('../store/useNotificationStore').useNotificationStore;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermission = async (): Promise<boolean> => {
  /* 
  if (!Device.isDevice) {
    console.warn('Notifications only work on physical devices');
    return false;
  }
  */

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Nhắc lịch',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A73E8',
      sound: 'default',
    });
  }

  return true;
};

export const scheduleNotification = async (
  taskId: string,
  title: string,
  body: string,
  triggerDate: Date,
  repeat: RepeatType = 'none'
): Promise<string | null> => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    // Caller is responsible for cleaning up existing notifications if needed using cancelTaskNotifications.
    
    let trigger: Notifications.NotificationTriggerInput;

    if (repeat === 'none') {
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate };
    } else if (repeat === 'daily') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
      };
    } else if (repeat === 'weekly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: triggerDate.getDay() + 1, // 1=Sunday
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
      };
    } else {
      // monthly — use calendar trigger
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: triggerDate.getDate(),
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `${taskId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      content: {
        title,
        body,
        data: { taskId },
        sound: 'default',
      },
      trigger,
    });

    return notificationId;
  } catch (e) {
    console.error('Failed to schedule notification:', e);
    return null;
  }
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // Ignore if notification doesn't exist
  }
};

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const cancelTaskNotifications = async (taskId: string): Promise<void> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (e) {
    console.error('Failed to cancel task notifications:', e);
  }
};

// Listener for received notifications
export const initNotificationListeners = () => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const { title, body, data } = notification.request.content;
    console.log('🔔 Notification received in foreground:', title);
    
    // Lưu vào store để đồng bộ lên Supabase
    getNotificationStore().getState().addNotification({
      title: title || 'Nhắc lịch',
      body: body || '',
      reminder_id: (data?.taskId as string) || (data?.reminderId as string) || null,
      type: 'reminder',
      timestamp: new Date().toISOString(),
    });
  });

  return subscription;
};
