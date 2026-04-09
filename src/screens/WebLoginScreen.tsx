import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export const WebLoginScreen = () => {

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Login error:', error.message);
        alert('Có lỗi xảy ra khi đăng nhập: ' + error.message);
      }
      
      // on web, Supabase OAuth direct redirects the window, we don't need to do anything else.
    } catch (e: any) {
      console.error('Catch Login error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
            <View style={styles.logoContainer}>
                <Image 
                    source={require('../../assets/logoreminder.png')} 
                    style={{ width: 120, height: 120, borderRadius: 24 }} 
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.title}>Chào mừng trở lại</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục quản lý công việc và lịch trình của bạn trên mọi thiết bị.</Text>
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleLogin}>
          <Image
            source={{ uri: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png' }}
            style={{ width: 24, height: 24, marginRight: 12 }}
          />
          <Text style={styles.googleButtonText}>Đăng nhập với Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f3f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 48,
    borderRadius: 24,
    width: 440,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 32,
    elevation: 8,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  title: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 28,
    color: Colors.onSurface,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  googleButton: {
    backgroundColor: Colors.surfaceContainer,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  googleButtonText: {
    fontFamily: FontFamily.interMedium,
    fontSize: 16,
    color: Colors.onSurface,
  },
});
