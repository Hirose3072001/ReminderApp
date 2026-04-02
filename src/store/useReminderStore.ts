import { create } from 'zustand';
import * as Queries from '../database/queries';
import { Reminder } from '../database/queries';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { cancelTaskNotifications } from '../services/notificationService';
import { useAuthStore } from './useAuthStore';
import { syncService } from '../services/syncService';

interface ReminderState {
  reminders: Reminder[];
  loadReminders: () => void;
  addReminder: (reminderData: Partial<Reminder> & { title: string; type: 'task' | 'event'; dueDate: string }) => void;
  toggleStatus: (id: string, currentStatus: number) => void;
  updateDescription: (id: string, description: string) => void;
  removeReminder: (id: string) => void;
  editReminder: (id: string, reminderData: Partial<Reminder>) => void;
  syncData: () => Promise<void>;
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

  addReminder: (reminderData: Partial<Reminder> & { title: string; type: 'task' | 'event'; dueDate: string }) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const newReminder: Reminder = {
      description: '',
      priority: 'medium',
      reminderTime: null,
      reminderRepeat: null,
      notificationId: null,
      ...reminderData,
      id: reminderData.id || uuidv4(),
      user_id: user.id,
      completed: 0,
      synced: 0,
      isDeleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    Queries.insertReminder(newReminder);
    get().loadReminders();
    
    syncService.pushLocalChanges();
  },

  toggleStatus: (id, currentStatus) => {
    const newStatus = currentStatus === 0 ? 1 : 0;
    Queries.updateReminderStatus(id, newStatus);
    get().loadReminders();
    syncService.pushLocalChanges();
  },

  updateDescription: (id, description) => {
    Queries.updateReminderDescription(id, description);
    get().loadReminders();
    syncService.pushLocalChanges();
  },

  removeReminder: (id) => {
    Queries.deleteReminder(id);
    cancelTaskNotifications(id);
    get().loadReminders();
    syncService.pushLocalChanges();
  },
  
  editReminder: (id, data) => {
    Queries.updateReminder(id, data);
    get().loadReminders();
    syncService.pushLocalChanges();
  },

  syncData: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    await syncService.performFullSync(user.id);
    get().loadReminders();
  }
}));

// Tự động load/clear khi user thay đổi
useAuthStore.subscribe((state) => {
  if (state.isAuthenticated && state.user) {
    useReminderStore.getState().loadReminders();
    // Đồng bộ ngay khi login
    syncService.performFullSync(state.user.id).catch(console.error);
  } else {
    // Xóa sạch store khi logout
    useReminderStore.setState({ reminders: [] });
  }
});
