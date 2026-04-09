import { create } from 'zustand';
import * as Queries from '../database/queries';
import { Reminder } from '../database/queries';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { cancelTaskNotifications } from '../services/notificationService';
import { useAuthStore } from './useAuthStore';
import { syncService } from '../services/syncService';
import { handleScheduling } from '../services/schedulingService';

interface ReminderState {
  reminders: Reminder[];
  loadReminders: () => void;
  addReminder: (reminderData: Partial<Reminder> & { title: string; type: 'task' | 'event'; dueDate: string }) => void;
  toggleStatus: (id: string, currentStatus: number) => void;
  updateDescription: (id: string, description: string) => void;
  removeReminder: (id: string) => void;
  editReminder: (id: string, reminderData: Partial<Reminder>) => void;
  syncData: () => Promise<void>;
  resetStore: () => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],

  loadReminders: () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ reminders: [] });
      return;
    }
    const data = Queries.getAllReminders(user.id);
    set({ reminders: data });
  },

  addReminder: async (reminderData) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const defaultRules = reminderData.type === 'event' 
      ? JSON.stringify([{ id: '1', timing: 'Khi bắt đầu', amount: '0', unit: 'Phút', timeSlots: [] }])
      : JSON.stringify([{ id: '1', timing: 'Khi kết thúc', amount: '0', unit: 'Phút', timeSlots: [] }]);

    const newReminder: Reminder = {
      description: '',
      priority: 'medium',
      reminderTime: null,
      reminderRepeat: null,
      notificationId: null,
      reminderRules: defaultRules,
      ...reminderData,
      id: reminderData.id || uuidv4(),
      user_id: user.id,
      completed: 0,
      synced: 0,
      isDeleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      Queries.insertReminder(newReminder);
      get().loadReminders();
      syncService.markDirty(); // Đánh dấu dirty, sẽ tự push sau 5 phút
      
      // Hẹn lịch thông báo ở background để không block UI lưu
      handleScheduling(newReminder).catch(e => console.error('❌ Background Scheduling Error:', e));
    } catch (e) {
      console.error('❌ Error adding reminder:', e);
    }
  },

  toggleStatus: (id, currentStatus) => {
    const newStatus = currentStatus === 0 ? 1 : 0;
    Queries.updateReminderStatus(id, newStatus);
    if (newStatus === 1) {
      cancelTaskNotifications(id);
    }
    get().loadReminders();
    syncService.markDirty();
  },

  updateDescription: (id, description) => {
    Queries.updateReminderDescription(id, description);
    get().loadReminders();
    syncService.markDirty();
  },

  removeReminder: (id) => {
    Queries.deleteReminder(id);
    cancelTaskNotifications(id);
    get().loadReminders();
    syncService.markDirty();
  },

  editReminder: async (id, data) => {
    try {
      Queries.updateReminder(id, data);
      get().loadReminders();
      syncService.markDirty();

      const user = useAuthStore.getState().user;
      if (user) {
        const all = Queries.getAllReminders(user.id);
        const updated = all.find(r => r.id === id);
        if (updated) {
          // Hẹn lịch lại ở background
          handleScheduling(updated).catch(e => console.error('❌ Background Rescheduling Error:', e));
        }
      }
    } catch (e) {
      console.error('❌ Error editing reminder:', e);
    }
  },

  syncData: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    await syncService.performFullSync(user.id);
    get().loadReminders();
  },

  resetStore: () => {
    set({ reminders: [] });
  }
}));

// Tự động load/clear khi user thay đổi
let lastSyncUserId: string | null = null;
useAuthStore.subscribe((state) => {
  const currentUserId = state.user?.id;
  if (state.isAuthenticated && currentUserId) {
    if (currentUserId !== lastSyncUserId) {
      lastSyncUserId = currentUserId;
      useReminderStore.getState().loadReminders();
      syncService.performFullSync(currentUserId, true).catch(console.error); // Luôn kéo data mới khi login (ignore throttle)
    }
  } else {
    if (lastSyncUserId !== null) {
      lastSyncUserId = null;
      useReminderStore.setState({ reminders: [] });
    }
  }
});

// Lắng nghe sự kiện sync thành công để cập nhật lại UI
setTimeout(() => {
  syncService.addListener(() => {
    useReminderStore.getState().loadReminders();
  });
}, 0);
