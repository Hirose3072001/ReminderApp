import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize } from '../theme';

const { width } = Dimensions.get('window');

export const SyncingScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[Colors.surface, '#E8F1FF', Colors.surface]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Image 
            source={require('../../assets/logoreminder.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.title}>Đang đồng bộ dữ liệu</Text>
            <Text style={styles.subtitle}>Vui lòng chờ trong giây lát khi chúng tôi chuẩn bị nhắc lịch cho bạn...</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>RemindApp &bull; Personal Assistant</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 40,
  },
  loaderContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleLg,
    color: Colors.onSurface,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.labelSm,
    color: Colors.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
