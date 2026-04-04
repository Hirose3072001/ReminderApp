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

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        reminder_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);
  
  // Migration: Đảm bảo bảng reminders đầy đủ các cột cần thiết
  try {
    const reminderInfo = db.getAllSync("PRAGMA table_info(reminders)");
    const cols = (reminderInfo as any[]).map(c => c.name);
    
    if (!cols.includes('endTime')) {
      db.execSync('ALTER TABLE reminders ADD COLUMN endTime TEXT;');
      console.log('✅ Added endTime to reminders');
    }
    if (!cols.includes('reminderRules')) {
      db.execSync('ALTER TABLE reminders ADD COLUMN reminderRules TEXT;');
      console.log('✅ Added reminderRules to reminders');
    }
    if (!cols.includes('user_id')) {
      db.execSync('ALTER TABLE reminders ADD COLUMN user_id TEXT;');
      console.log('✅ Added user_id to reminders');
    }
    if (!cols.includes('synced')) {
      db.execSync('ALTER TABLE reminders ADD COLUMN synced INTEGER DEFAULT 0;');
      console.log('✅ Added synced to reminders');
    }
    if (!cols.includes('isDeleted')) {
      db.execSync('ALTER TABLE reminders ADD COLUMN isDeleted INTEGER DEFAULT 0;');
      console.log('✅ Added isDeleted to reminders');
    }
  } catch (e: any) {
    console.error('❌ Error updating reminders schema:', e.message);
  }

  // Migration: Đảm bảo bảng notifications đầy đủ các cột cần thiết
  try {
    const notifInfo = db.getAllSync("PRAGMA table_info(notifications)");
    const cols = (notifInfo as any[]).map(c => c.name);
    console.log('🔍 Current notification columns:', cols.join(', '));

    let needsUpdate = false;
    const requiredCols = ['synced', 'is_read', 'user_id', 'createdAt', 'reminder_id'];
    
    for (const col of requiredCols) {
      if (!cols.includes(col)) {
        try {
          const type = (col === 'synced' || col === 'is_read') ? 'INTEGER DEFAULT 0' : 'TEXT';
          db.execSync(`ALTER TABLE notifications ADD COLUMN ${col} ${type};`);
          console.log(`✅ Added ${col} to notifications`);
        } catch (alterError) {
          console.warn(`⚠️ Failed to alter table for ${col}, might need recreation:`, alterError);
          needsUpdate = true;
          break;
        }
      }
    }

    // Nếu vẫn thiếu createdAt mà ALTER fail, buộc phải dọn dẹp và tạo lại
    if (needsUpdate || !cols.includes('createdAt')) {
       console.log('☢️ Table notifications is incompatible. Recreating...');
       db.execSync('DROP TABLE IF EXISTS notifications;');
       db.execSync(`
         CREATE TABLE notifications (
           id TEXT PRIMARY KEY NOT NULL,
           user_id TEXT,
           reminder_id TEXT,
           type TEXT NOT NULL,
           title TEXT NOT NULL,
           body TEXT NOT NULL,
           timestamp TEXT NOT NULL,
           is_read INTEGER DEFAULT 0,
           synced INTEGER DEFAULT 0,
           createdAt TEXT NOT NULL
         );
       `);
       console.log('✅ Recreated notifications table successfully.');
    }
  } catch (e: any) {
    console.error('❌ Error updating notifications schema:', e.message);
  }

  console.log('✅ SQLite Database Initialized & Checked!');
};
