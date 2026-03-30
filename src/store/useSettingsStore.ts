import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReminderRule {
  id: string;
  type: 'before_start' | 'at_start' | 'before_end';
  offsetValue?: number;
  offsetUnit?: 'minutes' | 'hours' | 'days';
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
              type: 'before_start',
              offsetValue: 2,
              offsetUnit: 'days',
              timeSlots: ['12:00', '20:00']
            },
            {
              id: 'r2',
              type: 'at_start',
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
