import { create } from 'zustand';
import { Reminder } from '../database/queries';
import { supabase } from '../services/supabase';
import { useAuthStore } from './useAuthStore';

// Web Store: Giao tiếp trực tiếp với Supabase thay vì thông qua SQLite + SyncService

interface ReminderState {
  reminders: Reminder[];
  loadReminders: () => Promise<void>;
  addReminder: (reminder: Reminder) => Promise<void>;
  editReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  toggleStatus: (id: string, currentStatus: number) => Promise<void>;
  updateDescription: (id: string, description: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],

  loadReminders: async () => {
    try {
      const user = useAuthStore.getState().user;
      console.log('Web loadReminders trigger for user:', user?.id);
      if (!user) {
        console.warn('Web loadReminders aborted: No current user session.');
        return;
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('isDeleted', 0); // Lọc các bản ghi chưa bị xóa

      if (error) {
        console.error('Supabase query error (loadReminders):', error.message, error.details);
        throw error;
      }
      
      console.log(`Web fetched ${data?.length || 0} reminders from Supabase.`);
      set({ reminders: data || [] });
    } catch (e) {
      console.error('Web loadReminders overall catch error:', e);
    }
  },

  addReminder: async (reminderData: Partial<Reminder> & { title: string; type: 'task' | 'event'; dueDate: string }) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        console.warn('Web addReminder aborted: No user.');
        return;
      }

      // Đảm bảo đầy đủ các trường bắt buộc của interface Reminder
      const newReminder: Reminder = {
        id: (reminderData as any).id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
        description: '',
        priority: 'medium',
        completed: 0,
        isDeleted: 0,
        reminderTime: null,
        reminderRepeat: null,
        notificationId: null,
        ...reminderData,
        user_id: user.id,
        synced: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Web adding reminder to Supabase:', newReminder.id);
      const { error } = await supabase.from('reminders').insert([newReminder]);
      if (error) {
        console.error('Supabase insert error (web):', error.message, error.details);
        throw error;
      }
      
      set({ reminders: [...get().reminders, newReminder] });
      console.log('Web reminder added successfully to local state.');
    } catch (e) {
      console.error('Web addReminder exception:', e);
    }
  },

  editReminder: async (id, updates) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;
      
      const updateData = { ...updates, updatedAt: new Date().toISOString(), synced: 1 };
      const { error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set({
        reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      });
    } catch (e) {
      console.error('Web editReminder error:', e);
    }
  },

  removeReminder: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      // Soft delete
      const { error } = await supabase
        .from('reminders')
        .update({ isDeleted: 1, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set({ reminders: get().reminders.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Web removeReminder error:', e);
    }
  },

  toggleStatus: async (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    await get().editReminder(id, { completed: newStatus });
  },

  updateDescription: async (id, description) => {
    await get().editReminder(id, { description });
  },
}));
