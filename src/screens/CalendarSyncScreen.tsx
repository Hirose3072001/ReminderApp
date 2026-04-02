import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { syncGoogleCalendar } from '../services/calendarSyncService';
import { supabase } from '../services/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export const CalendarSyncScreen = () => {
  const navigation = useNavigation();
  const { profile, updateProfile, setSession } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleConnectGoogle = (): Promise<boolean> => {
    return new Promise(async (resolve) => {
      try {
        const redirectUrl = AuthSession.makeRedirectUri({
          path: 'auth/callback',
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            scopes: 'https://www.googleapis.com/auth/calendar.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          resolve(false);
          return;
        }

        if (data?.url) {
          Alert.alert(
            'Lưu ý quan trọng', 
            'Khi cửa sổ Google hiện ra, bạn BẮT BUỘC phải tích vào ô "Xem lịch" để ứng dụng có quyền đồng bộ dữ liệu.',
            [
              { 
                text: 'Hủy',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              { 
                text: 'Tôi đã hiểu', 
                onPress: async () => {
                  let authResult: string | null = null;
                  
                  const linkingSubscription = Linking.addEventListener('url', async (event) => {
                    authResult = event.url;
                    await handleRedirect(event.url);
                    linkingSubscription.remove();
                    resolve(true);
                  });

                  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                  if (result.type === 'success' && result.url) {
                    authResult = result.url;
                    await handleRedirect(result.url);
                  }
                  linkingSubscription.remove();
                  resolve(!!authResult);
                } 
              }
            ]
          );
        } else {
          resolve(false);
        }
      } catch (err) {
        console.error(err);
        resolve(false);
      }
    });
  };

  const handleRedirect = async (url: string) => {
    try {
      const urlParts = url.split(/[?#]/);
      const allParams = urlParts.slice(1).join('&');
      const params = new URLSearchParams(allParams);
      
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setSession(data.session);
      } else if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        setSession(data.session);
      }
    } catch (err: any) {
      console.error('Redirect Processing Error:', err);
    }
  };

  const handleToggleSync = async (type: 'google' | 'icloud' | 'outlook' | 'system', value: boolean) => {
    const fieldMap = {
      google: 'sync_google_calendar',
      icloud: 'sync_icloud_calendar',
      outlook: 'sync_outlook_calendar',
      system: 'sync_system_calendar',
    } as const;

    const field = fieldMap[type];
    
    try {
      // Nếu tắt, ta cập nhật ngầm định và phản hồi ngay (không cần chờ sync)
      if (!value) {
        updateProfile({ [field]: false });
        return;
      }

      // Nếu bật Google, cần xác thực
      if (type === 'google') {
        setLoading('google');
        const connected = await handleConnectGoogle();
        if (!connected) {
          setLoading(null);
          return;
        }
        
        // Cập nhật profile ngay sau khi login thành công
        await updateProfile({ [field]: true });
        
        // Sync dữ liệu ngầm định (không chặn UI)
        setLoading(null);
        syncGoogleCalendar().then(syncResult => {
          if (syncResult.success) {
            Alert.alert('Thành công', `Đã đồng bộ ${syncResult.count} sự kiện từ Google Calendar.`);
          }
        });
      } else {
        // Các loại khác đang phát triển: Bật ngay rồi báo
        updateProfile({ [field]: true });
        Alert.alert('Thông báo', `Chức năng kết nối ${type.charAt(0).toUpperCase() + type.slice(1)} đang được phát triển.`);
      }
    } catch (error) {
      console.error(`Error toggling ${type} sync:`, error);
    } finally {
      setLoading(null);
    }
  };

  const SyncItem = ({ 
    type, 
    title, 
    icon, 
    iconColor, 
    isEnabled 
  }: { 
    type: 'google' | 'icloud' | 'outlook' | 'system';
    title: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    iconColor: string;
    isEnabled: boolean;
  }) => (
    <View style={styles.syncItem}>
      <View style={styles.itemLeft}>
        <View style={styles.iconBg}>
          <MaterialIcons name={icon} size={24} color={iconColor} />
        </View>
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      {loading === type ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
      ) : (
        <Switch
          trackColor={{ false: '#e2e2e2', true: Colors.primary }}
          thumbColor="#fff"
          ios_backgroundColor="#e2e2e2"
          onValueChange={(value) => handleToggleSync(type, value)}
          value={isEnabled}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đồng bộ lịch</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.listContainer}>
          <SyncItem 
            type="google"
            title="Google Calendar" 
            icon="calendar-today" 
            iconColor={Colors.primary} 
            isEnabled={!!profile?.sync_google_calendar}
          />
          <SyncItem 
            type="icloud"
            title="iCloud Calendar" 
            icon="cloud" 
            iconColor="#007AFF" 
            isEnabled={!!profile?.sync_icloud_calendar}
          />
          <SyncItem 
            type="outlook"
            title="Outlook Calendar" 
            icon="email" 
            iconColor="#0078D4" 
            isEnabled={!!profile?.sync_outlook_calendar}
          />
          <SyncItem 
            type="system"
            title="Lịch hệ thống" 
            icon="event-note" 
            iconColor={Colors.secondary} 
            isEnabled={!!profile?.sync_system_calendar}
          />
        </View>

        <Text style={styles.description}>
          Đồng bộ hóa lịch của bạn để Remind Me có thể giúp bạn sắp xếp thời gian rảnh và tránh trùng lặp công việc.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleLg,
    color: Colors.onSurface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  syncItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    marginBottom: 4,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBg: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f3f4',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  description: {
    fontFamily: FontFamily.interRegular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
    paddingHorizontal: 16,
  },
});
