import { v4 as uuidv4 } from 'uuid';
import { cancelTaskNotifications, scheduleNotification } from './notificationService';
import { generateTriggersFromRules, getDeterministicNotifId } from '../utils/reminderUtils';
import { Reminder, Notification, getAllReminders } from '../database/queries';
import { getDB } from '../database/index';

// Lazy getter để tránh circular dependency
const getNotificationStore = () => require('../store/useNotificationStore').useNotificationStore;

/**
 * Lên lịch thông báo cho một nhắc nhở cụ thể.
 * Hàm này có thể được gọi từ bất kỳ đâu: store, syncService, app startup.
 */
export const handleScheduling = async (reminder: Reminder): Promise<void> => {
  // if (__DEV__) console.log('🚀 handleScheduling started for:', reminder.title);

  try {
    // 1. Hủy các lịch cũ gán với Reminder này
    await cancelTaskNotifications(reminder.id);

    // 2. Đánh dấu xóa các bản ghi thông báo cũ (chưa đọc, trong tương lai) để đồng bộ xóa trên Supabase
    const db = getDB();
    db.runSync(
      `UPDATE notifications SET isDeleted = 1, synced = 0 WHERE reminder_id = ? AND is_read = 0 AND timestamp > ?`,
      [reminder.id, new Date().toISOString()]
    );

    // 3. Kiểm tra điều kiện cần thiết
    const dueDateStr = reminder.dueDate;
    if (!dueDateStr) {
      console.warn('⚠️ No dueDate for reminder, skipping scheduling:', reminder.title);
      return;
    }

    if (!reminder.reminderRules) {
      console.warn('⚠️ No reminderRules for reminder, skipping:', reminder.title);
      return;
    }

    // Nếu công việc đã hoàn thành, không lên lịch nữa
    if (reminder.completed === 1) {
      console.log('✅ Reminder already completed, skipping scheduling:', reminder.title);
      return;
    }

    // Parse datetime: nếu chuỗi thiếu timezone (ví dụ "2026-04-04T03:14:00"),
    // JS parse như UTC, lệch 7h với timezone +07:00.
    const parseLocalDateTime = (str: string): Date => {
      // Nếu đã có 'Z' hoặc '+' để chỉ timezone → dùng trực tiếp
      if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
        return new Date(str);
      }
      // Chuỗi naive "2026-04-04T03:14:00" → parse như giờ địa phương
      const offset = new Date().getTimezoneOffset(); // âm với UTC+7 → -420
      const d = new Date(str);
      const result = new Date(d.getTime() - offset * 60 * 1000);
      result.setSeconds(0, 0); // Đưa về 00 giây và 000 mili giây
      return result;
    };

    const startTime = parseLocalDateTime(dueDateStr);
    const endTime = reminder.endTime ? parseLocalDateTime(reminder.endTime) : startTime;


    // 4. Tính toán các thời điểm nhắc nhở dựa trên quy tắc (rules)
    const triggers = generateTriggersFromRules(
      reminder.reminderRules,
      startTime,
      endTime,
      reminder.title,
      reminder.type
    );

    if (triggers.length === 0) {
      // console.warn('⚠️ No future triggers generated. All time slots may be in the past.');
      return;
    }

    // 5. Với mỗi thời điểm nhắc nhở: Hẹn giờ hệ thống VÀ Gom vào danh sách để lưu sẵn
    const plannedNotifications: Partial<Notification>[] = [];
    
    for (const trigger of triggers) {
      // console.log(`⏰ Scheduling notification at: ${trigger.date.toISOString()}`);

      // Hẹn giờ nổ thông báo (Push Notification)
      await scheduleNotification(
        reminder.id,
        trigger.title,
        trigger.body,
        trigger.date,
        'none'
      );

      // Gom vào danh sách để lưu hàng loạt (Batch Save) để tăng hiệu năng và tránh spam Log
      const deterministicNotifId = getDeterministicNotifId(reminder.id, trigger.date);
      if (!deterministicNotifId) continue;
      
      plannedNotifications.push({
        id: deterministicNotifId,
        reminder_id: reminder.id,
        type: 'reminder',
        title: trigger.title,
        body: trigger.body,
        timestamp: trigger.date.toISOString(),
        is_read: 0,
        synced: 0,
        isDeleted: 0,
      });
    }

    // Thực hiện lưu hàng loạt
    if (plannedNotifications.length > 0) {
      try {
        getNotificationStore().getState().addNotificationsBatch(plannedNotifications);
      } catch (err) {
        console.error('❌ Failed to save batch notifications:', err);
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to handle scheduling for', reminder.title, ':', error);
  }
};

/**
 * Lên lịch lại TẤT CẢ thông báo cho một user.
 * Gọi hàm này khi app khởi động hoặc khi cần reset toàn bộ lịch.
 */
export const rescheduleAllReminders = async (userId: string): Promise<void> => {
  console.log('🔄 rescheduleAllReminders started for user:', userId);
  try {
    const reminders = getAllReminders(userId);
    for (const reminder of reminders) {
      if (reminder.reminderRules && reminder.completed !== 1) {
        await handleScheduling(reminder);
      }
    }
  } catch (error) {
    console.error('❌ rescheduleAllReminders failed:', error);
  }
};
