import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Nạp bản vá cho Buffer và URL (bắt buộc cho React Native + Supabase)
global.Buffer = require('buffer').Buffer;
import 'react-native-url-polyfill/auto';

// Sử dụng biến môi trường để bảo mật các khóa API
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';


import * as SecureStore from 'expo-secure-store';

// Bộ điều hợp lưu trữ cho Supabase dùng Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  // Fix lỗi 'stream' bằng cách dùng WebSocket toàn cục của React Native
  realtime: {
    websocket: WebSocket as any,
  },
});
