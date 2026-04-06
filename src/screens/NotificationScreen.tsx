import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, SectionList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useReminderStore } from '../store/useReminderStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ItemDetailPopup } from '../components/schedule/ItemDetailPopup';
import { Reminder, Notification } from '../database/queries';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as Notifications from 'expo-notifications';

export const NotificationScreen = () => {
  const { reminders } = useReminderStore();
  const { notifications: storeNotifications, loadNotifications, markAsRead, syncData } = useNotificationStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [now, setNow] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<Reminder | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [showFilter, setShowFilter] = useState(false);

  const FILTERS = ['Tất cả', 'Nhắc lịch', 'Đã hoàn thành', 'Đã quá hạn'];

  useEffect(() => {
    loadNotifications();
    if (Platform.OS !== 'web') {
      syncData();
    }

    // Cập nhật mỗi giây để đảm bảo độ chính xác tuyệt đối
    const timer = setInterval(() => {
      const current = new Date();
      setNow(current);
      
      // Chỉ load dữ liệu từ DB mỗi 5 giây hoặc khi bắt đầu phút mới để tiết kiệm hiệu năng
      if (current.getSeconds() % 5 === 0) {
        loadNotifications();
      }
    }, 1000);

    // Lắng nghe ngay khi thông báo hệ thống nổ — cập nhật UI tức thì
    let sub: any;
    if (Platform.OS !== 'web') {
      sub = Notifications.addNotificationReceivedListener(() => {
        setNow(new Date());
        loadNotifications();
      });
    }

    return () => {
      clearInterval(timer);
      if (sub) sub.remove();
    };
  }, []);

  const notifications = useMemo(() => {
    const formatRelativeTime = (date: Date) => {
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);

      if (diffSec < 60) return 'bây giờ';
      if (diffMin < 60) return `${diffMin} phút trước`;
      if (diffHour < 24) return `${diffHour} giờ trước`;
      if (diffDay < 7) return `${diffDay} ngày trước`;
      return format(date, 'dd/MM/yyyy');
    };

    // 1. Phân loại theo filter
    let filtered = storeNotifications;
    if (activeFilter !== 'Tất cả') {
      filtered = filtered.filter(n => {
        if (activeFilter === 'Nhắc lịch') return n.title === 'Nhắc lịch';
        if (activeFilter === 'Đã hoàn thành') return n.title === 'Đã hoàn thành';
        if (activeFilter === 'Đã quá hạn') return n.title === 'Đã quá hạn';
        return true;
      });
    }

    // 2. Nhóm theo Ngày (Date Grouping)
    const groups: { [key: string]: any[] } = {};
    filtered.forEach(notif => {
      const d = parseISO(notif.timestamp);
      let dateLabel = '';
      if (isToday(d)) dateLabel = 'Hôm nay';
      else if (isYesterday(d)) dateLabel = 'Hôm qua';
      else {
        dateLabel = format(d, 'EEEE, dd/MM/yyyy', { locale: vi });
        dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
      }

      const reminder = reminders.find(r => r.id === notif.reminder_id);

      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push({
        ...notif,
        displayTime: formatRelativeTime(d),
        rawTime: d,
        reminder
      });
    });

    // 3. Chuyển sang định dạng SectionList và sắp xếp theo thời gian
    const sections = Object.keys(groups).map(title => ({
      title,
      data: groups[title].sort((a, b) => b.rawTime.getTime() - a.rawTime.getTime()),
      sortDate: groups[title][0].rawTime
    }));

    return sections.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [storeNotifications, reminders, now, activeFilter]);

  const renderDescription = (text: string) => {
    if (!text) return null;
    const parts = text.split(/("[^"]*"|\d{1,2}:\d{2})/g);
    return (
      <Text style={styles.desc}>
        {parts.map((part, i) => {
          if (!part) return null;
          const isBold = part.startsWith('"') || /^\d{1,2}:\d{2}$/.test(part);
          return (
            <Text key={i} style={isBold ? styles.boldText : null}>
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  const handleEdit = (reminder: Reminder) => {
    setPopupVisible(false);
    navigation.navigate('AddTask', {
      type: reminder.type as any,
      editItem: reminder
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    let iconColor: string = Colors.primary;
    let iconName: any = item.is_read === 0 ? 'notifications-active' : 'notifications-none';
    
    const bodyLower = (item.body || '').toLowerCase();
    
    // Logic màu sắc theo yêu cầu mới nhất:
    // 1. "đã bắt đầu" -> Xanh lá
    // 2. "đã kết thúc" -> Đỏ 
    // 3. "Đã hoàn thành" -> Xanh lá
    // 4. "Đã quá hạn" -> Đỏ
    // 5. Còn lại (Sắp bắt đầu, Sắp kết thúc, v.v.) -> Xanh biển
    
    const isStarted = bodyLower.includes('đã bắt đầu');
    const isEnded = bodyLower.includes('đã kết thúc');

    if (isStarted) iconColor = '#2E7D32'; // Green
    else if (isEnded) iconColor = '#C62828'; // Red
    else if (item.title === 'Đã quá hạn') iconColor = '#C62828'; // Red
    else if (item.title === 'Đã hoàn thành') iconColor = '#2E7D32'; // Green
    else iconColor = Colors.primary; // Blue (Mặc định cho các thông báo "Sắp...")
    
    return (
      <TouchableOpacity 
        style={[styles.notifCard, item.is_read === 0 && styles.unreadCard]}
        onPress={() => {
          if (item.is_read === 0) markAsRead(item.id);
          if (item.reminder) {
            setSelectedItem(item.reminder);
            setPopupVisible(true);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: iconColor + '15' }]}>
          <MaterialIcons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: iconColor }]}>{item.title}</Text>
            <Text style={styles.time}>{item.displayTime}</Text>
          </View>
          {renderDescription(item.body)}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity 
          style={styles.filterBtn}
          onPress={() => setShowFilter(true)}
        >
          <MaterialIcons name="filter-list" size={20} color={Colors.primary} />
          <Text style={styles.filterBtnText}>{activeFilter}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilter(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownCard}>
              <Text style={styles.dropdownTitle}>Lọc theo</Text>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    setActiveFilter(f);
                    setShowFilter(false);
                  }}
                  style={[
                    styles.dropdownItem,
                    activeFilter === f && styles.activeDropdownItem
                  ]}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    activeFilter === f && styles.activeDropdownItemText
                  ]}>
                    {f}
                  </Text>
                  {activeFilter === f && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <SectionList
        sections={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <MaterialIcons name="notifications-none" size={48} color={Colors.outlineVariant} />
            <Text style={styles.emptyText}>Không có thông báo nào</Text>
          </View>
        )}
      />

      <ItemDetailPopup 
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        item={selectedItem}
        onEdit={handleEdit}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitle: { 
    fontFamily: FontFamily.manropeBold, 
    fontSize: FontSize.headlineSm,
    color: Colors.onSurface,
  },
  listContent: { 
    paddingBottom: 24,
  },
  notifCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  unreadCard: {
    backgroundColor: Colors.primary + '12', // Màu nền xanh đậm hơn cho thông báo chưa đọc
    borderColor: Colors.primary + '40',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  info: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.bodyLg,
  },
  time: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.labelMd,
    color: Colors.outline,
  },
  desc: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.bodyMd,
    color: Colors.outline,
    marginTop: 12,
  },
  boldText: {
    fontFamily: FontFamily.interBold,
    fontWeight: 'bold',
    color: Colors.onSurface,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterBtnText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.labelLg,
    color: Colors.primary,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleSm,
    color: Colors.onSurface,
    marginBottom: 12,
    marginLeft: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  activeDropdownItem: {
    backgroundColor: Colors.primary + '10',
  },
  dropdownItemText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  activeDropdownItemText: {
    color: Colors.primary,
    fontFamily: FontFamily.interBold,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
  },
  sectionTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleSm,
    color: Colors.onSurface,
    opacity: 0.8,
  },
});
