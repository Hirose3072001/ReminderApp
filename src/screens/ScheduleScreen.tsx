import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useReminderStore } from '../store/useReminderStore';
import { MultiActionFAB } from '../components/ui/MultiActionFAB';
import { ItemDetailPopup } from '../components/schedule/ItemDetailPopup';
import { Reminder } from '../database/queries';
import { format, addDays, startOfWeek, isSameDay, isToday, differenceInWeeks } from 'date-fns';
import { vi } from 'date-fns/locale/vi';
import { useNavigation } from '@react-navigation/native';
import { parseLocalDate, getPriorityInfo } from '../utils/reminderUtils';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

// Cấu hình ngôn ngữ tiếng Việt cho Lịch
LocaleConfig.locales['vi'] = {
  monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  monthNamesShort: ['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'],
  dayNames: ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'],
  dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'],
  today: 'Hôm nay'
};
LocaleConfig.defaultLocale = 'vi';

export const ScheduleScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Reminder | null>(null);

  const { reminders, loadReminders } = useReminderStore();
  const [now, setNow] = useState(new Date());
  
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const weekListRef = useRef<FlatList>(null);
  const [isInternalScroll, setIsInternalScroll] = useState(false);

  // Generate a range of 100 weeks (50 back, 50 forward)
  const weekData = useMemo(() => {
    const today = new Date();
    const startOfAnchor = startOfWeek(today, { weekStartsOn: 1 });
    const weeks = [];
    for (let i = -50; i <= 50; i++) {
      weeks.push(addDays(startOfAnchor, i * 7));
    }
    return weeks;
  }, []);

  const getWeekIndex = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    const startOfTarget = startOfWeek(date, { weekStartsOn: 1 });
    return weekData.findIndex(w => isSameDay(w, startOfTarget));
  };

  useEffect(() => {
    loadReminders();
    // Refresh current time every minute for the timeline indicator
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [loadReminders]);

  // Sync scroll position when selectedDate changes (external source like Month view)
  useEffect(() => {
    if (viewMode === 'week' && !isInternalScroll) {
      const idx = getWeekIndex(selectedDate);
      if (idx !== -1) {
        // Use a small delay to ensure FlatList is ready
        setTimeout(() => {
          weekListRef.current?.scrollToIndex({ index: idx, animated: false });
        }, 100);
      }
    }
    setIsInternalScroll(false);
  }, [selectedDate, viewMode]);

  const filteredReminders = reminders
    .filter(r => {
      const targetDateStr = (r.type === 'task' && r.endTime) ? r.endTime : r.dueDate;
      // Trích xuất ngày địa phương từ chuỗi UTC ISO
      const localDateStr = targetDateStr ? format(new Date(targetDateStr), 'yyyy-MM-dd') : null;
      return localDateStr === selectedDate;
    })
    .sort((a,b) => {
      const tA = (a.type === 'task' && a.endTime) ? a.endTime : a.dueDate;
      const tB = (b.type === 'task' && b.endTime) ? b.endTime : b.dueDate;
      return new Date(tA!).getTime() - new Date(tB!).getTime();
    });

  // --- UTILS ---
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

  const getStatusInfo = (rem: any) => {
    const isDone = rem.completed === 1;
    const deadlineStr = (rem.type === 'task' && rem.endTime) ? rem.endTime : rem.dueDate;
    const isOverdue = !isDone && deadlineStr && new Date(deadlineStr) < new Date();
    
    if (isDone) return { label: 'Đã hoàn thành', color: '#2E7D32', bgColor: '#DCFCE7' };
    if (isOverdue) return { label: 'Quá hạn', color: '#C62828', bgColor: '#FEE2E2' };
    return { label: 'Đang thực hiện', color: '#1A73E8', bgColor: '#E0F2FE' };
  };

  // --- MONTH VIEW LOGIC ---
  const markedDates: any = {};
  reminders.forEach(r => {
    const targetDate = (r.type === 'task' && r.endTime) ? r.endTime : r.dueDate;
    if (targetDate) {
      // Chuyển đổi sang ngày địa phương để hiển thị chấm trên lịch
      const dateStr = format(new Date(targetDate), 'yyyy-MM-dd');
      if (!markedDates[dateStr]) {
        markedDates[dateStr] = { dots: [] };
      }
      if (markedDates[dateStr].dots.length < 3) {
        // Công việc = Cam (Colors.tertiaryContainer hoặc #c55500), Sự kiện = Xanh (Colors.primary)
        markedDates[dateStr].dots.push({
          key: r.id,
          color: r.type === 'task' ? (Colors.tertiaryContainer || '#c55500') : Colors.primary,
        });
      }
    }
  });
  const selColor = 'rgba(26, 115, 232, 0.15)';
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: selColor, selectedTextColor: Colors.primary };
  } else { 
    markedDates[selectedDate].selected = true; 
    markedDates[selectedDate].selectedColor = selColor;
    markedDates[selectedDate].selectedTextColor = Colors.primary;
  }

  const renderAgendaItem = ({ item }: { item: Reminder }) => {
    const isTask = item.type === 'task';
    const priorityColors: Record<string, string> = {
      high: '#C62828',
      medium: '#B8860B',
      low: '#2E7D32'
    };
    const priorityColor = priorityColors[item.priority] || (isTask ? '#B8860B' : '#1A73E8');
    const dominantColor = isTask ? priorityColor : '#1A73E8';
    const status = getStatusInfo(item);

    const stats = getSubtaskStats(item.description);
    const displayDesc = cleanDescription(item.description);
    const eventFormatFlag = !isTask ? getEventFormat(item.description) : '';

    const prioInfo = getPriorityInfo(item.priority);
    const eventIconColor = '#1A73E8';

    return (
      <TouchableOpacity 
        style={[styles.agendaItem, { borderLeftColor: dominantColor, paddingVertical: 12 }]}
        activeOpacity={0.8}
        onPress={() => setSelectedItem(item)}
      >
        <View style={styles.timeColumn}>
          <MaterialIcons name={isTask ? "fact-check" : "event"} size={20} color={dominantColor} style={{ marginBottom: 4 }} />
          <Text style={styles.timeText}>
            {isTask ? 'Hạn: ' : ''}
            {isTask && item.endTime 
              ? format(new Date(item.endTime), 'HH:mm') 
              : format(new Date(item.dueDate!), 'HH:mm')}
          </Text>
        </View>
        <View style={styles.infoColumn}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[styles.titleText, { color: dominantColor, flex: 1 }]}>{item.title}</Text>
            {isTask ? (
              <View style={{ backgroundColor: status.bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                <Text style={{ fontFamily: FontFamily.interBold, fontSize: 9, color: status.color }}>{status.label}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: prioInfo.bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                <Text style={{ fontFamily: FontFamily.interBold, fontSize: 9, color: prioInfo.color }}>{prioInfo.label}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <MaterialIcons name={isTask ? "assignment" : "stars"} size={14} color={isTask ? priorityColor : eventIconColor} />
            <Text style={[styles.descText, { color: isTask ? priorityColor : eventIconColor, fontFamily: FontFamily.interBold, fontSize: 11 }]}>
              {isTask ? 'Công việc' : 'Sự kiện'}
            </Text>
          </View>
          
          <Text style={[styles.descText, { marginTop: 4, color: dominantColor }]} numberOfLines={2}>
            <Text style={{ fontFamily: FontFamily.interBold }}>Mô tả: </Text>{displayDesc}
          </Text>

          {isTask ? (
            <Text style={[styles.valText, { color: dominantColor, fontSize: 11, marginTop: 4, fontFamily: FontFamily.interBold }]}>
              Nhiệm vụ cần làm({stats.completed}/{stats.total})
            </Text>
          ) : (
            <Text style={[styles.descText, { marginTop: 4, fontSize: 11, color: dominantColor }]}>
              <Text style={{ fontFamily: FontFamily.interBold }}>Hình thức: </Text>{eventFormatFlag}
            </Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
      </TouchableOpacity>
    );
  };

  // --- WEEK VIEW LOGIC (Daily Schedule) ---
  const renderWeekStrip = () => {
    const dayLabelsArr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const renderWeekItem = ({ item: weekStart }: { item: Date }) => {
      const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
      const selDateObj = parseLocalDate(selectedDate);

      return (
        <View style={{ width: SCREEN_WIDTH, flexDirection: 'row', justifyContent: 'space-between', gap: 6, paddingHorizontal: 16 }}>
          {days.map((day, idx) => {
             const isSelected = isSameDay(day, selDateObj);
             const isTodayReal = isToday(day);
             const dayLabel = dayLabelsArr[day.getDay()];
             return (
               <TouchableOpacity
                 key={idx}
                 style={[
                   styles.dayCard, 
                   isSelected && styles.dayCardSelected,
                   !isSelected && isTodayReal && { borderWidth: 1, borderColor: Colors.primary }
                 ]}
                 onPress={() => {
                   setIsInternalScroll(true);
                   setSelectedDate(format(day, 'yyyy-MM-dd'));
                 }}
               >
                 <Text style={[styles.dayCardLabel, isSelected && styles.dayCardLabelSelected, !isSelected && isTodayReal && { color: Colors.primary }]}>{dayLabel}</Text>
                 <Text style={[styles.dayCardDate, isSelected && styles.dayCardDateSelected, !isSelected && isTodayReal && { color: Colors.primary }]}>{format(day, 'd')}</Text>
                 {!isSelected && isTodayReal && <View style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary }} />}
               </TouchableOpacity>
             );
          })}
        </View>
      );
    };

    return (
      <View style={styles.weekStripContainer}>
        <FlatList
          ref={weekListRef}
          data={weekData}
          keyExtractor={(item) => item.toISOString()}
          renderItem={renderWeekItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            const newWeekStart = weekData[index];
            const currentSelected = parseLocalDate(selectedDate);
            const dayOfWeek = (currentSelected.getDay() + 6) % 7; // Convert to Mon-Sun (0-6)
            const newSelected = addDays(newWeekStart, dayOfWeek);
            
            setIsInternalScroll(true);
            setSelectedDate(format(newSelected, 'yyyy-MM-dd'));
          }}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialScrollIndex={getWeekIndex(selectedDate) !== -1 ? getWeekIndex(selectedDate) : 50}
        />
      </View>
    );
  };

  const renderTimeline = () => {
    const hours = Array.from({ length: 25 }).map((_, i) => i); // 00:00 to 24:00
    const HOUR_HEIGHT = 100;
    const isTodaySelected = isToday(parseLocalDate(selectedDate));
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    return (
      <ScrollView contentContainerStyle={styles.timelineScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.timelineInner}>
          {hours.map((hour) => {
             const itemsInThisHour = filteredReminders
                .filter(r => {
                  const targetDate = (r.type === 'task' && r.endTime) ? r.endTime : r.dueDate;
                  return !!targetDate && new Date(targetDate).getHours() === hour;
                })
                .sort((a,b) => {
                  const tA = (a.type === 'task' && a.endTime) ? a.endTime : a.dueDate;
                  const tB = (b.type === 'task' && b.endTime) ? b.endTime : b.dueDate;
                  return new Date(tA!).getTime() - new Date(tB!).getTime();
                });
             
             return (
               <View key={hour} style={[styles.hourRowWrap, { height: itemsInThisHour.length > 0 ? undefined : HOUR_HEIGHT, position: 'relative' }]}>
                 {isTodaySelected && hour === currentHour && (
                   <View style={[styles.currentTimeLine, { top: `${(currentMinutes / 60) * 100}%` }]}>
                     <View style={styles.currentTimeDot} />
                   </View>
                 )}
                 {/* Hour header line */}
                 <View style={styles.hourRowHeader}>
                   <Text style={styles.hourLabel}>{hour.toString().padStart(2, '0')}:00</Text>
                   <View style={styles.hourLine} />
                 </View>
                 
                 {/* Container for events/tasks */}
                 <View style={styles.hourItemsContainer}>
                   {itemsInThisHour.map((item) => {
                      const itemDate = new Date(item.dueDate!);
                      const min = itemDate.getMinutes();
                      
                      const priorityColors: Record<string, string> = {
                        high: '#C62828',
                        medium: '#B8860B',
                        low: '#2E7D32'
                      };
                      const isTask = item.type === 'task';
                      const priorityColor = priorityColors[item.priority] || (isTask ? '#B8860B' : '#1A73E8');
                      const color = isTask ? priorityColor : '#1A73E8';
                      const bgColor = isTask ? `${color}15` : '#E8F0FE';
                      const status = getStatusInfo(item);

                      const stats = getSubtaskStats(item.description);
                      const displayDesc = cleanDescription(item.description);
                      const eventFormatFlag = !isTask ? getEventFormat(item.description) : '';

                      const prioInfo = getPriorityInfo(item.priority);

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.timelineItemWrap, { backgroundColor: bgColor, borderLeftColor: color, marginTop: 12, paddingVertical: 14 }]}
                          activeOpacity={0.9}
                          onPress={() => setSelectedItem(item)}
                        >
                          <View style={styles.timelineItemHeader}>
                             <View style={{ flex: 1 }}>
                               <Text style={[styles.timelineItemTitle, { color, fontSize: 16 }]} numberOfLines={1}>
                                 {isTask ? 'Hạn: ' : ''}
                                 {isTask && item.endTime 
                                   ? format(new Date(item.endTime), 'HH:mm') 
                                   : format(new Date(item.dueDate!), 'HH:mm')} - {item.title}
                               </Text>
                             </View>
                            {isTask ? (
                              <View style={{ backgroundColor: status.bgColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                                <Text style={{ fontFamily: FontFamily.interBold, fontSize: 8, color: status.color }}>{status.label}</Text>
                              </View>
                            ) : (
                              <View style={{ backgroundColor: prioInfo.bgColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                                <Text style={{ fontFamily: FontFamily.interBold, fontSize: 8, color: prioInfo.color }}>{prioInfo.label}</Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                             <MaterialIcons name={isTask ? "assignment" : "stars"} size={12} color={isTask ? priorityColor : '#1A73E8'} />
                             <Text style={{ color: isTask ? priorityColor : '#1A73E8', fontFamily: FontFamily.interBold, fontSize: 11 }}>
                                {isTask ? 'Công việc' : 'Sự kiện'}
                             </Text>
                          </View>

                          <Text style={[styles.timelineItemTime, { color, marginTop: 4 }]} numberOfLines={2}>
                            <Text style={{ fontFamily: FontFamily.interBold }}>Mô tả: </Text>{displayDesc}
                          </Text>

                          {isTask ? (
                             <Text style={{ color, fontFamily: FontFamily.interBold, fontSize: 11, marginTop: 6 }}>
                                Nhiệm vụ cần làm({stats.completed}/{stats.total})
                             </Text>
                          ) : (
                            <Text style={{ color: color, fontSize: 11, marginTop: 6 }}>
                              <Text style={{ fontFamily: FontFamily.interBold }}>Hình thức: </Text>{eventFormatFlag}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                   })}
                 </View>
               </View>
             );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="calendar-today" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>
            {selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'Hôm nay, ' : ''}
            {format(parseLocalDate(selectedDate), 'd MMMM, yyyy', { locale: vi })}
          </Text>
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
          <Text style={styles.filterText}>{viewMode === 'month' ? 'Tháng' : 'Tuần'}</Text>
          <MaterialIcons name="filter-list" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {viewMode === 'month' ? (
        <View style={[styles.monthViewContainer, Platform.OS === 'web' && styles.monthViewWeb]}>
          <View style={[styles.calendarWrapper, Platform.OS === 'web' && styles.calendarWrapperWeb]}>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              monthFormat={'MMMM, yyyy'}
              markingType={'multi-dot'}
              markedDates={markedDates}
              firstDay={1}
              theme={{
                backgroundColor: Colors.surfaceContainerLowest || '#fff',
                calendarBackground: Colors.surfaceContainerLowest || '#fff',
                textSectionTitleColor: Colors.outline,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: Colors.primary,
                todayBackgroundColor: 'rgba(26,115,232,0.1)',
                dayTextColor: Colors.onSurface,
                textDisabledColor: Colors.outlineVariant,
                dotColor: Colors.primary,
                selectedDotColor: '#ffffff',
                arrowColor: Colors.primary,
                monthTextColor: Colors.onSurface,
                textDayFontFamily: FontFamily.interMedium,
                textMonthFontFamily: FontFamily.manropeBold,
                textDayHeaderFontFamily: FontFamily.interBold,
                textDayFontSize: 14,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
          
          <View style={Platform.OS === 'web' ? styles.agendaWrapperWeb : { flex: 1 }}>
            <View style={styles.agendaHeader}>
              <Text style={styles.agendaTitle}>
                {selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'Lịch trình hôm nay' : 'Lịch trình dự kiến'}
              </Text>
              <Text style={styles.agendaDate}>
                {format(parseLocalDate(selectedDate), 'EEEE', { locale: vi })}
              </Text>
            </View>

            <FlatList
              data={filteredReminders}
              keyExtractor={(item) => item.id}
              renderItem={renderAgendaItem}
              contentContainerStyle={[
                styles.agendaList, 
                Platform.OS === 'web' && styles.agendaListWeb
              ]}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không có sự kiện hay công việc nào.</Text>
                </View>
              )}
            />
          </View>
        </View>
      ) : (
        <View style={styles.dailyViewContainer}>
          {renderWeekStrip()}
          {renderTimeline()}
        </View>
      )}

      <MultiActionFAB />

      <Modal visible={filterVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setFilterVisible(false)}>
          <View style={styles.filterModalContent}>
             <Text style={styles.modalTitle}>Chọn chế độ xem</Text>
             <TouchableOpacity 
                style={[styles.modalOption, viewMode === 'month' && styles.modalOptionActive]} 
                onPress={() => { setViewMode('month'); setFilterVisible(false); }}
             >
                <Text style={[styles.modalOptionText, viewMode === 'month' && styles.modalOptionTextActive]}>Hiện theo tháng</Text>
                {viewMode === 'month' && <MaterialIcons name="check" size={20} color={Colors.primary} />}
             </TouchableOpacity>
             <TouchableOpacity 
                style={[styles.modalOption, viewMode === 'week' && styles.modalOptionActive]} 
                onPress={() => { setViewMode('week'); setFilterVisible(false); }}
             >
                <Text style={[styles.modalOptionText, viewMode === 'week' && styles.modalOptionTextActive]}>Hiện theo tuần</Text>
                {viewMode === 'week' && <MaterialIcons name="check" size={20} color={Colors.primary} />}
             </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ItemDetailPopup 
        item={selectedItem}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          setSelectedItem(null);
          navigation.navigate('AddTask', { type: item.type, editItem: item });
        }}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    zIndex: 10,
  },
  headerTitle: { fontFamily: FontFamily.manropeBold, fontSize: FontSize.bodyLg, color: Colors.onSurface },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow || '#f3f3f4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  filterText: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelSm, color: Colors.primary },
  
  // Month View
  monthViewContainer: { flex: 1 },
  monthViewWeb: { flexDirection: 'row', paddingHorizontal: 10 },
  calendarWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerLowest || '#fff',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 24,
        elevation: 4,
      }
    }),
    paddingBottom: 16,
  },
  calendarWrapperWeb: {
    flex: 0.6, // 6 phần
    marginHorizontal: 10,
    marginTop: 10,
    maxHeight: 500,
  },
  agendaWrapperWeb: {
    flex: 0.4, // 4 phần
    paddingLeft: 10,
  },
  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 12, marginTop: 12, marginBottom: 16 },
  agendaTitle: { 
    fontFamily: FontFamily.manropeExtraBold, 
    fontSize: Platform.OS === 'web' ? FontSize.titleSm : 20, 
    color: Colors.onSurface 
  },
  agendaDate: { fontFamily: FontFamily.interMedium, fontSize: 11, color: Colors.primary },
  agendaList: { paddingHorizontal: 16, paddingBottom: 120 },
  agendaListWeb: { paddingBottom: 50 },
  agendaItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLowest || '#fff',
    padding: 8, borderRadius: 12, marginBottom: 6, borderLeftWidth: 3,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 16,
        elevation: 2,
      }
    }),
  },
  timeColumn: { width: 60, alignItems: 'center', justifyContent: 'center' },
  timeText: { fontFamily: FontFamily.interBold, fontSize: 10, color: Colors.outlineVariant },
  infoColumn: { flex: 1, paddingLeft: 8 },
  titleText: { 
    fontFamily: FontFamily.interBold, 
    fontSize: Platform.OS === 'web' ? FontSize.bodySm : FontSize.bodyLg, 
    color: Colors.onSurface, 
    marginBottom: 2 
  },
  descText: { fontFamily: FontFamily.interRegular, fontSize: 11, color: Colors.onSurfaceVariant },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  emptyText: { fontFamily: FontFamily.interMedium, fontSize: 12, color: Colors.onSurfaceVariant },

  // Week View (Daily Schedule)
  dailyViewContainer: { flex: 1, backgroundColor: Colors.surface },
  weekStripContainer: { marginBottom: 16, paddingTop: 8 },
  dayCard: { flex: 1, height: 75, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow || '#f3f3f4', alignItems: 'center', justifyContent: 'center' },
  dayCardSelected: { 
    backgroundColor: Colors.primary,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 110, 245, 0.3)',
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      }
    })
  },
  dayCardLabel: { fontFamily: FontFamily.interBold, fontSize: 10, color: Colors.onSurfaceVariant, paddingBottom: 4 },
  dayCardLabelSelected: { color: 'rgba(255,255,255,0.8)' },
  dayCardDate: { fontFamily: FontFamily.manropeExtraBold, fontSize: 18, color: Colors.onSurface },
  dayCardDateSelected: { color: '#ffffff' },
  valText: { fontFamily: FontFamily.interMedium, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },

  timelineScrollContent: { paddingBottom: 100 },
  timelineInner: { marginTop: 10, paddingHorizontal: 16 },
  hourRowWrap: { paddingBottom: 12, position: 'relative' },
  hourRowHeader: { flexDirection: 'row', alignItems: 'center' },
  hourLabel: { width: 44, fontFamily: FontFamily.interSemiBold, fontSize: 12, color: Colors.outlineVariant },
  hourLine: { flex: 1, height: 1, backgroundColor: 'rgba(193, 198, 214, 0.4)' },
  currentTimeLine: { position: 'absolute', left: 44, right: 0, height: 2, backgroundColor: '#D32F2F', zIndex: 10 },
  currentTimeDot: { position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F' },
  
  hourItemsContainer: { paddingLeft: 44 },
  timelineItemWrap: { 
    borderRadius: 12, padding: 12, borderLeftWidth: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }
    })
  },
  timelineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  timelineItemTitle: { 
    fontFamily: FontFamily.interBold, 
    fontSize: Platform.OS === 'web' ? FontSize.labelMd : 15, 
    flexShrink: 1,
    color: Colors.onSurface 
  },
  timelineItemTime: { fontFamily: FontFamily.interMedium, fontSize: 11, marginTop: 4 },

  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 40, gap: 16 },
  statCard: { flex: 1, backgroundColor: Colors.surfaceContainerLow || '#f3f3f4', padding: 20, borderRadius: 24, alignItems: 'flex-start' },
  statValue: { fontFamily: FontFamily.manropeExtraBold, fontSize: 24, color: Colors.onSurface, marginTop: 8 },
  statLabel: { fontFamily: FontFamily.interBold, fontSize: 10, color: Colors.outline, letterSpacing: 1, marginTop: 4 },

  // Modal Filter
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterModalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontFamily: FontFamily.manropeBold, fontSize: FontSize.titleMd, color: Colors.onSurface, marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalOptionActive: { backgroundColor: 'rgba(26,115,232,0.05)', borderRadius: 8, paddingHorizontal: 12, borderBottomWidth: 0 },
  modalOptionText: { fontFamily: FontFamily.interMedium, fontSize: FontSize.bodyLg, color: Colors.onSurfaceVariant },
  modalOptionTextActive: { color: Colors.primary, fontFamily: FontFamily.interBold },
});
