import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

interface SettingItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, title, subtitle, onPress, color = Colors.outlineVariant, danger = false }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconContainer}>
      <MaterialIcons name={icon} size={24} color={danger ? Colors.error : color} />
    </View>
    <View style={styles.textContainer}>
      <Text style={[styles.title, danger && { color: Colors.error }]}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
  </TouchableOpacity>
);

export const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => console.log('Logged out') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài đặt</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Trịnh Công Minh</Text>
            <Text style={styles.profileEmail}>congminhxx@gmail.com</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Sửa</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Tài khoản & Dữ liệu</Text>
          <View style={styles.card}>
            <SettingItem 
              icon="person" 
              title="Quản lý hồ sơ cá nhân" 
              subtitle="Cập nhật tên, mật khẩu"
              onPress={() => {}} 
              color={Colors.primary} 
            />
            <View style={styles.divider} />
            <SettingItem 
              icon="sync" 
              title="Đồng bộ lịch" 
              subtitle="Google Calendar, Outlook"
              onPress={() => {}} 
              color="#0f9d58" 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Ứng dụng</Text>
          <View style={styles.card}>
             <SettingItem 
               icon="star-rate" 
               title="Đánh giá ứng dụng" 
               subtitle="Ủng hộ nhà phát triển 5 sao"
               onPress={() => {}} 
               color="#f4b400" 
             />
             <View style={styles.divider} />
             <SettingItem 
               icon="notification-important" 
               title="Thiết lập nhắc lịch" 
               subtitle="Cài đặt các mốc thời gian rảnh"
               onPress={() => navigation.navigate('ReminderSettings')} 
               color={Colors.primary} 
             />
           </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <SettingItem 
              icon="logout" 
              title="Đăng xuất" 
              onPress={handleLogout} 
              danger={true} 
            />
          </View>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
  },
  headerTitle: { 
    fontFamily: FontFamily.manropeBold, 
    fontSize: FontSize.titleLg, 
    color: Colors.onSurface 
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryContainer || '#d8e2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleLg,
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleMd,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant,
  },
  editBtn: {
    backgroundColor: '#f3f3f4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editBtnText: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.labelMd,
    color: Colors.onSurface,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.labelMd,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.bodyLg,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.labelSm,
    color: Colors.outline,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f3f4',
    marginLeft: 68,
    marginRight: 16,
  }
});
