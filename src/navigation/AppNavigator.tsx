import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from './types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { TaskManagementScreen } from '../screens/TaskManagementScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { AddTaskScreen } from '../screens/AddTaskScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReminderSettingsScreen } from '../screens/ReminderSettingsScreen';
import { EditReminderPresetScreen } from '../screens/EditReminderPresetScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({
  iconName,
  focused,
}: {
  iconName: keyof typeof MaterialIcons.glyphMap;
  focused: boolean;
}) => {
  if (focused) {
    return (
      <LinearGradient
        colors={['#005bbf', '#1a73e8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tabStyles.activeIconContainer}
      >
        <MaterialIcons name={iconName} size={28} color="#ffffff" />
      </LinearGradient>
    );
  }
  return (
    <View style={tabStyles.inactiveIconContainer}>
      <MaterialIcons name={iconName} size={28} color="#64748b" />
    </View>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: tabStyles.tabBar,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="Schedule"
      component={ScheduleScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon iconName="calendar-today" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="TaskManagement"
      component={TaskManagementScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon iconName="fact-check" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="AIChat"
      component={AIChatScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon iconName="auto-awesome" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Notification"
      component={NotificationScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon iconName="notifications" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon iconName="person" focused={focused} />
        ),
      }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Onboarding"
    screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
  >
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Main" component={MainTabs} />
    <Stack.Screen
      name="AddTask"
      component={AddTaskScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    <Stack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
    <Stack.Screen name="EditReminderPreset" component={EditReminderPresetScreen} />
  </Stack.Navigator>
);

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(243,243,244,0.92)',
    borderTopWidth: 0,
    elevation: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
  },
  activeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inactiveIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
