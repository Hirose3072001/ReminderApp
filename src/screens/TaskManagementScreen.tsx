import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Animated, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { useReminderStore } from '../store/useReminderStore';
import { MultiActionFAB } from '../components/ui/MultiActionFAB';
import { MaterialIcons } from '@expo/vector-icons';
import { Reminder } from '../database/queries';
import { ItemDetailPopup } from '../components/schedule/ItemDetailPopup';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale/vi';

export const TaskManagementScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { reminders, loadReminders } = useReminderStore();
  const [selectedItem, setSelectedItem] = useState<Reminder | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'completed' | 'overdue'>('incomplete');

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Group only tasks by date and filter by status
  const now = new Date();
  const tasksOnly = reminders.filter(item => {
    if (item.type !== 'task') return false;
    
    const deadlineStr = item.endTime || item.dueDate;
    const deadline = new Date(deadlineStr);
    
    if (filterStatus === 'incomplete') return item.completed === 0 && deadline >= now;
    if (filterStatus === 'completed') return item.completed === 1;
    if (filterStatus === 'overdue') return item.completed === 0 && deadline < now;
    
    return true;
  }).sort((a,b) => {
    const tA = a.endTime || a.dueDate;
    const tB = b.endTime || b.dueDate;
    return new Date(tA).getTime() - new Date(tB).getTime();
  });
  
  const groupedTasks = tasksOnly.reduce((acc: any, item) => {
    const targetDateStr = item.endTime || item.dueDate;
    if (!targetDateStr) return acc;
    const date = targetDateStr.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const sections = Object.keys(groupedTasks)
    .sort()
    .map(date => ({
      title: date,
      data: groupedTasks[date],
    }));

  const getPriorityColor = (priority: string, isEvent: boolean) => {
    if (isEvent) return '#1A73E8'; // Blue for events
    switch (priority) {
      case 'high': 
      case 'urgent': return '#C62828'; // Đỏ tối
      case 'medium': return '#B8860B'; // Vàng tối
      case 'low': return '#2E7D32';   // Xanh lá tối
      default: return '#B8860B';
    }
  };

  const getSubtaskStats = (desc: string | null) => {
    if (!desc) return { total: 0, completed: 0 };
    const parts = desc.split('[Nhiệm vụ cần làm]');
    if (parts.length < 2) return { total: 0, completed: 0 };
    const taskPart = parts[1].split('[Người tham gia]:')[0];
    const lines = taskPart.split('\n').map(s => s.trim()).filter(s => s.startsWith('-'));
    const total = lines.length;
    const completed = lines.filter(l => l.includes('[x]')).length;
    return { total, completed };
  };

  const getEventFormat = (desc: string | null) => {
    if (!desc) return '';
    const match = desc.match(/Hình thức:\s*(.*)/i);
    return match ? match[1].split('\n')[0].trim() : '';
  };

  const cleanDescription = (desc: string | null) => {
    if (!desc) return '';
    return desc
      .replace(/\[Nhiệm vụ cần làm\][\s\S]*|--- Thông tin thêm ---[\s\S]*|\[Người tham gia\]:[\s\S]*/g, '')
      .trim();
  };

  const getStatusLabel = (date: string) => {
    const d = parseISO(date);
    if (isToday(d)) return 'Hôm nay';
    if (isTomorrow(d)) return 'Ngày mai';
    return format(d, 'EEEE, dd/MM/yyyy', { locale: vi });
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{getStatusLabel(title)}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={24} color={Colors.outline} />
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Reminder }) => {
    const isCompleted = item.completed === 1;
    const isEvent = item.type === 'event';
    const accentColor = getPriorityColor(item.priority, isEvent);
    
    // Parse times for display
    const deadlineStr = item.endTime || item.dueDate;
    const deadlineTimeStr = deadlineStr ? format(parseISO(deadlineStr), 'HH:mm') : '--:--';

    const stats = getSubtaskStats(item.description);
    const displayDesc = cleanDescription(item.description);
    const eventFormatFlag = isEvent ? getEventFormat(item.description) : '';

    return (
      <TouchableOpacity 
        style={[
            styles.taskCard, 
            { borderLeftColor: accentColor },
            isCompleted && styles.taskCardCompleted
        ]}
        activeOpacity={0.7}
        onPress={() => setSelectedItem(item)}
      >
        <View style={styles.cardMain}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[styles.taskTitle, { color: accentColor }, isCompleted && styles.textCompleted]} numberOfLines={1}>
              Hạn: {deadlineTimeStr} {item.title}
            </Text>
            {(() => {
              const deadlineStr = (item.type === 'task' && item.endTime) ? item.endTime : item.dueDate;
              const isOverdue = !isCompleted && deadlineStr && new Date(deadlineStr) < new Date();
              let sInfo = { label: 'Đang thực hiện', color: '#1A73E8', bgColor: '#E0F2FE' };
              if (isCompleted) sInfo = { label: 'Đã hoàn thành', color: '#2E7D32', bgColor: '#DCFCE7' };
              else if (isOverdue) sInfo = { label: 'Quá hạn', color: '#C62828', bgColor: '#FEE2E2' };
              return (
                <View style={{ backgroundColor: sInfo.bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                  <Text style={{ fontFamily: FontFamily.interBold, fontSize: 9, color: sInfo.color }}>{sInfo.label}</Text>
                </View>
              );
            })()}
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
             <MaterialIcons name="assignment" size={14} color={accentColor} />
             <Text style={{ color: accentColor, fontFamily: FontFamily.interBold, fontSize: 11 }}>
                Công việc
             </Text>
          </View>

          <Text style={{ fontFamily: FontFamily.interRegular, fontSize: 11, color: accentColor, marginTop: 4 }} numberOfLines={2}>
            <Text style={{ fontFamily: FontFamily.interBold }}>Mô tả: </Text>{displayDesc}
          </Text>

          <Text style={{ color: accentColor, fontFamily: FontFamily.interBold, fontSize: 11, marginTop: 6 }}>
            Nhiệm vụ cần làm({stats.completed}/{stats.total})
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <MaterialIcons name="assignment" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Quản lý công việc</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcons name="search" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterVisible(true)}>
            <MaterialIcons name="tune" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment-turned-in" size={60} color={Colors.outlineVariant} />
            <Text style={styles.emptyText}>Tuyệt vời! Bạn không có công việc nào.</Text>
          </View>
        )}
      />

      <MultiActionFAB />

      <ItemDetailPopup 
        item={selectedItem}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          setSelectedItem(null);
          navigation.navigate('AddTask', { type: item.type, editItem: item });
        }}
      />

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setFilterVisible(false)}
        >
          <View style={styles.filterModalContent}>
            <Text style={styles.modalTitle}>Lọc trạng thái</Text>
            
            {[
              { id: 'incomplete', label: 'Đang thực hiện' },
              { id: 'completed', label: 'Đã hoàn thành' },
              { id: 'overdue', label: 'Quá hạn' },
              { id: 'all', label: 'Tất cả' },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  filterStatus === option.id && styles.modalOptionActive
                ]}
                onPress={() => {
                  setFilterStatus(option.id as any);
                  setFilterVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  filterStatus === option.id && styles.modalOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {filterStatus === option.id && (
                  <MaterialIcons name="check" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FAFAFB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { 
    fontFamily: FontFamily.manropeBold, 
    fontSize: 20, 
    color: '#000' 
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    marginLeft: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionBar: {
    width: 4,
    height: 24,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: FontFamily.manropeBold,
    fontSize: 20,
    color: '#000',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  cardMain: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    fontFamily: FontFamily.interBold,
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.onSurfaceVariant,
  },
  moreBtn: {
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontFamily: FontFamily.interMedium,
    fontSize: 13,
    color: '#5F6368',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    marginTop: 16,
    textAlign: 'center',
  },
  // Modal Filter
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterModalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontFamily: FontFamily.manropeBold, fontSize: FontSize.titleMd, color: Colors.onSurface, marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalOptionActive: { backgroundColor: 'rgba(26,115,232,0.05)', borderRadius: 8, paddingHorizontal: 12, borderBottomWidth: 0 },
  modalOptionText: { fontFamily: FontFamily.interMedium, fontSize: FontSize.bodyLg, color: Colors.onSurfaceVariant },
  modalOptionTextActive: { color: Colors.primary, fontFamily: FontFamily.interBold },
});
