import { getDB } from './index';

export interface Reminder {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export const insertReminder = (reminder: Reminder) => {
  const db = getDB();
  db.runSync(
    `INSERT INTO reminders (id, type, title, description, priority, dueDate, endTime, completed, reminderTime, reminderRepeat, notificationId, reminderRules, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id, reminder.type, reminder.title, reminder.description, reminder.priority,
      reminder.dueDate, reminder.endTime || null, reminder.completed, reminder.reminderTime, reminder.reminderRepeat, 
      reminder.notificationId, reminder.reminderRules || null, reminder.createdAt, reminder.updatedAt
    ]
  );
};

export const upsertReminder = (reminder: Reminder) => {
  const db = getDB();
  const existing = db.getFirstSync('SELECT id FROM reminders WHERE id = ?', [reminder.id]);
  
  if (existing) {
    db.runSync(
      `UPDATE reminders SET type=?, title=?, description=?, priority=?, dueDate=?, endTime=?, completed=?, reminderTime=?, reminderRepeat=?, updatedAt=?
       WHERE id=?`,
      [
        reminder.type, reminder.title, reminder.description, reminder.priority,
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
    'UPDATE reminders SET type=?, title=?, description=?, priority=?, dueDate=?, endTime=?, reminderTime=?, reminderRepeat=?, completed=?, notificationId=?, reminderRules=?, updatedAt=? WHERE id=?',
    [
      merged.type, merged.title, merged.description, merged.priority,
      merged.dueDate, merged.endTime || null, merged.reminderTime || null, merged.reminderRepeat || null,
      merged.completed ?? 0, merged.notificationId || null, merged.reminderRules || null, merged.updatedAt, id
    ]
  );
};

export const updateReminderStatus = (id: string, completed: number) => {
  const db = getDB();
  db.runSync(`UPDATE reminders SET completed = ?, updatedAt = ? WHERE id = ?`, [completed, new Date().toISOString(), id]);
};

export const updateReminderDescription = (id: string, description: string) => {
  const db = getDB();
  db.runSync(`UPDATE reminders SET description = ?, updatedAt = ? WHERE id = ?`, [description, new Date().toISOString(), id]);
};

export const deleteReminder = (id: string) => {
  const db = getDB();
  db.runSync(`DELETE FROM reminders WHERE id = ?`, [id]);
};

export const getAllReminders = (): Reminder[] => {
  const db = getDB();
  return db.getAllSync('SELECT * FROM reminders ORDER BY dueDate ASC') as Reminder[];
};

export const getRemindersByDate = (dateString: string): Reminder[] => {
  const db = getDB();
  // dateString is YYYY-MM-DD
  return db.getAllSync("SELECT * FROM reminders WHERE date(dueDate) = date(?) ORDER BY dueDate ASC", [dateString]) as Reminder[];
};
