import { create } from 'zustand';
import * as Queries from '../database/queries';
import { Notification } from '../database/queries';
import { useAuthStore } from './useAuthStore';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getDeterministicNotifId } from '../utils/reminderUtils';

// Lazy getter để tránh circular dependency:
// useNotificationStore → syncService → schedulingService → notificationService → useNotificationStore
const getSyncService = () => require('../services/syncService').syncService;

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: () => void;
  addNotification: (notifData: Partial<Notification>) => void;
  addNotificationsBatch: (notifDataList: Partial<Notification>[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  syncData: () => Promise<void>;
  resetStore: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ notifications: [], unreadCount: 0 });
      return;
    }

    // Chỉ lấy 100 thông báo gần nhất đã nổ (timestamp <= now) để tối ưu hiệu năng
    const allData = Queries.getRecentNotifications(user.id, 100);
    const unread = allData.filter(n => n.is_read === 0).length;
    
    // Chỉ Log khi có sự thay đổi thực sự
    if (get().notifications?.length !== allData.length) {
      console.log(`📊 Sync: ${allData.length} records in view (${unread} unread)`);
    }
    set({ notifications: allData, unreadCount: unread });
  },

  addNotification: (notifData: Partial<Notification>) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const reminderId = notifData.reminder_id || null;
    const ts = notifData.timestamp || new Date().toISOString();
    
    // Tạo ID định danh nếu chưa có
    const finalId = notifData.id || getDeterministicNotifId(reminderId, ts) || uuidv4();

    const newNotif: Notification = {
      id: finalId,
      user_id: user.id,
      reminder_id: reminderId,
      type: notifData.type || 'reminder',
      title: notifData.title || 'Nhắc lịch',
      body: notifData.body || '',
      timestamp: ts,
      is_read: 0,
      synced: 0,
      createdAt: new Date().toISOString(),
      ...notifData,
    };

    Queries.insertNotification(newNotif);
    get().loadNotifications();

    // Đẩy lên Supabase ngay lập tức
    getSyncService().markDirty();
  },

  addNotificationsBatch: (notifDataList: Partial<Notification>[]) => {
    const user = useAuthStore.getState().user;
    if (!user || notifDataList.length === 0) return;

    for (const data of notifDataList) {
      const reminderId = data.reminder_id || null;
      const ts = data.timestamp || new Date().toISOString();
      const finalId = data.id || getDeterministicNotifId(reminderId, ts) || uuidv4();

      const newNotif: Notification = {
        id: finalId,
        user_id: user.id,
        reminder_id: reminderId,
        type: data.type || 'reminder',
        title: data.title || 'Nhắc lịch',
        body: data.body || '',
        timestamp: ts,
        is_read: 0,
        synced: 0,
        createdAt: new Date().toISOString(),
        ...data,
      };
      Queries.insertNotification(newNotif);
    }

    get().loadNotifications();
    getSyncService().markDirty();
  },

  markAsRead: (id: string) => {
    Queries.updateNotificationReadStatus(id, 1);
    get().loadNotifications();
    getSyncService().markDirty();
  },

  markAllAsRead: () => {
    const { notifications } = get();
    notifications.forEach(n => {
      if (n.is_read === 0) {
        Queries.updateNotificationReadStatus(n.id, 1);
      }
    });
    get().loadNotifications();
    getSyncService().markDirty();
  },

  deleteNotification: (id: string) => {
    // Chuyển sang Xóa mềm (Soft Delete) để Sync Service có thể xóa trên Supabase
    const db = require('../database/index').getDB();
    db.runSync('UPDATE notifications SET isDeleted = 1, synced = 0 WHERE id = ?', [id]);
    get().loadNotifications();
    getSyncService().markDirty();
  },

  syncData: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    // Đang đồng bộ, không cần làm gì thêm
    console.log('🔄 Notification Store: Starting Sync...');
    await getSyncService().performFullSync(user.id, true);
    
    // Sau khi đồng bộ xong từ Cloud, load lại dữ liệu vào Store để cập nhật UI
    get().loadNotifications();
    console.log('✅ Notification Store: Sync & Reload Complete!');
  },

  resetStore: () => {
    set({ notifications: [], unreadCount: 0 });
  }
}));

// Đăng ký theo dõi User để load data
useAuthStore.subscribe((state) => {
  if (state.isAuthenticated && state.user) {
    useNotificationStore.getState().loadNotifications();
  } else {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  }
});

// Đăng ký listener để tự động load lại data khi syncService cập nhật dữ liệu từ server
// Dùng setTimeout(0) để đảm bảo tất cả modules đã được khởi tạo xong trước khi đăng ký
setTimeout(() => {
  getSyncService().addListener(() => {
    useNotificationStore.getState().loadNotifications();
  });
}, 0);
