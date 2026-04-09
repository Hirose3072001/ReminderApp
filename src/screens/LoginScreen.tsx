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
import { syncService } from '../services/syncService';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const { setSession, setInitialSync } = useAuthStore();
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        path: 'auth/callback',
      });
      console.log('🔗 Generated Redirect URL:', redirectUrl);

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
        console.log('🌐 Opening Auth Session at:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          console.log('✅ Auth Session Success! Redirect URL received:', result.url);
          handleRedirect(result.url);
        } else {
          console.log('ℹ️ Auth Session Cancelled or Closed. Result:', result.type);
        }
      }
    } catch (error: any) {
      console.error('❌ Login Error:', error);
      Alert.alert('Lỗi đăng nhập', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = async (url: string) => {
    try {
      // Xử lý URL để lấy params từ cả query (?) và fragment (#)
      const urlObj = new URL(url.replace('#', '?'));
      const params = urlObj.searchParams;
      
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      console.log('📝 Parsed parameters:', { 
        hasCode: !!code, 
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken 
      });

      if (code) {
        console.log('🔄 Exchanging code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        
        console.log('🎉 Login Success with Code!');
        setInitialSync(true);
        setSession(data.session);
        syncService.performFullSync();
      } else if (accessToken && refreshToken) {
        console.log('🔄 Setting session from tokens...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        
        console.log('🎉 Login Success with Tokens!');
        setInitialSync(true);
        setSession(data.session);
        syncService.performFullSync();
      } else {
        console.warn('⚠️ No valid authentication parameters found in redirect URL.');
      }
    } catch (err: any) {
      console.error('❌ Redirect Processing Error:', err);
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
              <Image 
                source={require('../../assets/logoreminder.png')} 
                style={{ width: 120, height: 120, borderRadius: Radius.xxl }} 
                resizeMode="contain"
              />
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
                  source={{ uri: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png' }}
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
    width: 150, height: 150, borderRadius: Radius.xxl,
    marginBottom: Spacing[8],
    backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
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
