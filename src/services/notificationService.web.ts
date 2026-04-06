// Stub cho Web
// Push notification trên web cần một cấu hình phức tạp (Service Worker + VAPID_KEY).
// Tạm thời trên web ta chỉ export các hàm rỗng để tránh lỗi bundle.
// Đối với web, ta sẽ không cần expo-notifications.

export const requestNotificationPermission = async () => false;

export const scheduleNotification = async (title: string, body: string, trigger: any) => {
  return "web_notification_id";
};

export const cancelAllNotifications = async () => {};
export const cancelNotification = async (id: string) => {};
export const cancelTaskNotifications = async (taskId: string) => {};

export const initNotificationListeners = () => {
    return {
        remove: () => {}
    }
};
