import { Reminder } from '../database/queries';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Syncing: undefined;
  WebLanding: undefined;
  WebLogin: undefined;
  Main: undefined;
  AddTask: { type: 'task' | 'event'; editItem?: Reminder };
  TaskDetail: { id: string };
  ReminderSettings: undefined;
  EditReminderPreset: { presetId?: string };
  Profile: undefined;
  CalendarSync: undefined;
};

export type MainTabParamList = {
  Schedule: undefined;
  TaskManagement: undefined;
  AIChat: undefined;
  Notification: undefined;
  Settings: undefined;
};
