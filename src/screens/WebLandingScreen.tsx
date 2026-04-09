import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const LOGO = require('../../assets/logoreminder_main.png');

export const WebLandingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
            {LOGO ? <Image source={LOGO} style={styles.logo} resizeMode="contain" /> : <View style={styles.logoPlaceholder} />}
            <Text style={styles.appName}>RemindApp</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Bắt đầu quản lý công việc và thời gian hiệu quả hơn</Text>
            <Text style={styles.heroSubtitle}>
              Tất cả-trong-Một: Lịch trình, Nhắc nhở, và Trợ lý AI. Đồng bộ mạnh mẽ, sử dụng mọi nơi.
            </Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('WebLogin')}>
              <Text style={styles.ctaText}>Bắt đầu ngay</Text>
              <MaterialIcons name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
        </View>

        {/* Features Row */}
        <View style={styles.featuresRow}>
            {/* Feature 1 */}
            <View style={styles.featureCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#e8f0fe' }]}>
                <MaterialIcons name="notifications-active" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Nhắc nhở thông minh</Text>
              <Text style={styles.featureDescription}>Hệ thống thông báo đẩy giúp bạn không bao giờ bỏ lỡ deadline quan trọng.</Text>
            </View>

            {/* Feature 2 */}
            <View style={styles.featureCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#fce8e6' }]}>
                <MaterialIcons name="calendar-month" size={48} color={Colors.error} />
              </View>
              <Text style={styles.featureTitle}>Hợp nhất lịch trình</Text>
              <Text style={styles.featureDescription}>Đồng bộ Google, Outlook Calendar về một màn hình duy nhất.</Text>
            </View>

            {/* Feature 3 */}
            <View style={styles.featureCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#e6f4ea' }]}>
                <MaterialIcons name="auto-awesome" size={48} color="#0f9d58" />
              </View>
              <Text style={styles.featureTitle}>Trợ lý AI hỗ trợ</Text>
              <Text style={styles.featureDescription}>Phân tích thời gian rảnh và gợi ý sắp xếp công việc tự động.</Text>
            </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 32,
    alignItems: 'center',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 48,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primaryContainer,
    borderRadius: 8,
    marginRight: 12,
  },
  appName: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleLg,
    color: Colors.onSurface,
  },
  heroSection: {
    alignItems: 'center',
    maxWidth: 800,
    marginVertical: 48,
  },
  heroTitle: {
    fontFamily: FontFamily.manropeExtraBold,
    fontSize: 48,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 24,
  },
  heroSubtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: 20,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 30,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaText: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 20,
    color: Colors.onPrimary,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 32,
    width: '100%',
    marginTop: 64,
  },
  featureCard: {
    backgroundColor: Colors.surface,
    padding: 32,
    borderRadius: 24,
    width: 320,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 24,
    color: Colors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureDescription: {
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
});
