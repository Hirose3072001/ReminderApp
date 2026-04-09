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
  isExecuting: false,                 // Khóa đồng bộ toàn phần để tránh đệ quy
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
    // if (__DEV__) console.log('📝 Local change marked');
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

      if (unsynced.length > 0) {
        // console.log(`📤 Pushing ${unsynced.length} unsynced reminders...`);
        for (const item of unsynced) {
          try {
            if (item.isDeleted === 1) {
              const { error } = await supabase
                .from('reminders')
                .delete()
                .eq('id', item.id)
                .eq('user_id', userId);

              if (!error) {
                db.runSync('DELETE FROM reminders WHERE id = ?', [item.id]);
              }
            } else {
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
              
              const { error } = await supabase.from('reminders').upsert(supabaseData);
              if (!error) {
                db.runSync('UPDATE reminders SET synced = 1, user_id = ? WHERE id = ?', [userId, item.id]);
              }
            }
          } catch (err) {
            console.error('Failed to push item:', item.id, err);
          }
        }
      }

      // 2. Lấy các thông báo chưa đồng bộ
      const unsyncedNotifs = db.getAllSync('SELECT * FROM notifications WHERE user_id = ? AND synced = 0', [userId]) as Notification[];
      if (unsyncedNotifs.length > 0) {
        // console.log(`📤 Pushing ${unsyncedNotifs.length} unsynced notifications...`);
        for (const notif of unsyncedNotifs) {
          try {
            if (notif.isDeleted === 1) {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notif.id)
                .eq('user_id', userId);

              if (!error) {
                db.runSync('DELETE FROM notifications WHERE id = ?', [notif.id]);
              }
            } else {
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
            }
          } catch (err) {
            console.error('Failed to push notification:', notif.id, err);
          }
        }
      }

      // 3. Đẩy Profile nếu có thay đổi (Dirty)
      const authStore = getAuthStore();
      const currentProfile = authStore.getState().profile;
      const isProfileDirty = authStore.getState().profileDirty;

      if (isProfileDirty && currentProfile) {
        // console.log('📤 Pushing profile changes...');
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              ...currentProfile,
              updated_at: new Date().toISOString()
            });

          if (!error) {
            authStore.setState({ profileDirty: false });
            // console.log('✅ Profile pushed successfully');
          } else {
            console.error('❌ Failed to push profile:', error);
          }
        } catch (err) {
          console.error('❌ Profile push error:', err);
        }
      }

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
      const db = getDB();
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

      // 1. Tải Reminders
      let query = supabase.from('reminders').select('*').eq('user_id', userId);
      if (lastSync) query = query.gt('updatedAt', lastSync);

      const { data: remoteData, error } = await query;
      if (error) {
        console.error('Pull reminders error:', error);
      } else if (remoteData && remoteData.length > 0) {
        // console.log(`📥 Pulled ${remoteData.length} remote reminders`);
        
        // SỬ DỤNG TRANSACTION CHO BULK UPSERT
        db.withTransactionSync(() => {
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
                
                // Lên lịch thông báo (ngoài transaction để tránh block lâu, nhưng handleScheduling thường là async/native)
                if (itemToSave.reminderRules && itemToSave.completed !== 1) {
                  handleScheduling(itemToSave as any).catch(console.error);
                }
            }
          }
        });
      }

      // 2. Tải Notifications
      // FETCH 1: History (đã xảy ra) - Lấy 150 cái gần nhất
      const { data: historyNotifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .lte('timestamp', new Date().toISOString())
        .order('timestamp', { ascending: false })
        .limit(150);

      // FETCH 2: Upcoming (tương lai) - Lấy 150 cái sắp tới
      const { data: upcomingNotifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .gt('timestamp', new Date().toISOString())
        .order('timestamp', { ascending: true })
        .limit(150);

      const remoteNotifs = [...(historyNotifs || []), ...(upcomingNotifs || [])];

      if (remoteNotifs.length > 0) {
        // console.log(`📥 Pulled ${remoteNotifs.length} remote notifications`);
        
        // SỬ DỤNG TRANSACTION CHO BULK NOTIFICATIONS
        db.withTransactionSync(() => {
          for (const remoteNotif of remoteNotifs) {
            db.runSync(
              `INSERT OR REPLACE INTO notifications (id, user_id, reminder_id, type, title, body, timestamp, is_read, synced, isDeleted, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                remoteNotif.id, remoteNotif.user_id, remoteNotif.reminder_id, remoteNotif.type,
                remoteNotif.title, remoteNotif.body, remoteNotif.timestamp,
                remoteNotif.is_read ? 1 : 0, 1, 0, remoteNotif.created_at
              ]
            );
          }
        });
      }

      // 3. Tải Invitations (Pending)
      const userEmail = session.user.email;
      if (userEmail) {
        const { data: pendingInvs } = await supabase
          .from('invitations')
          .select('*')
          .eq('receiver_email', userEmail)
          .eq('status', 'pending');
          
        if (pendingInvs && pendingInvs.length > 0) {
          const { useNotificationStore } = require('../store/useNotificationStore');
          for (const inv of pendingInvs) {
            const existing = db.getFirstSync('SELECT id FROM notifications WHERE id = ?', [`inv-${inv.id}`]);
            if (!existing) {
               useNotificationStore.getState().addNotification({
                  type: 'invitation',
                  title: 'Lời mời tham gia công việc',
                  body: `Bạn được mời tham gia: "${inv.reminder_data?.title || 'Công việc'}" bởi ${inv.sender_id}`,
                  reminder_id: inv.reminder_id,
                  id: `inv-${inv.id}`, 
                  timestamp: inv.created_at || new Date().toISOString()
               });
            }
          }
        }
      }

      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } finally {
      this.isPulling = false;
    }
  },

  /**
   * Tự động dọn dẹp dữ liệu cũ (Policy 7 ngày)
   */
  performAutoCleanup: function(userId: string) {
    const db = getDB();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`🧹 Running auto-cleanup (Policy 7 days) before ${sevenDaysAgo}`);
    
    try {
      db.withTransactionSync(() => {
        // 1. Đánh dấu xóa các thông báo quá 7 ngày
        const notifResult = db.runSync(
          'UPDATE notifications SET isDeleted = 1, synced = 0 WHERE timestamp < ? AND isDeleted = 0 AND user_id = ?',
          [sevenDaysAgo, userId]
        );
        if (notifResult.changes > 0) console.log(`🧹 Cleanup: Marked ${notifResult.changes} old notifications for deletion`);

        // 2. Đánh dấu xóa các reminders quá 7 ngày (kết thúc hoặc quá hạn)
        const reminderResult = db.runSync(
          `UPDATE reminders 
           SET isDeleted = 1, synced = 0 
           WHERE (
             (endTime IS NOT NULL AND endTime < ?) OR 
             (endTime IS NULL AND dueDate < ?)
           ) 
           AND isDeleted = 0 AND user_id = ?`,
          [sevenDaysAgo, sevenDaysAgo, userId]
        );
        if (reminderResult.changes > 0) console.log(`🧹 Cleanup: Marked ${reminderResult.changes} old reminders for deletion`);
      });
    } catch (err) {
      console.error('❌ Auto-cleanup failed:', err);
    }
  },

  /**
   * Thực hiện đồng bộ 2 chiều
   */
  performFullSync: async function(userId?: string, ignoreThrottle: boolean = false) {
    if (this.isExecuting) {
      return;
    }

    const now = Date.now();
    if (!ignoreThrottle && (now - this.lastSyncExecutionTime < SYNC_THROTTLE_MS)) {
      return;
    }

    const authStore = getAuthStore();
    const session = authStore.getState().session;
    if (!session?.user) return;

    this.isExecuting = true;
    this.lastSyncExecutionTime = now;
    console.log('🔄 Starting Full Sync Cycle...');
    
    // Bật trạng thái syncing để UI hiển thị màn hình load
    authStore.getState().setSyncing(true);

    try {
      // BƯỚC 0: Tự động dọn dẹp dữ liệu cũ trước khi sync để giảm tải
      this.performAutoCleanup(session.user.id);
      
      // BƯỚC 1: Đẩy thay đổi local (bao gồm cả lệnh xóa từ cleanup) lên cloud
      await this.pushLocalChanges();
      
      // BƯỚC 2: Tải dữ liệu mới từ cloud về
      await this.pullRemoteChanges();
      
      this.notifyListeners();
      console.log('✅ Sync Completed Successfully!');
    } catch (error) {
      console.error('❌ Sync Failed:', error);
    } finally {
      // Tắt trạng thái syncing
      const state = authStore.getState();
      state.setSyncing(false);
      state.setInitialSync(false);
      this.isExecuting = false;
    }
  },

  /**
   * Bắt đầu lắng nghe thay đổi thời gian thực
   */
  startRealtimeSync: function(userId: string) {
    if (this.realtimeChannel) return;

    console.log('📡 Starting Realtime Sync for user:', userId);
    
    this.realtimeChannel = supabase
      .channel(`sync-all-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const db = getDB();
          if (payload.eventType === 'DELETE') {
            db.runSync('DELETE FROM reminders WHERE id = ?', [payload.old.id]);
          } else {
            const item = payload.new as any;
            const existing = db.getFirstSync('SELECT updatedAt FROM reminders WHERE id = ?', [item.id]) as { updatedAt: string } | null;
            if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              db.runSync(
                `INSERT OR REPLACE INTO reminders (id, user_id, type, title, description, priority, dueDate, endTime, completed, reminderTime, reminderRepeat, notificationId, reminderRules, synced, isDeleted, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  item.id, item.user_id, item.type, item.title, item.description, item.priority,
                  item.dueDate, item.endTime || null, item.completed, item.reminderTime, item.reminderRepeat, 
                  item.notificationId, item.reminderRules || null, 1, 0, item.createdAt, item.updatedAt
                ]
              );
              if (item.reminderRules && item.completed !== 1) {
                handleScheduling(item as any).catch(console.error);
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
          const db = getDB();
          if (payload.eventType === 'DELETE') {
            db.runSync('DELETE FROM notifications WHERE id = ?', [payload.old.id]);
          } else {
            const notif = payload.new as any;
            db.runSync(
              `INSERT OR REPLACE INTO notifications (id, user_id, reminder_id, type, title, body, timestamp, is_read, synced, isDeleted, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                notif.id, notif.user_id, notif.reminder_id, notif.type,
                notif.title, notif.body, notif.timestamp,
                notif.is_read ? 1 : 0, 1, 0, notif.created_at
              ]
            );
          }
          this.notifyListeners();
        }
      )
      .subscribe();
  },

  /**
   * Dừng lắng nghe thời gian thực
   */
  stopRealtimeSync: function() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
  },

  /**
   * Tự động dọn dẹp các thông báo "mồ côi"
   */
  cleanupOrphanLocalNotifications: function() {
    const db = getDB();
    try {
      db.runSync(
        `DELETE FROM notifications 
         WHERE reminder_id IS NOT NULL 
         AND reminder_id NOT IN (SELECT id FROM reminders)`
      );
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

// --- AUTO ENGINES ---
let lastBoundUserId: string | null = null;
setTimeout(() => {
  try {
    const authStore = getAuthStore();
    authStore.subscribe((state: { session: any }) => {
      const currentUserId = state.session?.user?.id;
      if (currentUserId && currentUserId !== lastBoundUserId) {
        lastBoundUserId = currentUserId;
        syncService.startRealtimeSync(currentUserId);
        syncService.performFullSync(currentUserId, true).catch(console.error);
        syncService.startAutoSync();
      } else if (!currentUserId && lastBoundUserId) {
        lastBoundUserId = null;
        syncService.stopAutoSync();
        syncService.stopRealtimeSync();
      }
    });

    const initialSession = authStore.getState().session;
    if (initialSession?.user?.id) {
       lastBoundUserId = initialSession.user.id;
       syncService.startRealtimeSync(lastBoundUserId!);
       syncService.startAutoSync();
    }
  } catch (err) {
    console.error('❌ Sync Service store binding error:', err);
  }
}, 0);

