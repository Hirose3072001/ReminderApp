import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/theme';
import * as Notifications from 'expo-notifications';
import { initDB } from './src/database';
import { useAuthStore } from './src/store/useAuthStore';
import { syncService } from './src/services/syncService';
import { useReminderStore } from './src/store/useReminderStore';
import NetInfo from '@react-native-community/netinfo';
import { initNotificationListeners } from './src/services/notificationService';
import { rescheduleAllReminders } from './src/services/schedulingService';

// Handle notification taps when app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Khởi tạo DB ngay lập tức
try {
  initDB();
} catch (e) {
  console.warn("Lỗi khởi tạo DB:", e);
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      Manrope_400Regular,
      Manrope_500Medium,
      Manrope_600SemiBold,
      Manrope_700Bold,
      Manrope_800ExtraBold,
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
    }).then(() => setFontsLoaded(true));

    // Khởi tạo notification listeners
    const sub = initNotificationListeners();
    return () => sub.remove();
  }, []);

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const loadReminders = useReminderStore(state => state.loadReminders);

  useEffect(() => {
    if (isAuthenticated && user) {
      // 1. Sync ngay khi vừa login hoặc mở app
      syncService.performFullSync(user.id).then(() => {
        loadReminders();
        syncService.cleanupOrphanLocalNotifications();
        rescheduleAllReminders(user.id).catch(console.error);
      });

      // 2. Bắt đầu lắng nghe Realtime
      syncService.startRealtimeSync(user.id);

      // 3. Lắng nghe trạng thái mạng để sync khi online trở lại
      const unsubscribeNet = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
          console.log('🌐 Internet Reconnected! Triggering Auto-Sync...');
          syncService.performFullSync(user.id).then(() => {
            loadReminders();
          });
        }
      });

      return () => {
        unsubscribeNet();
        syncService.stopRealtimeSync();
      };
    }
  }, [isAuthenticated, user]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor={Colors.surface} />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
