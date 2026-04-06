import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { useAuthStore } from './useAuthStore.web';
import { Notification } from '../database/queries';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  syncData: () => Promise<void>;
  resetStore: () => void;
  // Các hàm mobile-only để tránh lỗi import
  addNotification: (notifData: Partial<Notification>) => void;
  addNotificationsBatch: (notifDataList: Partial<Notification>[]) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ notifications: [], unreadCount: 0 });
        return;
      }

      console.log('Web loading notifications for user:', user.id);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .lte('timestamp', new Date().toISOString()) // Chỉ lấy những thông báo đã nổ (<= hiện tại)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Supabase error loading notifications:', error);
        throw error;
      }

      // Map Supabase data to local Notification interface (boolean -> number, etc.)
      const mappedNotifications: Notification[] = (data || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        reminder_id: n.reminder_id,
        type: n.type,
        title: n.title,
        body: n.body,
        timestamp: n.timestamp,
        is_read: n.is_read ? 1 : 0,
        synced: 1,
        createdAt: n.createdAt || n.created_at || new Date().toISOString()
      }));

      const unreadCount = mappedNotifications.filter(n => n.is_read === 0).length;
      
      console.log(`Web fetched ${mappedNotifications.length} notifications (${unreadCount} unread)`);
      set({ notifications: mappedNotifications, unreadCount });
    } catch (e) {
      console.error('Web loadNotifications error:', e);
    }
  },

  markAsRead: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      // Cập nhật local state
      const newNotifications = get().notifications.map(n => 
        n.id === id ? { ...n, is_read: 1 } : n
      );
      const unreadCount = newNotifications.filter(n => n.is_read === 0).length;
      set({ notifications: newNotifications, unreadCount });
    } catch (e) {
      console.error('Web markAsRead error:', e);
    }
  },

  markAllAsRead: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      const newNotifications = get().notifications.map(n => ({ ...n, is_read: 1 }));
      set({ notifications: newNotifications, unreadCount: 0 });
    } catch (e) {
      console.error('Web markAllAsRead error:', e);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      const newNotifications = get().notifications.filter(n => n.id !== id);
      const unreadCount = newNotifications.filter(n => n.is_read === 0).length;
      set({ notifications: newNotifications, unreadCount });
    } catch (e) {
      console.error('Web deleteNotification error:', e);
    }
  },

  syncData: async () => {
    // Trên Web, loadNotifications chính là đồng bộ trực tiếp
    await get().loadNotifications();
  },

  resetStore: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  // Mock functions for compatibility
  addNotification: () => {
    console.warn('addNotification is not implemented on Web. Use Supabase directly or manual refresh.');
  },
  addNotificationsBatch: () => {
    console.warn('addNotificationsBatch is not implemented on Web.');
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
