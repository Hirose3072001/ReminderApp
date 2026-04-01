import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Nạp bản vá cho Buffer và URL (bắt buộc cho React Native + Supabase)
global.Buffer = require('buffer').Buffer;
import 'react-native-url-polyfill/auto';

// Sử dụng biến môi trường để bảo mật các khóa API
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  // Fix lỗi 'stream' bằng cách dùng WebSocket toàn cục của React Native
  realtime: {
    websocket: WebSocket as any,
  },
});
