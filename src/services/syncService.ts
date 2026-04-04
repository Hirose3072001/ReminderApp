import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getDB } from '../database/index';
import { Reminder, upsertReminder, insertReminder, Notification } from '../database/queries';
import { handleScheduling } from './schedulingService';

// Lazy getter để tránh circular dependency: syncService ↔ useAuthStore
const getAuthStore = () => require('../store/useAuthStore').useAuthStore;

const LAST_SYNC_KEY = 'last_supabase_sync_time';
const SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 phút
const AUTO_PUSH_INTERVAL_MS = 5 * 60 * 1000; // Đẩy lên cloud mỗi 5 phút

export const syncService = {
  lastSyncExecutionTime: 0,
  realtimeChannel: null as RealtimeChannel | null,
  syncListeners: [] as (() => void)[],
  hasPendingChanges: false,           // Có dữ liệu local chưa đẩy lên cloud
  isPushing: false,                   // Trạng thái đang đẩy dữ liệu
  isPulling: false,                   // Trạng thái đang tải dữ liệu
  autoSyncTimer: null as ReturnType<typeof setInterval> | null,

  /**
   * Đăng ký listener để thông báo khi dữ liệu thay đổi (để UI store reload)
   */
  addListener: function(cb: () => void) {
    if (!this.syncListeners.includes(cb)) {
      this.syncListeners.push(cb);
    }
  },

  /**
   * Thông báo cho các store load lại data
   */
  notifyListeners: function() {
    this.syncListeners.forEach(cb => cb());
  },

  /**
   * Đánh dấu có thay đổi chưa đồng bộ (gọi sau mỗi write local).
   * Dữ liệu sẽ được tự động đẩy lên cloud sau tối đa 5 phút.
   */
  markDirty: function() {
    this.hasPendingChanges = true;
    console.log('📝 Local change marked — will sync in next 5-min cycle');
  },

  /**
   * Khởi động bộ đếm tự động đồng bộ (Push & Pull) mỗi 5 phút.
   * Gọi một lần khi user login.
   */
  startAutoSync: function() {
    if (this.autoSyncTimer) return; // Đã chạy rồi
    console.log('⏱️ Auto-sync timer started (every 5 minutes)');
    this.autoSyncTimer = setInterval(async () => {
      const session = getAuthStore().getState().session;
      if (!session?.user) return;

      // Đồng bộ 2 chiều định kỳ
      console.log('⏱️ 5-min timer: periodic full sync with Supabase...');
      await this.performFullSync(session.user.id, true);
    }, AUTO_PUSH_INTERVAL_MS);
  },

  /**
   * Dừng bộ đếm (khi logout).
   */
  stopAutoSync: function() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('⏱️ Auto-sync timer stopped');
    }
  },

  /**
   * Đẩy các thay đổi từ máy local lên Supabase
   */
  pushLocalChanges: async function() {
    if (this.isPushing) {
      console.log('⏳ pushLocalChanges: Already in progress, skipping...');
      return;
    }
    
    const session = getAuthStore().getState().session;
    if (!session?.user) return;

    this.isPushing = true;
    try {
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

    // 2. Lấy các thông báo chưa đồng bộ
    const unsyncedNotifs = db.getAllSync('SELECT * FROM notifications WHERE user_id = ? AND synced = 0', [userId]) as Notification[];
    for (const notif of unsyncedNotifs) {
      try {
        const supabaseNotif = {
          id: notif.id,
          user_id: userId,
          reminder_id: notif.reminder_id || null,
          type: notif.type,
          title: notif.title,
          body: notif.body,
          timestamp: notif.timestamp,
          is_read: notif.is_read === 1,
          created_at: notif.createdAt
        };

        const { error } = await supabase.from('notifications').upsert(supabaseNotif);
        if (!error) {
          db.runSync('UPDATE notifications SET synced = 1 WHERE id = ?', [notif.id]);
        }
      } catch (err) {
        console.error('Failed to push notification:', notif.id, err);
      }
    }

    // Sau khi push hết, reset flag dirty
    this.hasPendingChanges = false;
    } finally {
      this.isPushing = false;
    }
  },

  /**
   * Tải các thay đổi từ Supabase về máy local
   */
  pullRemoteChanges: async function() {
    if (this.isPulling) {
      console.log('⏳ pullRemoteChanges: Already in progress, skipping...');
      return;
    }

    const session = getAuthStore().getState().session;
    if (!session?.user) return;

    this.isPulling = true;
    try {
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
            // Lên lịch thông báo cho nhắc nhở vừa tải về từ cloud
            if (itemToSave.reminderRules && itemToSave.completed !== 1) {
              const reminderForScheduling: Reminder = {
                ...itemToSave,
                user_id: itemToSave.user_id,
                type: itemToSave.type as 'task' | 'event',
                description: itemToSave.description || '',
                priority: itemToSave.priority as 'high' | 'medium' | 'low',
                reminderTime: itemToSave.reminderTime || null,
                reminderRepeat: itemToSave.reminderRepeat || null,
                notificationId: itemToSave.notificationId || null,
                synced: 1,
                isDeleted: 0,
                createdAt: itemToSave.createdAt,
                updatedAt: itemToSave.updatedAt,
              };
              handleScheduling(reminderForScheduling).catch(console.error);
            }
        }
      }
    }

    // 2. Tải thông báo mới từ Supabase
    console.log('📥 Pulling notifications for user:', userId);
    
    // FETCH 1: History (đã xảy ra) - Lấy 150 cái gần nhất để đảm bảo có lịch sử
    const { data: historyNotifs, error: historyError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .lte('timestamp', new Date().toISOString())
      .order('timestamp', { ascending: false })
      .limit(150);

    // FETCH 2: Upcoming (tương lai) - Lấy 150 cái sắp tới để đồng bộ trạng thái read/unread
    const { data: upcomingNotifs, error: upcomingError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .gt('timestamp', new Date().toISOString())
      .order('timestamp', { ascending: true })
      .limit(150);

    if (historyError || upcomingError) {
      console.error('❌ Error pulling notifications:', historyError || upcomingError);
    }

    const remoteNotifs = [...(historyNotifs || []), ...(upcomingNotifs || [])];

    if (remoteNotifs.length > 0) {
      console.log(`📥 Fetched total ${remoteNotifs.length} notifications (${historyNotifs?.length || 0} history, ${upcomingNotifs?.length || 0} upcoming)`);
      const db = getDB();
      let insertCount = 0;
      for (const remoteNotif of remoteNotifs) {
        try {
          db.runSync(
            `INSERT OR REPLACE INTO notifications (id, user_id, reminder_id, type, title, body, timestamp, is_read, synced, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              remoteNotif.id, remoteNotif.user_id, remoteNotif.reminder_id, remoteNotif.type,
              remoteNotif.title, remoteNotif.body, remoteNotif.timestamp,
              remoteNotif.is_read ? 1 : 0, 1, remoteNotif.created_at
            ]
          );
          insertCount++;
        } catch (e) {
          console.error('❌ Failed to insert notification:', remoteNotif.id, e);
        }
      }
      console.log(`✅ Saved ${insertCount} notifications to local SQLite`);
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } finally {
      this.isPulling = false;
    }
  },

  /**
   * Thực hiện đồng bộ 2 chiều
   */
  performFullSync: async function(userId?: string, ignoreThrottle: boolean = false) {
    const now = Date.now();
    if (!ignoreThrottle && (now - this.lastSyncExecutionTime < SYNC_THROTTLE_MS)) {
      console.log('⏳ Sync Throttled: Vừa mới đồng bộ cách đây ít giây.');
      return;
    }

    this.lastSyncExecutionTime = now;
    console.log('🔄 Starting Sync with Supabase...');
    try {
      await this.pushLocalChanges();
      await this.pullRemoteChanges();
      this.notifyListeners();
      console.log('✅ Sync Completed!');
    } catch (error) {
      console.error('❌ Sync Failed:', error);
    }
  },

  /**
   * Bắt đầu lắng nghe thay đổi thời gian thực
   */
  startRealtimeSync: function(userId: string) {
    if (this.realtimeChannel) {
      console.log('⚠️ Realtime sync already active');
      return;
    }

    console.log('📡 Starting Realtime Sync for user:', userId);
    
    this.realtimeChannel = supabase
      .channel(`sync-all-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${userId}` },
        async (payload) => {
          console.log('🔔 Realtime: Reminders changed', payload.eventType);
          const db = getDB();
          
          if (payload.eventType === 'DELETE') {
            db.runSync('DELETE FROM reminders WHERE id = ?', [payload.old.id]);
          } else {
            // INSERT or UPDATE
            const item = payload.new as any;
            const existing = db.getFirstSync('SELECT updatedAt FROM reminders WHERE id = ?', [item.id]) as { updatedAt: string } | null;
            
            if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              console.log('✨ Realtime: Updating reminder', item.id);
              db.runSync(
                `INSERT OR REPLACE INTO reminders (id, user_id, type, title, description, priority, dueDate, endTime, completed, reminderTime, reminderRepeat, notificationId, reminderRules, synced, isDeleted, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  item.id, item.user_id, item.type, item.title, item.description, item.priority,
                  item.dueDate, item.endTime || null, item.completed, item.reminderTime, item.reminderRepeat, 
                  item.notificationId, item.reminderRules || null, 1, 0, item.createdAt, item.updatedAt
                ]
              );
              // Lên lịch thông báo cho nhắc nhở vừa nhận từ Realtime
              if (item.reminderRules && item.completed !== 1) {
                const reminderForScheduling: Reminder = {
                  ...item,
                  type: item.type as 'task' | 'event',
                  description: item.description || '',
                  priority: item.priority as 'high' | 'medium' | 'low',
                  reminderTime: item.reminderTime || null,
                  reminderRepeat: item.reminderRepeat || null,
                  notificationId: item.notificationId || null,
                  synced: 1,
                  isDeleted: 0,
                };
                handleScheduling(reminderForScheduling).catch(console.error);
              }
            }
          }
          this.notifyListeners();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          console.log('🔔 Realtime: Notifications changed', payload.eventType);
          const db = getDB();
          
          if (payload.eventType === 'DELETE') {
            db.runSync('DELETE FROM notifications WHERE id = ?', [payload.old.id]);
          } else {
            const notif = payload.new as any;
            const existing = db.getFirstSync('SELECT id FROM notifications WHERE id = ?', [notif.id]);
            if (!existing) {
              console.log('✨ Realtime: Adding new notification', notif.id);
              db.runSync(
                `INSERT OR REPLACE INTO notifications (id, user_id, reminder_id, type, title, body, timestamp, is_read, synced, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  notif.id, notif.user_id, notif.reminder_id, notif.type,
                  notif.title, notif.body, notif.timestamp,
                  notif.is_read ? 1 : 0, 1, notif.created_at
                ]
              );
            }
          }
          this.notifyListeners();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime Status:', status);
      });
  },

  /**
   * Dừng lắng nghe thời gian thực
   */
  stopRealtimeSync: function() {
    if (this.realtimeChannel) {
      console.log('📡 Stopping Realtime Sync');
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
  },

  /**
   * Tự động dọn dẹp các thông báo "mồ côi" (không còn nhắc nhở tương ứng)
   */
  cleanupOrphanLocalNotifications: function() {
    const db = getDB();
    try {
      const result = db.runSync(
        `DELETE FROM notifications 
         WHERE reminder_id IS NOT NULL 
         AND reminder_id NOT IN (SELECT id FROM reminders)`
      );
      console.log('🧹 Cleanup: Removed orphan notifications');
      this.notifyListeners();
    } catch (err) {
      console.error('Cleanup orphans error:', err);
    }
  },

  /**
   * Xóa metadata đồng bộ (khi logout)
   */
  clearSyncMetadata: async function() {
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    this.lastSyncExecutionTime = 0;
  }
};

// --- AUTO ENGINES (Đồng bộ hóa tự động) ---
// Tự lắng nghe AuthStore để quyết định khi nào chạy đồng bộ
let lastBoundUserId: string | null = null;

// Chạy một lần để đăng ký listener sau khi module đã khởi tạo xong
setTimeout(() => {
  try {
    const authStore = getAuthStore();
    
    // Đăng ký lắng nghe thay đổi trạng thái user
    authStore.subscribe((state: { session: any }) => {
      const currentUserId = state.session?.user?.id;
      
      if (currentUserId && currentUserId !== lastBoundUserId) {
        // TRƯỜNG HỢP 1: Mới đăng nhập (hoặc app mới mở có session)
        console.log('🔄 Sync Service: User session detected, initializing sync rules...');
        lastBoundUserId = currentUserId;
        
        // Đồng bộ full ngay lập tức khi vào phiên mới
        syncService.performFullSync(currentUserId, true).catch(console.error);
        
        // Kích hoạt bộ đếm 5 phút
        syncService.startAutoSync();
      } else if (!currentUserId && lastBoundUserId) {
        // TRƯỜNG HỢP 2: Đã đăng xuất
        console.log('🔄 Sync Service: Session cleared, stopping sync engines...');
        lastBoundUserId = null;
        syncService.stopAutoSync();
      }
    });

    // Check ban đầu nếu đã có session sẵn (rehydrated) thì start luôn
    const initialSession = authStore.getState().session;
    if (initialSession?.user?.id) {
       lastBoundUserId = initialSession.user.id;
       syncService.startAutoSync();
    }
  } catch (err) {
    console.error('❌ Sync Service: Failed to bind to AuthStore:', err);
  }
}, 0);

