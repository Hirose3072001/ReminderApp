import * as SQLite from 'expo-sqlite';

/**
 * Mở và khởi tạo Database Sync
 */
export const getDB = () => {
  return SQLite.openDatabaseSync('remindme.db');
};

/**
 * Tự động tạo bảng nếu chưa có
 * - Bảng reminders: Lưu chung cả Sự kiện (Event) và Công việc (Task).
 * Dùng cột type='task' hoặc 'event' để phân tách.
 */
export const initDB = () => {
  const db = getDB();
    db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT, -- Supabase User ID
        type TEXT NOT NULL, -- 'task' or 'event'
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT, -- 'high', 'medium', 'low'
        dueDate TEXT, -- ISO string
        completed INTEGER NOT NULL DEFAULT 0, -- 0 or 1
        reminderTime TEXT, -- ISO string
        reminderRepeat TEXT, -- 'none', 'daily', 'weekly', etc.
        notificationId TEXT,
        reminderRules TEXT, -- JSON string
        synced INTEGER DEFAULT 0, -- 0: local only, 1: synced with cloud
        isDeleted INTEGER DEFAULT 0, -- 0: active, 1: deleted (soft delete for sync)
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  
  // Update schema in case the user already has the old db
  try {
    db.execSync('ALTER TABLE reminders ADD COLUMN endTime TEXT;');
  } catch (e) {}

  try {
    db.execSync('ALTER TABLE reminders ADD COLUMN reminderRules TEXT;');
  } catch (e) {}

  try {
    db.execSync('ALTER TABLE reminders ADD COLUMN user_id TEXT;');
  } catch (e) {}

  try {
    db.execSync('ALTER TABLE reminders ADD COLUMN synced INTEGER DEFAULT 0;');
  } catch (e) {}

  try {
    db.execSync('ALTER TABLE reminders ADD COLUMN isDeleted INTEGER DEFAULT 0;');
  } catch (e) {}

  console.log('✅ SQLite Database Initialized!');
};
