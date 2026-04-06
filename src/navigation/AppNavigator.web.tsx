import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { WebLandingScreen } from '../screens/WebLandingScreen';
import { WebLoginScreen } from '../screens/WebLoginScreen';
import { WebMainScreen } from '../screens/WebMainScreen';
import { AddTaskScreen } from '../screens/AddTaskScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ReminderSettingsScreen } from '../screens/ReminderSettingsScreen';
import { EditReminderPresetScreen } from '../screens/EditReminderPresetScreen';
import { CalendarSyncScreen } from '../screens/CalendarSyncScreen';
import { useAuthStore } from '../store/useAuthStore.web';
import { supabase } from '../services/supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigatorWeb = () => {
  const { isAuthenticated, setSession } = useAuthStore();

  useEffect(() => {
    // Restore session on Mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="WebLanding" component={WebLandingScreen} />
          <Stack.Screen name="WebLogin" component={WebLoginScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={WebMainScreen} />
          <Stack.Screen name="AddTask" component={AddTaskScreen} />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
          <Stack.Screen name="EditReminderPreset" component={EditReminderPresetScreen} />
          <Stack.Screen name="CalendarSync" component={CalendarSyncScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
