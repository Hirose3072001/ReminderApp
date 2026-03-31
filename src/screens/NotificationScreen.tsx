import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TouchableWithoutFeedback, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useReminderStore } from '../store/useReminderStore';
import { format, formatDistanceToNow, isAfter, isBefore, addHours, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ItemDetailPopup } from '../components/schedule/ItemDetailPopup';
import { Reminder } from '../database/queries';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { generateTriggersFromRules } from '../utils/reminderUtils';

export const NotificationScreen = () => {
  const { reminders, loadReminders } = useReminderStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [now, setNow] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<Reminder | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [showFilter, setShowFilter] = useState(false);

  const FILTERS = ['Tất cả', 'Nhắc lịch', 'Đã hoàn thành', 'Đã quá hạn', 'Mốc thời gian'];

  useEffect(() => {
    loadReminders();
    // Refresh every minute to update the feed as time passes
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [loadReminders]);

  const notifications = useMemo(() => {
    const list: any[] = [];
    const threshold = addHours(now, 24);
    const recentThreshold = addHours(now, -24);

    const formatRelativeTime = (date: Date) => {
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      
      // If within 60 seconds (past or future), show "bây giờ"
      if (Math.abs(diffSec) < 60) return 'bây giờ';
      
      return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    };

    reminders.forEach((r: Reminder) => {
      const updatedAt = parseISO(r.updatedAt);
      const dueDate = parseISO(r.dueDate);
      const endTime = r.endTime ? parseISO(r.endTime) : dueDate;

      // 1. Đã hoàn thành (Completed)
      if (r.completed === 1 && isAfter(updatedAt, recentThreshold)) {
        list.push({
          id: `completed-${r.id}`,
          reminder: r,
          title: 'Đã hoàn thành',
          desc: `Chúc mừng bạn đã hoàn thành trọn vẹn "${r.title}"`,
          time: formatRelativeTime(updatedAt),
          rawTime: updatedAt,
          type: 'success',
          icon: 'check-circle'
        });
      }

      // 2. Đã quá hạn (Overdue) - Only for tasks
      if (r.type === 'task' && r.completed === 0 && isBefore(endTime, now) && isAfter(endTime, recentThreshold)) {
        list.push({
          id: `overdue-${r.id}`,
          reminder: r,
          title: 'Đã quá hạn',
          desc: `Công việc "${r.title}" đã quá hạn chót`,
          time: formatRelativeTime(endTime),
          rawTime: endTime,
          type: 'error',
          icon: 'error'
        });
      }

      // 3. Mốc thời gian (Deadline passed)
      if (r.completed === 0 && isAfter(endTime, recentThreshold) && isBefore(endTime, now)) {
        list.push({
          id: `deadline-${r.id}`,
          reminder: r,
          title: 'Mốc thời gian',
          desc: `Đã đến hạn chót của ${r.type === 'event' ? 'sự kiện' : 'công việc'} "${r.title}"`,
          time: formatRelativeTime(endTime),
          rawTime: endTime,
          type: 'info',
          icon: 'event-busy'
        });
      }

      // 4. Bắt đầu (Start time)
      if (r.completed === 0 && isAfter(dueDate, recentThreshold) && isBefore(dueDate, threshold)) {
        const isPast = isBefore(dueDate, now);
        list.push({
          id: `start-${r.id}`,
          reminder: r,
          title: 'Nhắc lịch',
          desc: isPast 
            ? `${r.type === 'event' ? 'Sự kiện' : 'Công việc'} "${r.title}" đã bắt đầu`
            : `${r.type === 'event' ? 'Sự kiện' : 'Công việc'} "${r.title}" sắp bắt đầu`,
          time: formatRelativeTime(dueDate),
          rawTime: dueDate,
          type: 'info',
          icon: isPast ? 'play-circle-outline' : 'schedule'
        });
      }

      // 5. Nhắc lịch (Reminder Rules - Recurring)
      const ruleTriggers = generateTriggersFromRules(r.reminderRules as string | null, dueDate, endTime, r.title, r.type as any);
      
      // If no rules, fall back to reminderTime (legacy or simple)
      if (ruleTriggers.length === 0 && r.reminderTime) {
        ruleTriggers.push({
          date: parseISO(r.reminderTime),
          body: r.type === 'event' ? `Sự kiện "${r.title}"` : `Công việc "${r.title}" chưa hoàn thành`,
          title: 'Nhắc lịch'
        });
      }

      ruleTriggers.forEach((trigger, idx) => {
        const triggerTime = trigger.date;
        // For "Nhắc lịch", only show if it has "fired" (up to 1 min before is OK)
        if (r.completed === 0 && isBefore(triggerTime, addHours(now, 0.02)) && isAfter(triggerTime, recentThreshold)) {
          list.push({
            id: `reminder-${r.id}-${idx}`,
            reminder: r,
            title: 'Nhắc lịch',
            desc: trigger.body,
            time: formatRelativeTime(triggerTime),
            rawTime: triggerTime,
            priority: 10,
            type: 'info',
            icon: 'notifications-active'
          });
        }
      });
    });

    // Sort by most recent, then by priority
    const sorted = list.sort((a, b) => {
      const timeDiff = b.rawTime.getTime() - a.rawTime.getTime();
      if (timeDiff !== 0) return timeDiff;
      return (b.priority || 0) - (a.priority || 0);
    });

    // Filter logic
    let listToGroup = [];
    if (activeFilter === 'Tất cả') {
      listToGroup = sorted;
    } else {
      listToGroup = sorted.filter(item => {
        if (activeFilter === 'Nhắc lịch') {
          return item.title === 'Nhắc lịch' || 
                 item.title === 'Sắp bắt đầu' || 
                 item.title === 'Đã bắt đầu' || 
                 item.title === 'Sắp diễn ra' || 
                 item.title === 'Đang diễn ra';
        }
        return item.title === activeFilter;
      });
    }

    // Group into sections
    const groups: { [key: string]: any[] } = {};
    listToGroup.forEach(item => {
      let dateLabel = '';
      const d = item.rawTime;
      if (isToday(d)) dateLabel = 'Hôm nay';
      else if (isYesterday(d)) dateLabel = 'Hôm qua';
      else {
        dateLabel = format(d, 'EEEE, dd/MM/yyyy', { locale: vi });
        dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
      }

      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(item);
    });

    return Object.keys(groups).map(title => ({
      title,
      data: groups[title]
    }));
  }, [reminders, now, activeFilter]);

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

  const renderItem = ({ item }: { item: any }) => {
    let iconColor: string = Colors.primary;
    
    if (item.type === 'success') iconColor = '#2E7D32'; 
    else if (item.type === 'error' || item.title === 'Mốc thời gian' || item.id.startsWith('deadline')) iconColor = '#C62828'; 
    else if (item.desc.includes('đã bắt đầu') || item.title === 'Đã bắt đầu') iconColor = '#2E7D32'; 
    else if (item.desc.includes('đang diễn ra') || item.title === 'Đang diễn ra') iconColor = '#F9A825'; 
    else if (item.type === 'warning') iconColor = '#F9A825';
    else if (item.type === 'info') iconColor = Colors.primary;

    return (
      <TouchableOpacity 
        style={styles.notifCard}
        onPress={() => {
          if (item.reminder) {
            setSelectedItem(item.reminder);
            setPopupVisible(true);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: iconColor + '15' }]}>
          <MaterialIcons name={item.icon as any} size={24} color={iconColor} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: iconColor }]}>{item.title}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          {renderDescription(item.desc)}
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
