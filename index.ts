import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';

// Polyfill cho WebCrypto subtle (Bắt buộc để Supabase dùng SHA256 cho PKCE thay vì 'plain')
if (typeof global.crypto !== 'object') {
  global.crypto = {} as any;
}
if (typeof global.crypto.subtle !== 'object') {
  (global.crypto as any).subtle = {
    digest: async (algorithm: any, data: Uint8Array) => {
      const algo = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (algo === 'SHA-256') {
        return await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data as any);
      }
      throw new Error(`Thuật toán ${algo} chưa được hỗ trợ bởi polyfill hiện tại.`);
    },
  };
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
