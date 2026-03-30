import { create } from 'zustand';
import * as Queries from '../database/queries';
import { Reminder } from '../database/queries';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { cancelTaskNotifications } from '../services/notificationService';

interface ReminderState {
  reminders: Reminder[];
  loadReminders: () => void;
  addReminder: (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & { id?: string }) => void;
  toggleStatus: (id: string, currentStatus: number) => void;
  updateDescription: (id: string, description: string) => void;
  removeReminder: (id: string) => void;
  editReminder: (id: string, reminderData: Partial<Reminder>) => void;
}

export const useReminderStore = create<ReminderState>((set) => ({
  reminders: [],
  
  loadReminders: () => {
    const data = Queries.getAllReminders();
    set({ reminders: data });
  },

  addReminder: (data) => {
    const newReminder: Reminder = {
      ...data,
      id: data.id || uuidv4(),
      completed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    Queries.insertReminder(newReminder);
    // Reload từ DB để đảm bảo đồng bộ
    const updatedData = Queries.getAllReminders();
    set({ reminders: updatedData });
  },

  toggleStatus: (id, currentStatus) => {
    const newStatus = currentStatus === 0 ? 1 : 0;
    Queries.updateReminderStatus(id, newStatus);
    set((state) => ({
      reminders: state.reminders.map((r) => r.id === id ? { ...r, completed: newStatus, updatedAt: new Date().toISOString() } : r)
    }));
  },

  updateDescription: (id, description) => {
    Queries.updateReminderDescription(id, description);
    set((state) => ({
      reminders: state.reminders.map((r) => r.id === id ? { ...r, description, updatedAt: new Date().toISOString() } : r)
    }));
  },

  removeReminder: (id) => {
    Queries.deleteReminder(id);
    cancelTaskNotifications(id); // Cancel push notifications
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id)
    }));
  },
  
  editReminder: (id, data) => {
    Queries.updateReminder(id, data);
    const updatedData = Queries.getAllReminders();
    set({ reminders: updatedData });
  }
}));
