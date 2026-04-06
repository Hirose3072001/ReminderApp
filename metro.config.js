const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Lỗ hổng: Giải quyết việc Supabase (thông qua ws) yêu cầu các thư viện đặc thù của Node.js
// Chúng ta sẽ bỏ qua (ignore) chúng trong môi trường React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'stream': require.resolve('readable-stream'),
  'buffer': require.resolve('buffer/'),
  'events': require.resolve('events/'),
};

// Ưu tiên nạp bản CommonJS (không chứa import.meta) thay vì bản ESM trên Web
// Đưa 'main' lên đầu tiên để ép Metro dùng bản build đã được transpile sẵn
config.resolver.resolverMainFields = ['main', 'browser', 'module'];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
