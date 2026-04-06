import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  require('react-native-get-random-values');
}
import * as Crypto from 'expo-crypto';

// Polyfill cho WebCrypto subtle (Bắt buộc để Supabase dùng SHA256 cho PKCE thay vì 'plain')
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined' && window.crypto) {
    if (!(global as any).crypto) (global as any).crypto = window.crypto;
    if (!(global as any).crypto.subtle && (window.crypto as any).subtle) {
      (global.crypto as any).subtle = (window.crypto as any).subtle;
    }
  }
}

import { registerRootComponent } from 'expo';

// Chọn đúng App theo platform để tránh Bundle lỗi
const App = Platform.OS === 'web' 
  ? require('./App.web').default 
  : require('./App').default;

registerRootComponent(App);
