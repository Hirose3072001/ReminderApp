import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing, Elevation } from '../../theme';
import { Task, Priority } from '../../store/taskStore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onDelete?: () => void;
}

const priorityConfig: Record<Priority, { color: string; label: string; bg: string }> = {
  high: { color: '#BA1A1A', label: 'Cao', bg: '#FFDAD6' },
  medium: { color: '#9E4300', label: 'TB', bg: '#FFDBCB' },
  low: { color: '#475E8C', label: 'Thấp', bg: '#D8E2FF' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onToggleComplete,
  onDelete,
}) => {
  const priority = priorityConfig[task.priority];

  return (
    <View style={[styles.card, task.completed && styles.cardCompleted]}>
      <TouchableOpacity
        style={styles.inner}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Checkbox */}
        <TouchableOpacity style={styles.checkbox} onPress={onToggleComplete} hitSlop={12}>
          <View style={[styles.checkOuter, task.completed && styles.checkOuterCompleted]}>
            {task.completed && <View style={styles.checkInner} />}
          </View>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, task.completed && styles.titleCompleted]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            <View style={[styles.priorityPill, { backgroundColor: priority.bg }]}>
              <Text style={[styles.priorityLabel, { color: priority.color }]}>
                {priority.label}
              </Text>
            </View>
          </View>

          {task.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {task.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {(task.endTime || task.dueDate) && (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  📅 {format(task.endTime || task.dueDate!, 'dd MMM', { locale: vi })}
                </Text>
              </View>
            )}
            {task.reminder && (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  🔔 {format(task.reminder.time, 'HH:mm')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    ...Elevation.floating,
  },
  cardCompleted: { opacity: 0.65 },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing[4],
  },
  checkbox: { marginRight: Spacing[3], marginTop: 2 },
  checkOuter: {
    width: 22, height: 22, borderRadius: Radius.full,
    borderWidth: 2, borderColor: Colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOuterCompleted: {
    borderColor: Colors.primary, backgroundColor: Colors.primaryContainer,
  },
  checkInner: {
    width: 12, height: 12, borderRadius: Radius.full, backgroundColor: Colors.onPrimary,
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2], marginBottom: Spacing[1],
  },
  title: {
    flex: 1, fontFamily: FontFamily.manropeSemiBold, fontSize: FontSize.bodyLg,
    color: Colors.onSurface, lineHeight: 22,
  },
  titleCompleted: {
    textDecorationLine: 'line-through', color: Colors.onSurfaceVariant,
  },
  description: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant, marginBottom: Spacing[2],
  },
  priorityPill: {
    paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full,
  },
  priorityLabel: {
    fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelSm,
  },
  metaRow: {
    flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap', marginTop: Spacing[1],
  },
  metaChip: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.full,
    paddingHorizontal: Spacing[2], paddingVertical: 2,
  },
  metaText: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant,
  },
});
