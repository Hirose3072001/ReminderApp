const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Lỗ hổng: Giải quyết việc Supabase (thông qua ws) yêu cầu các thư viện đặc thù của Node.js
// Chúng ta sẽ bỏ qua (ignore) chúng trong môi trường React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'stream': require.resolve('readable-stream'),
  'buffer': require.resolve('buffer/'),
  'events': require.resolve('events/'),
};

module.exports = config;
