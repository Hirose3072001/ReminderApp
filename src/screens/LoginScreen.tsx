import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuthStore();
  const handleGoogleLogin = async () => {
    setLoading(true);
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
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Bộ lắng nghe dự phòng nếu trình duyệt không tự đóng
        const linkingSubscription = Linking.addEventListener('url', async (event) => {
          handleRedirect(event.url);
          linkingSubscription.remove();
        });

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          handleRedirect(result.url);
        }
        
        // Hủy lắng nghe sau khi hoàn tất
        linkingSubscription.remove();
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      Alert.alert('Lỗi đăng nhập', error.message);
    } finally {
      setLoading(false);
    }
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


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.surface, '#E8F1FF', Colors.surface]}
        style={styles.background}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[Colors.primary, '#1a73e8']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="calendar-sync" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Chào mừng quay trở lại</Text>
          <Text style={styles.subtitle}>
            Đăng nhập để đồng bộ lịch và quản lý công việc hiệu quả hơn trên mọi thiết bị.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.onSurface} />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.privacyText}>
            Bằng cách đăng nhập, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  background: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1, paddingHorizontal: Spacing[8], justifyContent: 'space-between', paddingVertical: Spacing[12] },
  header: { alignItems: 'center', marginTop: Spacing[10] },
  logoContainer: {
    width: 100, height: 100, borderRadius: Radius.xxl,
    marginBottom: Spacing[8], elevation: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20,
  },
  logoGradient: { flex: 1, borderRadius: Radius.xxl, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: FontFamily.manropeExtraBold, fontSize: FontSize.headlineMd,
    color: Colors.onSurface, textAlign: 'center', marginBottom: Spacing[4],
  },
  subtitle: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.bodyLg,
    color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 28,
  },
  footer: { width: '100%', alignItems: 'center', gap: Spacing[6] },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', width: '100%', height: 60,
    borderRadius: Radius.lg, gap: Spacing[3],
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  googleIcon: { width: 24, height: 24 },
  googleButtonText: {
    fontFamily: FontFamily.interSemiBold, fontSize: FontSize.bodyLg,
    color: Colors.onSurface,
  },
  privacyText: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.labelSm,
    color: Colors.outline, textAlign: 'center', paddingHorizontal: Spacing[4],
  },
});
