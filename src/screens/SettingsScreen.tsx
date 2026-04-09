import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { syncGoogleCalendar } from '../services/calendarSyncService';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';
import { syncService } from '../services/syncService';
import { cancelAllNotifications } from '../services/notificationService';
import { rescheduleAllReminders } from '../services/schedulingService';

WebBrowser.maybeCompleteAuthSession();

interface SettingItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, title, subtitle, onPress, color = Colors.outlineVariant, danger = false }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconContainer}>
      <MaterialIcons name={icon} size={24} color={danger ? Colors.error : color} />
    </View>
    <View style={styles.textContainer}>
      <Text style={[styles.title, danger && { color: Colors.error }]}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
  </TouchableOpacity>
);

interface SettingSwitchItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  color?: string;
}

const SettingSwitchItem: React.FC<SettingSwitchItemProps> = ({ icon, title, subtitle, value, onValueChange, color = Colors.outlineVariant }) => (
  <View style={styles.settingItem}>
    <View style={styles.iconContainer}>
      <MaterialIcons name={icon} size={24} color={color} />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    <Switch 
      value={value} 
      onValueChange={onValueChange}
      trackColor={{ false: '#e2e2e2', true: Colors.primary }}
      thumbColor="#fff"
      ios_backgroundColor="#e2e2e2"
    />
  </View>
);

export const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, signOut, setSession, updateProfile } = useAuthStore();
  const [switching, setSwitching] = useState(false);
  
  // Trạng thái local để Switch phản hồi tức thì
  const [pushEnabled, setPushEnabled] = useState(profile?.push_notifications ?? true);

  // Đồng bộ local state khi profile thay đổi (ví dụ: từ thiết bị khác hoặc khi fetch xong)
  React.useEffect(() => {
    if (profile?.push_notifications !== undefined) {
      setPushEnabled(profile.push_notifications);
    }
  }, [profile?.push_notifications]);

  const handleTogglePush = async (value: boolean) => {
    // 1. Cập nhật UI và Store local ngay lập tức (Dirty flag để sync sau)
    setPushEnabled(value);
    useAuthStore.getState().updateProfileLocally({ push_notifications: value });
    
    // 2. Thực hiện hiệu ứng ngay lập tức trên hệ thống thông báo điện thoại
    try {
      if (value === false) {
        // Nếu tắt: Hủy toàn bộ các thông báo hệ thống đang chờ nổ
        await cancelAllNotifications();
        console.log('🚫 All scheduled system notifications cancelled');
      } else {
        // Nếu bật: Đặt lịch lại cho tất cả các nhắc nhở
        if (user?.id) {
          await rescheduleAllReminders(user.id);
          console.log('🔔 All reminders rescheduled for system alerts');
        }
      }
    } catch (err) {
      console.error('Failed to update system notifications:', err);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: async () => await signOut() }
    ]);
  };

  const handleSwitchAccount = async () => {
    setSwitching(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const url = result.url;
          const urlParts = url.split(/[?#]/);
          const allParams = urlParts.slice(1).join('&');
          const params = new URLSearchParams(allParams);
          
          const code = params.get('code');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (code) {
            const { data: switchData, error: switchError } = await supabase.auth.exchangeCodeForSession(code);
            if (switchError) throw switchError;
            setSession(switchData.session);
            syncService.performFullSync();
          } else if (accessToken && refreshToken) {
            const { data: switchData, error: switchError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (switchError) throw switchError;
            setSession(switchData.session);
            syncService.performFullSync();
          }
        }
      }
    } catch (error: any) {
      console.error('Switch Account Error:', error);
      Alert.alert('Lỗi chuyển tài khoản', error.message);
    } finally {
      setSwitching(false);
    }
  };

  const handleSync = async () => {
    Alert.alert('Đồng bộ', 'Đang kết nối tới Google Calendar...');
    const result = await syncGoogleCalendar();
    
    if (result.success) {
      Alert.alert('Thành công', `Đã đồng bộ ${result.count} sự kiện từ Google Calendar.`);
    } else {
      Alert.alert('Lỗi đồng bộ', result.error || 'Không thể đồng bộ dữ liệu lúc này.');
    }
  };

  const userDisplayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const userEmail = user?.email || 'Chưa cập nhật email';
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài đặt</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{userInitial}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userDisplayName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleSwitchAccount} disabled={switching}>
            {switching ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <MaterialIcons name="swap-horiz" size={24} color={Colors.onSurface} title="Đổi tài khoản" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Tài khoản & Dữ liệu</Text>
          <View style={styles.card}>
            <SettingItem 
              icon="person" 
              title="Quản lý hồ sơ cá nhân" 
              subtitle="Cập nhật tên, mật khẩu"
              onPress={() => navigation.navigate('Profile')} 
              color={Colors.primary} 
            />
            <View style={styles.divider} />
            <SettingItem 
              icon="sync" 
              title="Đồng bộ lịch" 
              subtitle="Google, iCloud, Outlook"
              onPress={() => navigation.navigate('CalendarSync')} 
              color="#0f9d58" 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Ứng dụng</Text>
          <View style={styles.card}>
             <SettingItem 
               icon="star-rate" 
               title="Đánh giá ứng dụng" 
               subtitle="Ủng hộ nhà phát triển 5 sao"
               onPress={() => {}} 
               color="#f4b400" 
             />
             <View style={styles.divider} />
             <SettingItem 
               icon="notification-important" 
               title="Thiết lập nhắc lịch" 
               subtitle="Cài đặt các mốc thời gian rảnh"
               onPress={() => navigation.navigate('ReminderSettings')} 
               color={Colors.primary} 
             />
             <View style={styles.divider} />
             <SettingSwitchItem 
               icon="notifications-active" 
               title="Thông báo đẩy" 
               subtitle="Nhận thông báo trên thiết bị di động"
               value={pushEnabled}
               onValueChange={handleTogglePush}
               color={Colors.secondary}
             />
           </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <SettingItem 
              icon="logout" 
              title="Đăng xuất" 
              onPress={handleLogout} 
              danger={true} 
            />
          </View>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
  },
  headerTitle: { 
    fontFamily: FontFamily.manropeBold, 
    fontSize: FontSize.titleLg, 
    color: Colors.onSurface 
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarText: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleLg,
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleMd,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant,
  },
  editBtn: {
    backgroundColor: '#f3f3f4',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.labelMd,
    color: Colors.onSurface,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.labelMd,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.bodyLg,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.labelSm,
    color: Colors.outline,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f3f4',
    marginLeft: 68,
    marginRight: 16,
  }
});
