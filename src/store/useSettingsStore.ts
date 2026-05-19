import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReminderRule {
  id: string;
  timing: 'Khi bắt đầu' | 'Khi kết thúc' | 'Trước khi bắt đầu' | 'Trước khi kết thúc';
  amount: string;
  unit: 'Phút' | 'Giờ' | 'Ngày' | 'Tuần' | 'Tháng';
  frequency: 'none' | 'daily' | 'weekly' | 'monthly';
  repeatWeekDays: string[];
  repeatMonthDays: number[];
  timeSlots: string[]; // e.g. ["12:00", "20:00"]
}

export interface ReminderPreset {
  id: string;
  name: string;
  rules: ReminderRule[];
}

interface SettingsState {
  reminderPresets: ReminderPreset[];
  addPreset: (name: string, rules: ReminderRule[]) => void;
  updatePreset: (id: string, name: string, rules: ReminderRule[]) => void;
  deletePreset: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      reminderPresets: [
        {
          id: '1',
          name: 'Mặc định',
          rules: [
            {
              id: 'r1',
              timing: 'Trước khi bắt đầu',
              amount: '2',
              unit: 'Ngày',
              frequency: 'none',
              repeatWeekDays: [],
              repeatMonthDays: [],
              timeSlots: ['12:00', '20:00']
            },
            {
              id: 'r2',
              timing: 'Khi bắt đầu',
              amount: '0',
              unit: 'Phút',
              frequency: 'none',
              repeatWeekDays: [],
              repeatMonthDays: [],
              timeSlots: []
            }
          ]
        }
      ],
      addPreset: (name, rules) => set((state) => ({
        reminderPresets: [...state.reminderPresets, { id: Date.now().toString(), name, rules }]
      })),
      updatePreset: (id, name, rules) => set((state) => ({
        reminderPresets: state.reminderPresets.map(p => p.id === id ? { ...p, name, rules } : p)
      })),
      deletePreset: (id) => set((state) => ({
        reminderPresets: state.reminderPresets.filter(p => p.id !== id)
      })),
    }),
    {
      name: 'remind-app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
