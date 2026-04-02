import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Spacing, Radius, Elevation } from '../theme';
import { useTaskStore } from '../store/taskStore';
import { TaskCard } from '../components/task/TaskCard';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { loadTasks, toggleComplete, deleteTask, getActiveTasks, getCompletedTasks } = useTaskStore();
  const activeTasks = getActiveTasks();
  const completedTasks = getCompletedTasks();
  const today = new Date();

  useEffect(() => { loadTasks(); }, []);

  const upcomingToday = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    return format(t.dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <FlatList
        data={activeTasks}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Xin chào! 👋</Text>
                <Text style={styles.dateText}>
                  {format(today, 'EEEE, dd MMMM yyyy', { locale: vi })}
                </Text>
              </View>
            </View>

            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCard}
            >
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{activeTasks.length}</Text>
                <Text style={styles.statLabel}>Việc cần làm</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{upcomingToday.length}</Text>
                <Text style={styles.statLabel}>Hôm nay</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{completedTasks.length}</Text>
                <Text style={styles.statLabel}>Hoàn thành</Text>
              </View>
            </LinearGradient>

            {activeTasks.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Công việc đang chờ</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionCount}>{activeTasks.length}</Text>
                </View>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => (navigation as any).navigate('TaskDetail', { taskId: item.id })}
            onToggleComplete={() => toggleComplete(item.id)}
            onDelete={() => deleteTask(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>Không có việc gì!</Text>
            <Text style={styles.emptySubtitle}>
              Tất cả công việc đã hoàn thành{'\n'}hoặc thêm task mới để bắt đầu
            </Text>
          </View>
        }
        ListFooterComponent={
          completedTasks.length > 0 ? (
            <View style={styles.completedSection}>
              <Text style={styles.sectionTitle}>Đã hoàn thành ({completedTasks.length})</Text>
              {completedTasks.slice(0, 5).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => (navigation as any).navigate('TaskDetail', { taskId: task.id })}
                  onToggleComplete={() => toggleComplete(task.id)}
                />
              ))}
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => (navigation as any).navigate('AddTask')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryContainer]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  listContent: { paddingBottom: 100 },
  header: {
    paddingHorizontal: Spacing[4], paddingTop: Spacing[4], paddingBottom: Spacing[6],
  },
  greeting: {
    fontFamily: FontFamily.manropeBold, fontSize: FontSize.titleLg, color: Colors.onSurface,
  },
  dateText: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant, marginTop: Spacing[1], textTransform: 'capitalize',
  },
  statsCard: {
    marginHorizontal: Spacing[4], borderRadius: Radius.xl, padding: Spacing[5],
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[6],
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontFamily: FontFamily.manropeExtraBold, fontSize: FontSize.headlineSm, color: Colors.white,
  },
  statLabel: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.labelSm,
    color: 'rgba(255,255,255,0.8)', marginTop: 2,
  },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3], gap: Spacing[2],
  },
  sectionTitle: {
    fontFamily: FontFamily.manropeSemiBold, fontSize: FontSize.titleSm, color: Colors.onSurface,
    paddingHorizontal: Spacing[4], marginTop: Spacing[4], marginBottom: Spacing[3],
  },
  sectionBadge: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing[2], paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sectionCount: {
    fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.onPrimary,
  },
  emptyState: {
    alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing[8],
  },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing[4] },
  emptyTitle: {
    fontFamily: FontFamily.manropeBold, fontSize: FontSize.titleLg,
    color: Colors.onSurface, marginBottom: Spacing[2],
  },
  emptySubtitle: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22,
  },
  completedSection: { marginTop: Spacing[6] },
  fab: {
    position: 'absolute', bottom: Spacing[8], right: Spacing[4],
    borderRadius: Radius.full, overflow: 'hidden', ...Elevation.modal,
  },
  fabGradient: {
    width: 60, height: 60, alignItems: 'center', justifyContent: 'center',
  },
  fabIcon: { fontSize: 30, color: Colors.white, lineHeight: 34 },
});
