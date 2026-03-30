import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Priority = 'high' | 'medium' | 'low';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  time: Date;
  notificationId?: string;
  repeat: RepeatType;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: Date;
  endTime?: Date;
  reminder?: Reminder;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskStore {
  tasks: Task[];
  isLoaded: boolean;

  // Actions
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  getTaskById: (id: string) => Task | undefined;
  getActiveTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

const STORAGE_KEY = '@remind_app_tasks';

const serializeTasks = (tasks: Task[]): string => {
  return JSON.stringify(tasks.map(t => ({
    ...t,
    dueDate: t.dueDate?.toISOString(),
    endTime: t.endTime?.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    reminder: t.reminder ? {
      ...t.reminder,
      time: t.reminder.time.toISOString(),
    } : undefined,
  })));
};

const deserializeTasks = (json: string): Task[] => {
  const raw = JSON.parse(json);
  return raw.map((t: any) => ({
    ...t,
    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
    endTime: t.endTime ? new Date(t.endTime) : undefined,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
    reminder: t.reminder ? {
      ...t.reminder,
      time: new Date(t.reminder.time),
    } : undefined,
  }));
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoaded: false,

  loadTasks: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ tasks: deserializeTasks(stored), isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
      set({ isLoaded: true });
    }
  },

  addTask: (taskData) => {
    const now = new Date();
    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    set(state => {
      const tasks = [newTask, ...state.tasks];
      AsyncStorage.setItem(STORAGE_KEY, serializeTasks(tasks)).catch(console.error);
      return { tasks };
    });
    return newTask;
  },

  updateTask: (id, updates) => {
    set(state => {
      const tasks = state.tasks.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
      );
      AsyncStorage.setItem(STORAGE_KEY, serializeTasks(tasks)).catch(console.error);
      return { tasks };
    });
  },

  deleteTask: (id) => {
    set(state => {
      const tasks = state.tasks.filter(t => t.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, serializeTasks(tasks)).catch(console.error);
      return { tasks };
    });
  },

  toggleComplete: (id) => {
    set(state => {
      const tasks = state.tasks.map(t =>
        t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date() } : t
      );
      AsyncStorage.setItem(STORAGE_KEY, serializeTasks(tasks)).catch(console.error);
      return { tasks };
    });
  },

  getTaskById: (id) => get().tasks.find(t => t.id === id),
  getActiveTasks: () => get().tasks.filter(t => !t.completed),
  getCompletedTasks: () => get().tasks.filter(t => t.completed),
}));
