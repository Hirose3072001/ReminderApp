import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { getDB } from '../database/index';
import { Reminder, upsertReminder, insertReminder } from '../database/queries';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = 'last_supabase_sync_time';
const SYNC_THROTTLE_MS = 2 * 60 * 1000; // 2 phút

export const syncService = {
  lastSyncExecutionTime: 0,

  /**
   * Đẩy các thay đổi từ máy local lên Supabase
   */
  pushLocalChanges: async function() {
    const session = useAuthStore.getState().session;
    if (!session?.user) return;

    const db = getDB();
    const userId = session.user.id;

    // 1. Lấy tất cả bản ghi của user hiện tại chưa đồng bộ
    const unsynced = db.getAllSync('SELECT * FROM reminders WHERE user_id = ? AND synced = 0', [userId]) as Reminder[];

    for (const item of unsynced) {
      try {
        if (item.isDeleted === 1) {
          // Xóa trên Supabase
          const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('id', item.id)
            .eq('user_id', userId);

          if (!error) {
            // Xóa vĩnh viễn dưới local sau khi đã xóa trên cloud
            db.runSync('DELETE FROM reminders WHERE id = ?', [item.id]);
          }
        } else {
          // Chỉ lấy các trường có trong schema Supabase
          const supabaseData = {
            id: item.id,
            user_id: userId,
            type: item.type,
            title: item.title,
            description: item.description,
            priority: item.priority,
            dueDate: item.dueDate,
            endTime: item.endTime || null,
            completed: item.completed,
            reminderTime: item.reminderTime || null,
            reminderRepeat: item.reminderRepeat || null,
            notificationId: item.notificationId || null,
            reminderRules: item.reminderRules || null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          };
          
          const { error } = await supabase
            .from('reminders')
            .upsert(supabaseData);

          if (!error) {
            // Cập nhật trạng thái synced dưới local
            db.runSync('UPDATE reminders SET synced = 1, user_id = ? WHERE id = ?', [userId, item.id]);
          }
        }
      } catch (err) {
        console.error('Failed to push item:', item.id, err);
      }
    }
  },

  /**
   * Tải các thay đổi từ Supabase về máy local
   */
  pullRemoteChanges: async function() {
    const session = useAuthStore.getState().session;
    if (!session?.user) return;

    const userId = session.user.id;
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId);
    
    if (lastSync) {
      query = query.gt('updatedAt', lastSync);
    }

    const { data: remoteData, error } = await query;

    if (error) {
      console.error('Pull error:', error);
      return;
    }

    if (remoteData && remoteData.length > 0) {
      const db = getDB();
      for (const remoteItem of remoteData) {
        const localItem = db.getFirstSync('SELECT updatedAt FROM reminders WHERE id = ?', [remoteItem.id]) as { updatedAt: string } | null;
        
        if (!localItem || new Date(remoteItem.updatedAt) > new Date(localItem.updatedAt)) {
            const itemToSave = { ...remoteItem, synced: 1, isDeleted: 0 };
            const existing = db.getFirstSync('SELECT id FROM reminders WHERE id = ?', [itemToSave.id]);
            if (existing) {
              db.runSync(
                `UPDATE reminders SET user_id=?, type=?, title=?, description=?, priority=?, dueDate=?, endTime=?, completed=?, reminderTime=?, reminderRepeat=?, notificationId=?, reminderRules=?, synced=1, updatedAt=?
                 WHERE id=?`,
                [
                  itemToSave.user_id, itemToSave.type, itemToSave.title, itemToSave.description, itemToSave.priority,
                  itemToSave.dueDate, itemToSave.endTime || null, itemToSave.completed,
                  itemToSave.reminderTime || null, itemToSave.reminderRepeat || null,
                  itemToSave.notificationId || null, itemToSave.reminderRules || null, itemToSave.updatedAt, itemToSave.id
                ]
              );
            } else {
              db.runSync(
                `INSERT INTO reminders (id, user_id, type, title, description, priority, dueDate, endTime, completed, reminderTime, reminderRepeat, notificationId, reminderRules, synced, isDeleted, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  itemToSave.id, itemToSave.user_id, itemToSave.type, itemToSave.title, itemToSave.description, itemToSave.priority,
                  itemToSave.dueDate, itemToSave.endTime || null, itemToSave.completed, itemToSave.reminderTime, itemToSave.reminderRepeat, 
                  itemToSave.notificationId, itemToSave.reminderRules || null, 1, 0, itemToSave.createdAt, itemToSave.updatedAt
                ]
              );
            }
        }
      }
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  },

  /**
   * Thực hiện đồng bộ 2 chiều
   */
  performFullSync: async function(userId?: string) {
    const now = Date.now();
    if (now - this.lastSyncExecutionTime < SYNC_THROTTLE_MS) {
      console.log('⏳ Sync Throttled: Vừa mới đồng bộ cách đây ít giây.');
      return;
    }

    this.lastSyncExecutionTime = now;
    console.log('🔄 Starting Sync with Supabase...');
    try {
      await this.pushLocalChanges();
      await this.pullRemoteChanges();
      console.log('✅ Sync Completed!');
    } catch (error) {
      console.error('❌ Sync Failed:', error);
    }
  }
};
