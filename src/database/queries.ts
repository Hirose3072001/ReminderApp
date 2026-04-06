import { getDB } from './index';

export interface Reminder {
  id: string;
  user_id?: string | null;
  type: 'task' | 'event';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string; // ISO string YYYY-MM-DDTHH:mm:ss.sssZ
  endTime?: string | null; // ISO string YYYY-MM-DDTHH:mm:ss.sssZ
  completed: number; // 0 or 1
  reminderTime: string | null;
  reminderRepeat: string | null;
  notificationId: string | null;
  reminderRules?: string | null;
  synced: number; // 0 or 1
  isDeleted: number; // 0 or 1
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  reminder_id?: string | null;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  is_read: number; // 0 or 1
  synced: number; // 0 or 1
  isDeleted: number; // 0 or 1
  createdAt: string;
}

export const insertReminder = (reminder: Reminder) => {
  const db = getDB();
  db.runSync(
    `INSERT INTO reminders (id, user_id, type, title, description, priority, dueDate, endTime, completed, reminderTime, reminderRepeat, notificationId, reminderRules, synced, isDeleted, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id, reminder.user_id || null, reminder.type, reminder.title, reminder.description, reminder.priority,
      reminder.dueDate, reminder.endTime || null, reminder.completed, reminder.reminderTime, reminder.reminderRepeat, 
      reminder.notificationId, reminder.reminderRules || null, reminder.synced ?? 0, reminder.isDeleted ?? 0, reminder.createdAt, reminder.updatedAt
    ]
  );
};

export const upsertReminder = (reminder: Reminder) => {
  const db = getDB();
  const existing = db.getFirstSync('SELECT id FROM reminders WHERE id = ?', [reminder.id]);
  
  if (existing) {
    db.runSync(
      `UPDATE reminders SET user_id=?, type=?, title=?, description=?, priority=?, dueDate=?, endTime=?, completed=?, reminderTime=?, reminderRepeat=?, synced=0, updatedAt=?
       WHERE id=?`,
      [
        reminder.user_id || null, reminder.type, reminder.title, reminder.description, reminder.priority,
        reminder.dueDate, reminder.endTime || null, reminder.completed,
        reminder.reminderTime || null, reminder.reminderRepeat || null,
        new Date().toISOString(), reminder.id
      ]
    );
  } else {
    insertReminder(reminder);
  }
};

// Update a reminder
export const updateReminder = (id: string, fields: Partial<Reminder>) => {
  const db = getDB();
  // Fetch current to merge
  const current = db.getFirstSync('SELECT * FROM reminders WHERE id = ?', [id]) as Reminder;
  if (!current) return;

  const merged = { ...current, ...fields, updatedAt: new Date().toISOString() };
  
  db.runSync(
    'UPDATE reminders SET user_id=?, type=?, title=?, description=?, priority=?, dueDate=?, endTime=?, reminderTime=?, reminderRepeat=?, completed=?, notificationId=?, reminderRules=?, synced=0, updatedAt=? WHERE id=?',
    [
      merged.user_id || null, merged.type, merged.title, merged.description, merged.priority,
      merged.dueDate, merged.endTime || null, merged.reminderTime || null, merged.reminderRepeat || null,
      merged.completed ?? 0, merged.notificationId || null, merged.reminderRules || null, merged.updatedAt, id
    ]
  );
};

export const updateReminderStatus = (id: string, completed: number) => {
  const db = getDB();
  db.runSync(`UPDATE reminders SET completed = ?, synced = 0, updatedAt = ? WHERE id = ?`, [completed, new Date().toISOString(), id]);
};

export const updateReminderDescription = (id: string, description: string) => {
  const db = getDB();
  db.runSync(`UPDATE reminders SET description = ?, synced = 0, updatedAt = ? WHERE id = ?`, [description, new Date().toISOString(), id]);
};

export const deleteReminder = (id: string) => {
  const db = getDB();
  // Soft delete for sync
  db.runSync(`UPDATE reminders SET isDeleted = 1, synced = 0, updatedAt = ? WHERE id = ?`, [new Date().toISOString(), id]);
};

export const getAllReminders = (userId: string): Reminder[] => {
  const db = getDB();
  return db.getAllSync('SELECT * FROM reminders WHERE user_id = ? AND isDeleted = 0 ORDER BY dueDate ASC', [userId]) as Reminder[];
};

export const getRemindersByDate = (userId: string, dateString: string): Reminder[] => {
  const db = getDB();
  // dateString is YYYY-MM-DD
  return db.getAllSync("SELECT * FROM reminders WHERE user_id = ? AND date(dueDate) = date(?) AND isDeleted = 0 ORDER BY dueDate ASC", [userId, dateString]) as Reminder[];
};

export const getUnsyncedReminders = (userId: string) => {
  const db = getDB();
  return db.getAllSync('SELECT * FROM reminders WHERE user_id = ? AND synced = 0', [userId]) as Reminder[];
};

export const clearAllLocalData = () => {
  const db = getDB();
  db.runSync('DELETE FROM reminders');
  db.runSync('DELETE FROM notifications');
};

// Notification Queries
export const insertNotification = (notif: Notification) => {
  const db = getDB();
  db.runSync(
    `INSERT OR REPLACE INTO notifications (id, user_id, reminder_id, type, title, body, timestamp, is_read, synced, isDeleted, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notif.id, notif.user_id || null, notif.reminder_id || null, notif.type, notif.title, 
      notif.body, notif.timestamp, notif.is_read, notif.synced ?? 0, notif.isDeleted ?? 0, notif.createdAt
    ]
  );
};

export const getAllNotifications = (userId: string): Notification[] => {
  const db = getDB();
  return db.getAllSync('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC', [userId]) as Notification[];
};

export const updateNotificationReadStatus = (id: string, isRead: number) => {
  const db = getDB();
  // Cần đánh dấu synced = 0 để đẩy trạng thái "Đã đọc" lên Supabase
  db.runSync('UPDATE notifications SET is_read = ?, synced = 0 WHERE id = ?', [isRead, id]);
};

export const getRecentNotifications = (userId: string, limit: number = 100): Notification[] => {
  const db = getDB();
  const now = new Date().toISOString();
  // Chỉ lấy những thông báo có thời gian <= hiện tại (đã nổ) và chưa bị xóa
  return db.getAllSync(
    'SELECT * FROM notifications WHERE user_id = ? AND timestamp <= ? AND isDeleted = 0 ORDER BY timestamp DESC LIMIT ?', 
    [userId, now, limit]
  ) as Notification[];
};

export const getUnsyncedNotifications = (userId: string): Notification[] => {
  const db = getDB();
  return db.getAllSync('SELECT * FROM notifications WHERE user_id = ? AND synced = 0', [userId]) as Notification[];
};

export const deleteNotification = (id: string) => {
  const db = getDB();
  db.runSync('DELETE FROM notifications WHERE id = ?', [id]);
};
