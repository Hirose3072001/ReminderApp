import React from 'react';
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
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Colors, FontFamily, FontSize, Spacing, Radius, Elevation } from '../theme';
import { Button } from '../components/ui/Button';
import { useTaskStore, Priority } from '../store/taskStore';
import { cancelNotification } from '../services/notificationService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
  route: RouteProp<RootStackParamList, 'TaskDetail'>;
};

const priorityConfig: Record<Priority, { color: string; label: string; bg: string; emoji: string }> = {
  high: { color: '#BA1A1A', label: 'Ưu tiên cao', bg: '#FFDAD6', emoji: '🔴' },
  medium: { color: '#9E4300', label: 'Ưu tiên trung bình', bg: '#FFDBCB', emoji: '🟠' },
  low: { color: '#475E8C', label: 'Ưu tiên thấp', bg: '#D8E2FF', emoji: '🔵' },
};

const repeatLabels: Record<string, string> = {
  none: 'Không lặp lại',
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
};

export const TaskDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { taskId } = route.params;
  const { getTaskById, toggleComplete, deleteTask } = useTaskStore();
  const task = getTaskById(taskId);

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Không tìm thấy công việc</Text>
      </SafeAreaView>
    );
  }

  const priority = priorityConfig[task.priority];

  const handleDelete = () => {
    Alert.alert(
      'Xóa công việc',
      `Bạn chắc chắn muốn xóa "${task.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            if (task.reminder?.notificationId) {
              await cancelNotification(task.reminder.notificationId);
            }
            deleteTask(task.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, task.completed ? styles.statusDone : styles.statusPending]}>
            {task.completed ? '✅ Đã hoàn thành' : '⏳ Đang chờ'}
          </Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, task.completed && styles.titleDone]}>
          {task.title}
        </Text>

        {/* Description */}
        {task.description && (
          <Text style={styles.description}>{task.description}</Text>
        )}

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <View style={[styles.infoCard, { backgroundColor: priority.bg }]}>
            <Text style={styles.infoCardEmoji}>{priority.emoji}</Text>
            <Text style={[styles.infoCardLabel, { color: priority.color }]}>Ưu tiên</Text>
            <Text style={[styles.infoCardValue, { color: priority.color }]}>{priority.label}</Text>
          </View>

          {task.dueDate && (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardEmoji}>📅</Text>
              <Text style={styles.infoCardLabel}>Hạn chót</Text>
              <Text style={styles.infoCardValue}>
                {format(task.dueDate, 'dd/MM/yyyy', { locale: vi })}
              </Text>
            </View>
          )}
        </View>

        {/* Reminder section */}
        {task.reminder && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <Text style={styles.reminderIcon}>🔔</Text>
              <View>
                <Text style={styles.reminderTitle}>Nhắc lịch</Text>
                <Text style={styles.reminderTime}>
                  {format(task.reminder.time, 'HH:mm - EEEE, dd/MM/yyyy', { locale: vi })}
                </Text>
              </View>
            </View>
            {task.reminder.repeat !== 'none' && (
              <View style={styles.repeatBadge}>
                <Text style={styles.repeatText}>🔁 {repeatLabels[task.reminder.repeat]}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.timestamps}>
          <Text style={styles.ts}>
            Tạo lúc: {format(task.createdAt, 'dd/MM/yyyy HH:mm', { locale: vi })}
          </Text>
          <Text style={styles.ts}>
            Cập nhật: {format(task.updatedAt, 'dd/MM/yyyy HH:mm', { locale: vi })}
          </Text>
        </View>
      </ScrollView>

      {/* Action button */}
      <View style={styles.actionContainer}>
        <Button
          label={task.completed ? '↩ Đánh dấu chưa xong' : '✓ Đánh dấu hoàn thành'}
          onPress={() => toggleComplete(task.id)}
          variant={task.completed ? 'secondary' : 'primary'}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  notFound: {
    fontFamily: FontFamily.manropeSemiBold, fontSize: FontSize.bodyLg,
    color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 100,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceContainerLowest,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: Colors.onSurface },
  headerTitle: {
    fontFamily: FontFamily.manropeBold, fontSize: FontSize.titleMd, color: Colors.onSurface,
  },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { fontSize: 20 },
  content: { padding: Spacing[4], gap: Spacing[4], paddingBottom: 120 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: Spacing[3], paddingVertical: Spacing[1],
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.full,
  },
  statusText: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelLg },
  statusDone: { color: '#17754a' },
  statusPending: { color: Colors.onSurfaceVariant },
  title: {
    fontFamily: FontFamily.manropeExtraBold, fontSize: FontSize.headlineSm,
    color: Colors.onSurface, lineHeight: 36, letterSpacing: -0.5,
  },
  titleDone: { textDecorationLine: 'line-through', color: Colors.onSurfaceVariant },
  description: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.bodyLg,
    color: Colors.onSurfaceVariant, lineHeight: 26,
  },
  infoGrid: { flexDirection: 'row', gap: Spacing[3] },
  infoCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg, padding: Spacing[4], ...Elevation.floating,
  },
  infoCardEmoji: { fontSize: 24, marginBottom: Spacing[2] },
  infoCardLabel: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant, marginBottom: 2,
  },
  infoCardValue: {
    fontFamily: FontFamily.manropeSemiBold, fontSize: FontSize.bodyMd, color: Colors.onSurface,
  },
  reminderCard: {
    backgroundColor: Colors.primaryFixed, borderRadius: Radius.lg,
    padding: Spacing[4], gap: Spacing[3],
  },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  reminderIcon: { fontSize: 28 },
  reminderTitle: {
    fontFamily: FontFamily.manropeSemiBold, fontSize: FontSize.bodyLg, color: Colors.onSurface,
  },
  reminderTime: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant, textTransform: 'capitalize',
  },
  repeatBadge: {
    backgroundColor: Colors.primary, alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full,
  },
  repeatText: {
    fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelLg, color: Colors.onPrimary,
  },
  timestamps: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg,
    padding: Spacing[4], gap: Spacing[1],
  },
  ts: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant,
  },
  actionContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing[4], paddingBottom: Spacing[6],
    backgroundColor: Colors.surfaceContainerLowest,
  },
});
