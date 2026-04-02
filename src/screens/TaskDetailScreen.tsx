import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Colors, FontFamily, FontSize, Spacing, Radius, Elevation } from '../theme';
import { Button } from '../components/ui/Button';
import { useReminderStore } from '../store/useReminderStore';
import { cancelTaskNotifications } from '../services/notificationService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
  route: RouteProp<RootStackParamList, 'TaskDetail'>;
};

// Utils for parsing description (Mirroring ItemDetailPopup)
const parseTaskDescription = (desc: string) => {
  if (!desc) return { mainDesc: '', subtasks: [], participants: [] };
  const parts = desc.split('[Nhiệm vụ cần làm]');
  let mainDesc = parts[0].trim();
  let subtasks: { text: string, completed: boolean }[] = [];
  let participants: string[] = [];
  
  if (parts.length > 1) {
    const afterTasks = parts[1];
    const pParts = afterTasks.split('[Người tham gia]:');
    const taskPart = pParts[0];
    
    subtasks = taskPart.split('\n')
      .map(s => s.trim())
      .filter(s => s.startsWith('-'))
      .map(s => {
         const completed = s.includes('[x]');
         const text = s.replace(/^- (\s*\[[x\s]\])? ?/, '').trim();
         return { text, completed };
      });
      
    if (pParts.length > 1) {
       participants = pParts[1].split(',').map(s => s.trim()).filter(Boolean);
    }
  } else {
    const pParts = mainDesc.split('[Người tham gia]:');
    if (pParts.length > 1) {
       mainDesc = pParts[0].trim();
       participants = pParts[1].split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  
  return { mainDesc, subtasks, participants };
};

const buildTaskDescription = (mainDesc: string, subtasks: { text: string, completed: boolean }[], participants: string[]) => {
  let res = mainDesc;
  if (subtasks.length > 0) {
    res += `\n\n[Nhiệm vụ cần làm]\n` + subtasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n');
  }
  if (participants.length > 0) {
    res += `\n\n[Người tham gia]: ` + participants.join(', ');
  }
  return res.trim();
};

export const TaskDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { id } = (route.params as any); // Adapt to id from types.ts
  const { reminders, toggleStatus, updateDescription, removeReminder } = useReminderStore();
  
  const reminder = reminders.find(r => r.id === id);

  if (!reminder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chi tiết</Text>
            <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContent}>
            <MaterialIcons name="search-off" size={64} color={Colors.outlineVariant} />
            <Text style={styles.notFound}>Không tìm thấy công việc này</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isTask = reminder.type === 'task';
  const { mainDesc, subtasks, participants } = parseTaskDescription(reminder.description || '');
  const allSubtasksDone = subtasks.length === 0 || subtasks.every(s => s.completed);

  const priorityConfig = {
    high: { color: '#C62828', label: 'Cao', emoji: '🔴' },
    medium: { color: '#B8860B', label: 'Trung bình', emoji: '🟠' },
    low: { color: '#2E7D32', label: 'Thấp', emoji: '🔵' },
  };
  const priority = priorityConfig[reminder.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  const handleDelete = () => {
    Alert.alert(
      'Xóa mục này',
      `Bạn chắc chắn muốn xóa "${reminder.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            removeReminder(reminder.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const toggleSubtask = (idx: number) => {
    const newSubtasks = [...subtasks];
    newSubtasks[idx].completed = !newSubtasks[idx].completed;
    const newDesc = buildTaskDescription(mainDesc, newSubtasks, participants);
    updateDescription(reminder.id, newDesc);
  };

  const handleToggleComplete = () => {
    if (isTask && !allSubtasksDone && reminder.completed === 0) {
        Alert.alert('Chưa hoàn thành', 'Bạn cần hoàn thành tất cả nhiệm vụ con trước khi đánh dấu là đã xong.');
        return;
    }
    toggleStatus(reminder.id, reminder.completed);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isTask ? 'Chi tiết công việc' : 'Chi tiết sự kiện'}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <MaterialIcons name="delete-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, reminder.completed ? styles.statusDone : styles.statusPending]}>
            {reminder.completed ? '✅ Đã hoàn thành' : '⏳ Đang chờ thực hiện'}
          </Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, reminder.completed === 1 && styles.titleDone]}>
          {reminder.title}
        </Text>

        {/* Description */}
        {mainDesc ? (
           <View style={styles.section}>
             <Text style={styles.sectionLabel}>MÔ TẢ</Text>
             <Text style={styles.description}>{mainDesc}</Text>
           </View>
        ) : null}

        {/* Checklist */}
        {subtasks.length > 0 && (
           <View style={styles.section}>
             <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>NHIỆM VỤ CẦN LÀM ({subtasks.filter(s => s.completed).length}/{subtasks.length})</Text>
             </View>
             <View style={styles.checklistContainer}>
                {subtasks.map((st, idx) => (
                    <TouchableOpacity 
                        key={idx} 
                        style={styles.subtaskRow}
                        onPress={() => toggleSubtask(idx)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons 
                            name={st.completed ? "check-circle" : "radio-button-unchecked"} 
                            size={22} 
                            color={st.completed ? Colors.primary : Colors.outlineVariant} 
                        />
                        <Text style={[styles.subtaskText, st.completed && styles.strikethrough]}>
                            {st.text}
                        </Text>
                    </TouchableOpacity>
                ))}
             </View>
           </View>
        )}

        {/* Info Grid */}
        <View style={styles.infoGrid}>
           <View style={[styles.infoCard, { borderLeftColor: priority.color, borderLeftWidth: 4 }]}>
                <Text style={styles.infoTitle}>Mức độ ưu tiên</Text>
                <View style={styles.flexRow}>
                    <Text style={{ fontSize: 18, marginRight: 4 }}>{priority.emoji}</Text>
                    <Text style={[styles.infoValue, { color: priority.color }]}>{priority.label}</Text>
                </View>
           </View>

           <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Thời gian</Text>
                <View style={styles.flexRow}>
                    <MaterialIcons name="event" size={18} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.infoValue}>{format(parseISO(reminder.dueDate), 'dd/MM/yyyy')}</Text>
                </View>
                <View style={[styles.flexRow, { marginTop: 2 }]}>
                    <MaterialIcons name="access-time" size={18} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.infoValue}>{format(parseISO(reminder.dueDate), 'HH:mm')}</Text>
                </View>
           </View>
        </View>

        {/* Participants */}
        {participants.length > 0 && (
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>NGƯỜI THAM GIA</Text>
                <View style={styles.participantRow}>
                    {participants.map((p, i) => (
                        <View key={i} style={styles.participantChip}>
                            <Text style={styles.participantText}>{p}</Text>
                        </View>
                    ))}
                </View>
            </View>
        )}
      </ScrollView>

      {/* Action button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
            style={[
                styles.mainBtn, 
                reminder.completed === 1 ? styles.btnSecondary : styles.btnPrimary,
                (isTask && !allSubtasksDone && reminder.completed === 0) && { opacity: 0.5 }
            ]}
            onPress={handleToggleComplete}
        >
          <Text style={[styles.mainBtnText, reminder.completed === 1 && { color: Colors.primary }]}>
            {reminder.completed === 1 ? '↩ Đánh dấu chưa xong' : '✓ Hoàn thành mục này'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F3F5',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: FontFamily.manropeBold, fontSize: 18, color: Colors.onSurface },
  deleteBtn: { padding: 8 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  notFound: { fontFamily: FontFamily.manropeSemiBold, fontSize: 16, color: Colors.outline, marginTop: 16 },
  content: { padding: 20, paddingBottom: 120 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#F8F9FA', borderRadius: 8, marginBottom: 16 },
  statusText: { fontFamily: FontFamily.interSemiBold, fontSize: 12 },
  statusDone: { color: '#2E7D32' },
  statusPending: { color: Colors.primary },
  title: { fontFamily: FontFamily.manropeExtraBold, fontSize: 26, color: Colors.onSurface, lineHeight: 34, marginBottom: 20 },
  titleDone: { textDecorationLine: 'line-through', color: Colors.outline },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontFamily: FontFamily.interBold, fontSize: 11, color: Colors.outline, letterSpacing: 1 },
  description: { fontFamily: FontFamily.interRegular, fontSize: 15, color: Colors.onSurfaceVariant, lineHeight: 24 },
  checklistContainer: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 16 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  subtaskText: { flex: 1, fontFamily: FontFamily.interMedium, fontSize: 14, color: Colors.onSurface, marginLeft: 12 },
  strikethrough: { textDecorationLine: 'line-through', color: Colors.outline },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F3F5', ...Elevation.floating },
  infoTitle: { fontFamily: FontFamily.interMedium, fontSize: 12, color: Colors.outline, marginBottom: 4 },
  infoValue: { fontFamily: FontFamily.manropeBold, fontSize: 15, color: Colors.onSurface },
  flexRow: { flexDirection: 'row', alignItems: 'center' },
  participantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E0F2FE', borderRadius: 8 },
  participantText: { fontFamily: FontFamily.interMedium, fontSize: 12, color: '#1A73E8' },
  actionContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F3F5' },
  mainBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: { backgroundColor: '#F0F7FF', borderWidth: 1, borderColor: Colors.primary },
  mainBtnText: { fontFamily: FontFamily.interBold, fontSize: 16, color: '#FFFFFF' },
});
