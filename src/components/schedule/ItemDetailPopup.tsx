import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize } from '../../theme';
import { Reminder } from '../../database/queries';
import { useReminderStore } from '../../store/useReminderStore';

type Props = {
  item: Reminder | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (item: Reminder) => void;
};

// Utils for parsing description
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

const parseEventDescription = (desc: string) => {
  if (!desc) return { mainDesc: '', formatType: '', location: '', link: '' };
  let mainDesc = desc;
  let formatType = '';
  let location = '';
  let link = '';

  const extrasMatch = desc.match(/---\s*Thông tin thêm\s*---\n([\s\S]*)/i);
  if (extrasMatch) {
    const lines = extrasMatch[1].split('\n');
    lines.forEach(l => {
      if (l.startsWith('Hình thức: ')) formatType = l.replace('Hình thức: ', '');
      if (l.startsWith('Địa điểm: ')) location = l.replace('Địa điểm: ', '');
      if (l.startsWith('Link: ')) link = l.replace('Link: ', '');
    });
    mainDesc = mainDesc.replace(extrasMatch[0], '');
  }

  return { mainDesc: mainDesc.trim(), formatType, location, link };
};

export const ItemDetailPopup: React.FC<Props> = ({ item: initialItem, visible, onClose, onEdit }) => {
  const { reminders, removeReminder, toggleStatus, updateDescription } = useReminderStore();
  
  // Real-time data bind
  const item = reminders.find(r => r.id === initialItem?.id) || initialItem;

  if (!item) return null;

  const isTask = item.type === 'task';
  const dateObj = new Date(item.dueDate);
  const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const endTimeObj = item.endTime ? new Date(item.endTime) : null;
  const endTimeStr = endTimeObj ? endTimeObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa xác định';
  const endDateStr = endTimeObj ? endTimeObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const startTimeFull = `${timeStr} ${dateStr}`;
  const endTimeFull = `${endTimeStr} ${endDateStr}`.trim();

  // Priority metadata
  const priorityColors: Record<string, string> = {
    urgent: '#C62828',
    high: '#C62828',
    medium: '#B8860B',
    low: '#2E7D32'
  };
  const priorityColor = priorityColors[item.priority] || '#1A73E8';
  const priorityText = 
    ((item.priority as string) === 'urgent' || item.priority === 'high') ? 'Cao' : 
    item.priority === 'low' ? 'Thấp' : 'Trung bình';
  
  // Parse subtasks logic for early validation
  const { mainDesc: tDesc, subtasks, participants } = parseTaskDescription(item.description);
  const isAllSubtasksCompleted = subtasks.length === 0 || subtasks.every(st => st.completed);

  const handleDelete = () => {
    Alert.alert('Xóa mục này', 'Bạn có chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => { removeReminder(item.id); onClose(); } }
    ]);
  };

  const handleToggleEvent = () => {
    if (isTask && !isAllSubtasksCompleted && item.completed === 0) {
      Alert.alert('Chưa hoàn thành', 'Bạn cần hoàn thành tất cả nhiệm vụ con trước khi đánh dấu là đã xong.');
      return;
    }
    toggleStatus(item.id, item.completed);
    onClose();
  };

  const toggleSubtask = (idx: number) => {
    const newSubtasks = [...subtasks];
    newSubtasks[idx].completed = !newSubtasks[idx].completed;
    const newDesc = buildTaskDescription(tDesc, newSubtasks, participants);
    updateDescription(item.id, newDesc);
  };

  const renderTaskContent = () => {
    return (
      <View style={styles.contentWrap}>
        {/* Description */}
        {tDesc ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MÔ TẢ</Text>
            <Text style={styles.descText}>{tDesc.replace(/\[Nhiệm vụ cần làm\]\n?/g, '').trim()}</Text>
          </View>
        ) : null}

        {/* Priority & Time */}
        <View style={styles.grid2}>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>MỨC ĐỘ ƯU TIÊN</Text>
            <View style={styles.flexRow}>
              <View style={[styles.dot, { backgroundColor: priorityColor }]} />
              <Text style={styles.valText}>{priorityText}</Text>
            </View>
          </View>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>THỜI GIAN</Text>
            <View style={{ gap: 6 }}>
              <View style={styles.flexRow}>
                <MaterialIcons name="play-circle-outline" size={16} color={Colors.outlineVariant} />
                <Text style={[styles.valText, { fontSize: 13, flex: 0, minWidth: 120 }]}>{startTimeFull}</Text>
              </View>
              <View style={styles.flexRow}>
                <MaterialIcons name="stop-circle" size={16} color={Colors.outlineVariant} />
                <Text style={[styles.valText, { fontSize: 13, flex: 0, minWidth: 120 }]}>{endTimeFull}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Checklist */}
        {subtasks.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              NHIỆM VỤ CẦN LÀM ({subtasks.filter(s => s.completed).length}/{subtasks.length})
            </Text>
            {subtasks.map((st, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.subtaskRow}
                activeOpacity={0.7}
                onPress={() => toggleSubtask(idx)}
              >
                <MaterialIcons 
                  name={st.completed ? "check-circle" : "radio-button-unchecked"} 
                  size={20} 
                  color={st.completed ? Colors.primary : Colors.outlineVariant} 
                />
                <Text style={[styles.valText, st.completed && styles.strikethrough]}>
                  {st.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Participants */}
        {participants.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NGƯỜI THAM GIA</Text>
            <View style={styles.flexWrap}>
              {participants.map((p, idx) => (
                <View key={idx} style={styles.participantChip}>
                  <Text style={styles.participantText}>{p.substring(0, 2).toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderEventContent = () => {
    const { mainDesc: eDesc, formatType, location, link } = parseEventDescription(item.description);

    return (
      <View style={styles.contentWrap}>
        {/* Description */}
        {eDesc ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MÔ TẢ</Text>
            <Text style={styles.descText}>{eDesc.replace(/--- Thông tin thêm ---\n?/g, '').trim()}</Text>
          </View>
        ) : null}

        {/* Priority & Time */}
        <View style={styles.grid2}>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>MỨC ĐỘ</Text>
            <View style={styles.flexRow}>
              <View style={[styles.dot, { backgroundColor: priorityColor }]} />
              <Text style={styles.valText}>{priorityText}</Text>
            </View>
          </View>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>THỜI GIAN</Text>
            <View style={{ gap: 6 }}>
              <View style={styles.flexRow}>
                <MaterialIcons name="play-circle-outline" size={16} color={Colors.outlineVariant} />
                <Text style={[styles.valText, { fontSize: 13, flex: 0, minWidth: 120 }]}>{startTimeFull}</Text>
              </View>
              <View style={styles.flexRow}>
                <MaterialIcons name="stop-circle" size={16} color={Colors.outlineVariant} />
                <Text style={[styles.valText, { fontSize: 13, flex: 0, minWidth: 120 }]}>{endTimeFull}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Format & Link */}
        {(formatType || location || link) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THÔNG TIN THÊM</Text>
            {formatType ? (
               <View style={styles.infoRow}>
                 <MaterialIcons name="videocam" size={20} color={Colors.outlineVariant} />
                 <Text style={styles.valText}>{formatType}</Text>
               </View>
            ) : null}
            {location ? (
               <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
                 <View style={styles.flexRow}>
                   <MaterialIcons name="location-on" size={20} color={Colors.outlineVariant} />
                   <Text style={[styles.valText, { flex: 0 }]} numberOfLines={2}>{location}</Text>
                 </View>
                 <TouchableOpacity onPress={() => { Clipboard.setStringAsync(location); Alert.alert('Đã copy', 'Đã copy địa chỉ vào khay nhớ tạm'); }}>
                   <MaterialIcons name="content-copy" size={20} color={Colors.primary} />
                 </TouchableOpacity>
               </View>
            ) : null}
            {link ? (
               <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
                 <View style={[styles.flexRow, { flex: 1, marginRight: 8 }]}>
                   <MaterialIcons name="link" size={20} color={Colors.outlineVariant} />
                   <Text style={[styles.valText, { flex: 1 }]} numberOfLines={1}>{link}</Text>
                 </View>
                 <TouchableOpacity onPress={() => { Clipboard.setStringAsync(link); Alert.alert('Đã copy', 'Đã copy đường dẫn vào khay nhớ tạm'); }}>
                   <MaterialIcons name="content-copy" size={20} color={Colors.primary} />
                 </TouchableOpacity>
               </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const isBtnDisabled = isTask && !isAllSubtasksCompleted && item.completed === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Fixed Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MaterialIcons name={isTask ? "assignment" : "stars"} size={14} color={priorityColor} />
                <Text style={{ color: priorityColor, fontFamily: FontFamily.interBold, fontSize: 11 }}>
                  {isTask ? 'Công việc' : 'Sự kiện'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={Colors.outlineVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBlock}>
            {/* Content Switch */}
            {isTask ? renderTaskContent() : renderEventContent()}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
             {isTask && (
               <TouchableOpacity 
                  style={[
                    styles.btnPrimary, 
                    item.completed ? { backgroundColor: Colors.tertiaryContainer || '#c55500' } : {},
                    isBtnDisabled ? { opacity: 0.5 } : {}
                  ]} 
                  onPress={handleToggleEvent}
                  activeOpacity={0.8}
               >
                 <Text style={styles.btnPrimaryText}>{item.completed ? 'Đánh dấu chưa xong' : 'Đã hoàn thành'}</Text>
               </TouchableOpacity>
             )}
             <TouchableOpacity 
                style={styles.btnSecondary} 
                onPress={() => {
                  if (item) onEdit?.(item);
                }}
             >
                <Text style={styles.btnSecondaryText}>Sửa lịch</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.btnDanger} onPress={handleDelete}>
                <Text style={styles.btnDangerText}>{isTask ? 'Xóa công việc' : 'Xóa sự kiện'}</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { 
    width: Platform.OS === 'web' ? 500 : '100%', 
    maxWidth: '95%',
    backgroundColor: '#fff', 
    borderRadius: 24, 
    overflow: 'hidden', 
    maxHeight: Platform.OS === 'web' ? '95%' : '80%', 
    elevation: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 15,
  },
  scrollBlock: { paddingHorizontal: 24, paddingBottom: 24 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    padding: Platform.OS === 'web' ? 24 : 20, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(193,198,214,0.1)' 
  },
  title: { 
    fontFamily: FontFamily.manropeExtraBold, 
    fontSize: Platform.OS === 'web' ? FontSize.titleLg : FontSize.titleMd, 
    color: Colors.onSurface, 
    lineHeight: Platform.OS === 'web' ? 32 : 28,
  },
  closeBtn: { padding: 4, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow || '#f3f3f4' },
  contentWrap: { gap: 20 },
  section: {},
  sectionTitle: { fontFamily: FontFamily.interBold, fontSize: 10, color: Colors.outlineVariant, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  descText: { fontFamily: FontFamily.interRegular, fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant, lineHeight: 20 },
  grid2: { flexDirection: 'row', gap: 16 },
  gridColumn: { flex: 1 },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flexWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  valText: { flex: 1, fontFamily: FontFamily.interMedium, fontSize: FontSize.labelMd, color: Colors.onSurface },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  strikethrough: { textDecorationLine: 'line-through', color: Colors.outlineVariant },
  participantChip: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  participantText: { fontFamily: FontFamily.interBold, fontSize: 10, color: Colors.primary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  footer: { padding: 20, backgroundColor: Colors.surfaceContainerLowest || '#f9f9f9', gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(193,198,214,0.1)' },
  btnPrimary: { width: '100%', height: 48, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontFamily: FontFamily.interBold, fontSize: FontSize.labelMd, color: '#fff' },
  btnSecondary: { width: '100%', height: 48, backgroundColor: 'rgba(26,115,232,0.05)', borderWidth: 1, borderColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontFamily: FontFamily.interBold, fontSize: FontSize.labelMd, color: Colors.primary },
  btnDanger: { width: '100%', height: 48, backgroundColor: 'rgba(186,26,26,0.05)', borderWidth: 1, borderColor: '#ba1a1a', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnDangerText: { fontFamily: FontFamily.interBold, fontSize: FontSize.labelMd, color: '#ba1a1a' },
});
