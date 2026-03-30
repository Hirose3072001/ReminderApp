import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Sắp tới hạn', desc: 'Cuộc họp chiến lược Q3 sẽ bắt đầu trong 15 phút', time: 'Bây giờ', type: 'warning' },
  { id: '2', title: 'Đến giờ', desc: 'Đã đến giờ Tập Gym & Yoga', time: '2 giờ trước', type: 'info' },
  { id: '3', title: 'Hoàn thành', desc: 'Bạn đã hoàn thành Thiết kế UI/UX', time: '1 ngày trước', type: 'success' },
];

export const NotificationScreen = () => {

  const renderItem = ({ item }: { item: any }) => {
    let iconName = 'notifications';
    let iconColor: string = Colors.primary;
    
    if (item.type === 'warning') {
      iconName = 'schedule';
      iconColor = Colors.tertiaryContainer || '#c55500';
    } else if (item.type === 'success') {
      iconName = 'check-circle';
      iconColor = Colors.primary;
    }

    return (
      <View style={styles.notifCard}>
        <View style={[styles.iconWrapper, { backgroundColor: iconColor + '20' }]}>
          <MaterialIcons name={iconName as any} size={24} color={iconColor} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          <Text style={styles.desc}>{item.desc}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>

      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  headerTitle: { 
    fontFamily: FontFamily.manropeBold, 
    fontSize: FontSize.titleLg, 
    color: Colors.onSurface 
  },
  listContent: {
    paddingTop: 16,
  },
  notifCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.bodyLg,
    color: Colors.onSurface,
  },
  time: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.labelSm,
    color: Colors.outline,
  },
  desc: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  }
});
