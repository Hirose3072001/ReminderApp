import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize } from '../theme';

// Import existing screens to render in the content area
import { ScheduleScreen } from './ScheduleScreen';
import { TaskManagementScreen } from './TaskManagementScreen';
import { AIChatScreen } from './AIChatScreen';
import { NotificationScreen } from './NotificationScreen';
import { SettingsScreen } from './SettingsScreen';
import { useAuthStore } from '../store/useAuthStore';


type TabKey = 'schedule' | 'tasks' | 'ai' | 'notifications' | 'settings';

export const WebMainScreen = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('schedule');
  const user = useAuthStore(state => state.user);

  const tabs: { key: TabKey; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
    { key: 'schedule', icon: 'calendar-today', label: 'Lịch trình' },
    { key: 'tasks', icon: 'fact-check', label: 'Công việc' },
    { key: 'ai', icon: 'auto-awesome', label: 'Trợ lý AI' },
    { key: 'notifications', icon: 'notifications', label: 'Thông báo' },
    { key: 'settings', icon: 'person', label: 'Cài đặt' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule': return <ScheduleScreen />;
      case 'tasks': return <TaskManagementScreen />;
      case 'ai': return <AIChatScreen />;
      case 'notifications': return <NotificationScreen />;
      case 'settings': return <SettingsScreen />;
      default: return <ScheduleScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.logoPlaceholder}>
            <MaterialIcons name="fact-check" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>RemindApp</Text>
        </View>

        <View style={styles.menuContainer}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <MaterialIcons 
                  name={tab.icon} 
                  size={24} 
                  color={isActive ? Colors.primary : Colors.onSurfaceVariant} 
                />
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.userSection}>
           <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
         {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#f9f9f9',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appName: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleMd,
    color: Colors.onSurface,
  },
  menuContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemActive: {
    backgroundColor: Colors.primaryFixed,
  },
  menuLabel: {
    marginLeft: 16,
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  menuLabelActive: {
    color: Colors.primary,
    fontFamily: FontFamily.interBold,
  },
  userSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  userEmail: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#fff',
    // Màn hình con sẽ dùng flex 1 tự lấp đầy
  }
});
