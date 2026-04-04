import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomPicker, PickerOption } from '../components/ui/CustomPicker';
import { useReminderStore } from '../store/useReminderStore';
import { generateTriggersFromRules } from '../utils/reminderUtils';
import { useSettingsStore } from '../store/useSettingsStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { scheduleNotification, cancelTaskNotifications } from '../services/notificationService';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddTask'>;
  route: RouteProp<RootStackParamList, 'AddTask'>;
};

export const AddTaskScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reminderPresets } = useSettingsStore();
  const { addReminder, editReminder, reminders: existingReminders } = useReminderStore();
  const { type, editItem } = route.params || { type: 'task' };
  const isEvent = type === 'event';
  const isEdit = !!editItem;

  const getInitialValues = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const defaults = {
      title: '', description: '', startTime: now,
      endTime: new Date(now.getTime() + 3600000), priority: 'Trung bình',
      subtasks: [] as string[], participants: [] as string[],
      formatType: 'Trực tiếp' as 'Trực tiếp' | 'Trực tuyến', location: '', link: '',
    };
    if (!editItem) return defaults;
    const start = new Date(editItem.dueDate);
    const end = editItem.endTime ? new Date(editItem.endTime) : new Date(start.getTime() + 3600000);
    const pText = editItem.priority === 'high' ? 'Cao' : editItem.priority === 'low' ? 'Thấp' : 'Trung bình';
    const desc = editItem.description || '';
    let mainDesc = desc, subTasks: string[] = [], parts: string[] = [], fMode: 'Trực tiếp' | 'Trực tuyến' = 'Trực tiếp', loc = '', lnk = '';

    if (editItem.type === 'task') {
      const taskParts = desc.split('[Nhiệm vụ cần làm]');
      mainDesc = taskParts[0].trim();
      if (taskParts.length > 1) {
        const afterTasks = taskParts[1];
        const pParts = afterTasks.split('[Người tham gia]:');
        subTasks = pParts[0].split('\n').map(s => s.trim()).filter(s => s.startsWith('-')).map(s => s.replace(/^- (\s*\[[x\s]\])? ?/, '').trim());
        if (pParts.length > 1) parts = pParts[1].split(',').map(s => s.trim()).filter(Boolean);
      } else {
        const pParts = mainDesc.split('[Người tham gia]:');
        if (pParts.length > 1) {
          mainDesc = pParts[0].trim();
          parts = pParts[1].split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    } else {
      const extrasMatch = desc.match(/--- Thông tin thêm ---\n([\s\S]*)/);
      if (extrasMatch) {
        const lines = extrasMatch[1].split('\n');
        lines.forEach(l => {
          if (l.startsWith('Hình thức: ')) fMode = l.replace('Hình thức: ', '') as any;
          if (l.startsWith('Địa điểm: ')) loc = l.replace('Địa điểm: ', '');
          if (l.startsWith('Link: ')) lnk = l.replace('Link: ', '');
        });
        mainDesc = mainDesc.replace(extrasMatch[0], '').trim();
      }
    }
    return { title: editItem.title, description: mainDesc, startTime: start, endTime: end, priority: pText, subtasks: subTasks, participants: parts, formatType: fMode, location: loc, link: lnk };
  };

  const initialData = getInitialValues();
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [loading, setLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>(initialData.subtasks);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [priority, setPriority] = useState(initialData.priority);
  const [participants, setParticipants] = useState<string[]>(initialData.participants);
  const [participantInput, setParticipantInput] = useState('');
  const [formatType, setFormatType] = useState(initialData.formatType);
  const [location, setLocation] = useState(initialData.location);
  const [link, setLink] = useState(initialData.link);
  const [startTime, setStartTime] = useState<Date>(initialData.startTime);
  const [endTime, setEndTime] = useState<Date>(initialData.endTime);
  const isTimeError = endTime < startTime;

  const isDuplicateTitle = useMemo(() => {
    if (!title.trim()) return false;
    return existingReminders.some(r => r.title.trim().toLowerCase() === title.trim().toLowerCase() && (!editItem || r.id !== editItem.id));
  }, [title, existingReminders, editItem]);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('date');
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | 'timeSlot' | null>(null);

  const [hasReminder, setHasReminder] = useState(true);
  const [reminderConfig, setReminderConfig] = useState('Tùy chỉnh');
  type LocalReminderRule = { id: string; timing: string; amount: string; unit: string; timeSlots: string[]; };

  const [localReminderRules, setLocalReminderRules] = useState<LocalReminderRule[]>(() => {
    if (isEdit && editItem?.reminderRules) {
      try { return JSON.parse(editItem.reminderRules); } catch (e) { console.error(e); }
    }
    return [{ id: '1', timing: 'Trước khi bắt đầu', amount: '15', unit: 'Phút', timeSlots: ['09:00'] }];
  });
  const [activeTimeSlotReminderId, setActiveTimeSlotReminderId] = useState<string | null>(null);
  const [tempTimeSlot, setTempTimeSlot] = useState<string | null>(null);

  const addReminderItem = () => {
    setLocalReminderRules([...localReminderRules, { id: Date.now().toString(), timing: 'Trước khi bắt đầu', amount: '15', unit: 'Phút', timeSlots: [] }]);
  };
  const updateReminderRule = (id: string, field: keyof LocalReminderRule, value: any) => {
    setLocalReminderRules(localReminderRules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const removeReminderRule = (id: string) => {
    setLocalReminderRules(localReminderRules.filter(r => r.id !== id));
  };

  useEffect(() => {
    if (reminderConfig === 'Tùy chỉnh') return;
    const preset = reminderPresets.find((p: any) => p.name === reminderConfig);
    if (preset) {
      const timingMap: any = { before_start: 'Trước khi bắt đầu', at_start: 'Khi bắt đầu', before_end: 'Trước khi kết thúc', at_end: 'Khi kết thúc' };
      const unitMap: any = { minutes: 'Phút', hours: 'Giờ', days: 'Ngày' };
      const newReminders: LocalReminderRule[] = preset.rules.map((rule: any) => ({
        id: rule.id + '-' + Date.now(),
        timing: timingMap[rule.type] || 'Trước khi bắt đầu',
        amount: rule.offsetValue?.toString() || '0',
        unit: unitMap[rule.offsetUnit || 'minutes'] || 'Phút',
        timeSlots: rule.timeSlots || []
      }));
      setLocalReminderRules(newReminders);
    }
  }, [reminderConfig, reminderPresets]);

  const openDateTimePicker = (target: 'start' | 'end' | 'timeSlot', mode: 'date' | 'time' | 'datetime') => {
    setPickerTarget(target); setPickerMode(mode); setShowPicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate) {
      if (Platform.OS === 'android' && pickerTarget === 'timeSlot') setActiveTimeSlotReminderId(null);
      return;
    }
    if (pickerTarget === 'start' || pickerTarget === 'end') {
      const isStart = pickerTarget === 'start';
      const d = isStart ? startTime : endTime;
      const setD = isStart ? setStartTime : setEndTime;
      if (pickerMode === 'datetime') {
         const cleanDate = new Date(selectedDate);
         cleanDate.setSeconds(0, 0);
         setD(cleanDate);
      } else if (pickerMode === 'date') {
        const newD = new Date(d);
        newD.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setD(newD);
        if (Platform.OS === 'android') setTimeout(() => { setPickerMode('time'); setShowPicker(true); }, 100);
      } else {
        const newD = new Date(d);
        newD.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        setD(newD);
      }
    } else if (pickerTarget === 'timeSlot' && activeTimeSlotReminderId) {
       const tStr = format(selectedDate, 'HH:mm');
       if (Platform.OS === 'android') {
         const r = localReminderRules.find(x => x.id === activeTimeSlotReminderId);
         if (r) updateReminderRule(r.id, 'timeSlots', [...r.timeSlots, tStr]);
         setActiveTimeSlotReminderId(null);
       } else {
         setTempTimeSlot(tStr);
       }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề');
    if (isDuplicateTitle) return Alert.alert('Lỗi', 'Tiêu đề này đã tồn tại');
    if (endTime < startTime) return Alert.alert('Lỗi', 'Thời gian kết thúc không thể trước thời gian bắt đầu');
    
    setLoading(true);
    try {
      let finalDescription = description.trim();
      const currentSubtasks = [...subtasks];
      if (subtaskInput.trim()) currentSubtasks.push(subtaskInput.trim());
      const currentParticipants = [...participants];
      if (participantInput.trim()) currentParticipants.push(participantInput.trim());

      if (!isEvent) {
        if (currentSubtasks.length > 0) finalDescription += `\n\n[Nhiệm vụ cần làm]\n` + currentSubtasks.map(t => `- [ ] ${t}`).join('\n');
        if (currentParticipants.length > 0) finalDescription += `\n\n[Người tham gia]: ` + currentParticipants.join(', ');
      } else {
        const extras = [];
        if (formatType) extras.push(`Hình thức: ${formatType}`);
        if (location) extras.push(`Địa điểm: ${location}`);
        if (link) extras.push(`Link: ${link}`);
        if (extras.length > 0) finalDescription += `\n\n--- Thông tin thêm ---\n${extras.join('\n')}`;
      }

      const pVal = priority === 'Cao' || priority === 'Khẩn cấp' || priority === 'Nghiêm trọng' ? 'high' : priority === 'Thấp' ? 'low' : 'medium';
      const taskId = isEdit ? editItem!.id : uuidv4();
      
      const allGeneratedTriggers = generateTriggersFromRules(
        hasReminder ? JSON.stringify(localReminderRules) : null,
        startTime,
        endTime,
        title,
        isEvent ? 'event' : 'task'
      );

      let triggerTimes = allGeneratedTriggers.map(t => ({ date: t.date, body: t.body }));

      // Sort all triggers to find the most relevant one for the DB feed
      // We pick the first one that is either in the future OR within the last 24h (to keep it in history)
      const now = Date.now();
      const relevantTriggers = [...triggerTimes]
        .filter(t => t.date.getTime() > now - 86400000)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      const firstReminderTime = relevantTriggers.length > 0 ? relevantTriggers[0].date : (triggerTimes.length > 0 ? triggerTimes[0].date : null);
      const reminderTimeStr = firstReminderTime ? format(firstReminderTime, "yyyy-MM-dd'T'HH:mm:ss") : null;

      // Filter for future-only push notifications
      const futureTriggers = triggerTimes.filter(t => t.date.getTime() > now).sort((a, b) => a.date.getTime() - b.date.getTime());
      triggerTimes = futureTriggers;

      if (isEdit && editItem) {
        await editReminder(taskId, {
          type: isEvent ? 'event' : 'task',
          title: title.trim(),
          description: finalDescription,
          priority: pVal,
          dueDate: startTime.toISOString(),
          endTime: endTime.toISOString(),
          reminderTime: reminderTimeStr,
          reminderRules: hasReminder ? JSON.stringify(localReminderRules) : null,
        });
      } else {
        await addReminder({
          id: taskId,
          type: isEvent ? 'event' : 'task',
          title: title.trim(),
          description: finalDescription,
          priority: pVal,
          dueDate: startTime.toISOString(),
          endTime: endTime.toISOString(),
          reminderTime: reminderTimeStr,
          reminderRepeat: 'none',
          reminderRules: hasReminder ? JSON.stringify(localReminderRules) : null,
          notificationId: null,
        });
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const getPickerDateRaw = () => {
    if (pickerTarget === 'start') return startTime;
    if (pickerTarget === 'end') return endTime;
    if (pickerTarget === 'timeSlot' && tempTimeSlot) {
      const [h, m] = tempTimeSlot.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
    return new Date();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialIcons name="close" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEvent ? 'Thêm sự kiện' : 'Thêm công việc'}</Text>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcons name="more-vert" size={24} color={Colors.outline} />
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tiêu đề</Text>
              <TextInput
                style={[styles.input, isDuplicateTitle && { borderColor: '#ba1a1a', borderWidth: 1.5 }]}
                value={title}
                onChangeText={setTitle}
                placeholder={isEvent ? "Ví dụ: Workshop Thiết kế giao diện" : "Ví dụ: Thiết kế giao diện Dashboard"}
                placeholderTextColor={Colors.outline}
              />
              {isDuplicateTitle && <Text style={{ color: '#ba1a1a', fontSize: 12, marginTop: 4, marginLeft: 4 }}>Tên này đã tồn tại</Text>}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={isEvent ? "Thêm chi tiết về sự kiện này..." : "Thêm chi tiết về công việc này..."}
                placeholderTextColor={Colors.outline}
                multiline numberOfLines={3} textAlignVertical="top"
              />
            </View>
            {!isEvent && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mức độ ưu tiên</Text>
                <CustomPicker value={priority} options={['Cao', 'Trung bình', 'Thấp']} onSelect={setPriority} />
              </View>
            )}
          </View>

          {isEvent && (
            <View style={styles.section}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hình thức</Text>
                <View style={styles.segmentControl}>
                  <TouchableOpacity style={[styles.segmentBtn, formatType === 'Trực tiếp' && styles.segmentBtnActive]} onPress={() => setFormatType('Trực tiếp')}>
                    <Text style={[styles.segmentText, formatType === 'Trực tiếp' && styles.segmentTextActive]}>Trực tiếp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentBtn, formatType === 'Trực tuyến' && styles.segmentBtnActive]} onPress={() => setFormatType('Trực tuyến')}>
                    <Text style={[styles.segmentText, formatType === 'Trực tuyến' && styles.segmentTextActive]}>Trực tuyến</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Địa điểm</Text>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Nhập địa chỉ tổ chức" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Đường dẫn</Text>
                <TextInput style={styles.input} value={link} onChangeText={setLink} placeholder="Link tham gia (nếu có)" />
              </View>
            </View>
          )}

          {!isEvent && (
            <View style={styles.section}>
              <Text style={styles.label}>Nhiệm vụ cần làm (Checklist)</Text>
              <View style={styles.cardBox}>
                <Text style={styles.cardBoxTitle}>Tiến độ</Text>
                {subtasks.length > 0 ? (
                  <View style={{ marginBottom: 12, gap: 8 }}>
                    {subtasks.map((task, idx) => (
                      <View key={idx} style={styles.chipItem}>
                        <Text style={styles.chipItemText}>{task}</Text>
                        <TouchableOpacity onPress={() => setSubtasks(subtasks.filter((_, i) => i !== idx))}>
                          <MaterialIcons name="close" size={16} color={Colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={{ gap: 8 }}>
                  <TextInput
                    style={[styles.input, { paddingVertical: 12 }]}
                    value={subtaskInput}
                    onChangeText={setSubtaskInput}
                    placeholder="Nhập tên nhiệm vụ..."
                    placeholderTextColor={Colors.outline}
                    onBlur={() => { if (subtaskInput.trim()) { setSubtasks(prev => [...prev, subtaskInput.trim()]); setSubtaskInput(''); } }}
                    onSubmitEditing={() => { if (subtaskInput.trim()) { setSubtasks(prev => [...prev, subtaskInput.trim()]); setSubtaskInput(''); } }}
                  />
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => { if (subtaskInput.trim()) { setSubtasks([...subtasks, subtaskInput.trim()]); setSubtaskInput(''); } }}>
                    <MaterialIcons name="add" size={18} color={Colors.primary} />
                    <Text style={styles.ghostBtnText}>Thêm nhiệm vụ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isEvent ? 'Bắt đầu' : 'Ngày giao'}</Text>
              <TouchableOpacity activeOpacity={0.8} style={styles.inputWithIcon} onPress={() => openDateTimePicker('start', Platform.OS === 'ios' ? 'datetime' : 'date')}>
                <Text style={styles.dummyInputValue}>{format(startTime, 'HH:mm, dd/MM/yyyy')}</Text>
                <MaterialIcons name="calendar-today" size={20} color={isTimeError ? '#ba1a1a' : Colors.primary} style={styles.inputIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isEvent ? 'Kết thúc' : 'Hạn chót'}</Text>
              <TouchableOpacity activeOpacity={0.8} style={[styles.inputWithIcon, isTimeError && styles.inputError]} onPress={() => openDateTimePicker('end', Platform.OS === 'ios' ? 'datetime' : 'date')}>
                <Text style={[styles.dummyInputValue, isTimeError && styles.textError]}>{format(endTime, 'HH:mm, dd/MM/yyyy')}</Text>
                <MaterialIcons name="schedule" size={20} color={isTimeError ? '#ba1a1a' : Colors.error || '#ba1a1a'} style={styles.inputIcon} />
              </TouchableOpacity>
              {isTimeError && <Text style={styles.errorText}>Thời gian kết thúc không thể trước thời gian bắt đầu</Text>}
            </View>
            {!isEvent && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Người tham gia</Text>
                {participants.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {participants.map((p, idx) => (
                      <View key={idx} style={styles.chipItemSmall}>
                        <Text style={styles.chipTextSmall}>{p}</Text>
                        <TouchableOpacity onPress={() => setParticipants(participants.filter((_, i) => i !== idx))}>
                          <MaterialIcons name="close" size={14} color={Colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  style={styles.input}
                  value={participantInput}
                  onChangeText={setParticipantInput}
                  placeholder="Thêm email người tham gia..."
                  placeholderTextColor={Colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={() => { if (participantInput.trim()) { setParticipants(prev => [...prev, participantInput.trim()]); setParticipantInput(''); } }}
                  onSubmitEditing={() => { if (participantInput.trim()) { setParticipants(prev => [...prev, participantInput.trim()]); setParticipantInput(''); } }}
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Nhắc lịch</Text>
              <Switch value={hasReminder} onValueChange={setHasReminder} trackColor={{ false: '#ccc', true: Colors.primary }} thumbColor="#fff" />
            </View>

            {hasReminder && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Thiết lập nhắc lịch</Text>
                  <CustomPicker value={reminderConfig} options={['Tùy chỉnh', ...reminderPresets.map((p: any) => p.name)]} onSelect={setReminderConfig} />
                </View>

                {localReminderRules.map((reminder, idx) => {
                  const showBeforeParams = reminder.timing === 'Trước khi bắt đầu' || reminder.timing === 'Trước khi kết thúc';
                  const isDayUnit = reminder.unit === 'Ngày';

                  return (
                    <View key={reminder.id} style={styles.reminderCard}>
                      <View style={styles.reminderCardHeader}>
                        <Text style={styles.reminderCardTitle}>Nhắc lịch {idx + 1}</Text>
                        <TouchableOpacity onPress={() => removeReminderRule(reminder.id)} activeOpacity={0.7}>
                          <MaterialIcons name="delete-outline" size={22} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={{ marginTop: 16 }}>
                        <Text style={styles.subLabel}>Thời điểm</Text>
                        <CustomPicker
                          value={reminder.timing}
                          options={['Trước khi bắt đầu', 'Khi bắt đầu', 'Trước khi kết thúc', 'Khi kết thúc']}
                          onSelect={(val) => updateReminderRule(reminder.id, 'timing', val)}
                        />
                      </View>

                      {showBeforeParams && (
                        <View style={[styles.rowGroup, { marginTop: 16, gap: 12 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.subLabel}>Giá trị</Text>
                            <TextInput style={styles.numberInput} value={reminder.amount} onChangeText={(val) => updateReminderRule(reminder.id, 'amount', val)} keyboardType="numeric" />
                          </View>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.subLabel}>Đơn vị</Text>
                            <View style={styles.pickerRow}>
                              {['Phút', 'Giờ', 'Ngày'].map(opt => (
                                <PickerOption key={opt} label={opt} selected={reminder.unit === opt} onPress={() => updateReminderRule(reminder.id, 'unit', opt)} />
                              ))}
                            </View>
                          </View>
                        </View>
                      )}

                      {isDayUnit && showBeforeParams && (
                        <View style={{ marginTop: 16 }}>
                          <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.subLabel}>Giờ nhắc trong ngày</Text>
                            <TouchableOpacity onPress={() => { 
                              setActiveTimeSlotReminderId(reminder.id); 
                              setTempTimeSlot(format(new Date(), 'HH:mm'));
                              setShowPicker(true); 
                              setPickerTarget('timeSlot'); 
                              setPickerMode('time'); 
                            }}>
                              <MaterialIcons name="add-alarm" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.chipsContainer}>
                            {reminder.timeSlots.map((time: string) => (
                              <View key={time} style={styles.chip}>
                                <Text style={styles.chipText}>{time}</Text>
                                <TouchableOpacity onPress={() => updateReminderRule(reminder.id, 'timeSlots', reminder.timeSlots.filter((t: string) => t !== time))}>
                                  <MaterialIcons name="cancel" size={16} color={Colors.outline} />
                                </TouchableOpacity>
                              </View>
                            ))}
                            {reminder.timeSlots.length === 0 && <Text style={styles.infoText}>Chưa có giờ cụ thể</Text>}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity style={styles.addReminderBtn} activeOpacity={0.7} onPress={addReminderItem}>
                  <MaterialIcons name="add-circle-outline" size={22} color={Colors.primary} />
                  <Text style={styles.addReminderText}>Thêm quy tắc nhắc lịch</Text>
                </TouchableOpacity>
              </>
            )}
          </View>



          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.9}>
            <Text style={styles.saveBtnText}>{loading ? 'Đang lưu...' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>

        {(showPicker && Platform.OS === 'android') && <DateTimePicker value={getPickerDateRaw()} mode={pickerMode} display="default" onChange={onDateChange} />}
        {(showPicker && Platform.OS === 'ios') && (
          <Modal transparent animationType="fade">
            <View style={styles.modalBackdrop}>
               <View style={styles.modalContentPicker}>
                  <View style={styles.pickerHeaderiOS}>
                    <TouchableOpacity onPress={() => {
                        if (pickerTarget === 'timeSlot' && activeTimeSlotReminderId) {
                          const val = tempTimeSlot || format(new Date(), 'HH:mm');
                          const r = localReminderRules.find(x => x.id === activeTimeSlotReminderId);
                          if (r) updateReminderRule(r.id, 'timeSlots', [...r.timeSlots, val]);
                        }
                        setShowPicker(false);
                        setActiveTimeSlotReminderId(null);
                        setTempTimeSlot(null);
                      }}>
                      <Text style={styles.pickerDoneText}>Xong</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker value={getPickerDateRaw()} mode={pickerMode} display="spinner" onChange={onDateChange} textColor="#000" />
               </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.8)' },
  iconBtn: { padding: 4, borderRadius: 8 },
  headerTitle: { fontFamily: FontFamily.manropeBold, fontSize: FontSize.titleLg, color: '#1a1c1c' },
  divider: { height: 1, backgroundColor: '#f3f3f4', width: '100%' },
  formContainer: { paddingHorizontal: 24, paddingVertical: 16 },
  section: { marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, marginBottom: 8 },
  input: { backgroundColor: Colors.surfaceContainerLow || '#f3f3f4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontFamily: FontFamily.interMedium, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  textArea: { minHeight: 90 },
  segmentControl: { flexDirection: 'row', backgroundColor: Colors.surfaceContainerLow || '#f3f3f4', borderRadius: 12, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: Colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  segmentTextActive: { color: '#fff' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow || '#f3f3f4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16 },
  dummyInputValue: { flex: 1, fontFamily: FontFamily.interMedium, fontSize: FontSize.bodyMd, color: Colors.onSurface, padding: 0 },
  inputIcon: { marginLeft: 8 },
  inputError: { borderColor: '#ba1a1a', borderWidth: 1.5 },
  textError: { color: '#ba1a1a' },
  errorText: { fontFamily: FontFamily.interMedium, fontSize: 12, color: '#ba1a1a', marginTop: 4, marginLeft: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  reminderCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: Colors.surfaceContainerHighest || 'rgba(193, 198, 214, 0.3)' },
  reminderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reminderCardTitle: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.outline, textTransform: 'uppercase', letterSpacing: 0.5 },
  subLabel: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.outline, marginBottom: 8 },
  rowGroup: { flexDirection: 'row' },
  addReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant || 'rgba(193, 198, 214, 0.3)',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addReminderText: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.primary },
  pickerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  numberInput: {
    backgroundColor: Colors.surfaceContainerLow || '#f3f3f4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: FontSize.bodyMd,
    fontFamily: FontFamily.interMedium,
    color: Colors.onSurface,
  },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLow || '#f3f3f4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  chipText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
  },
  infoText: { fontFamily: FontFamily.interRegular, fontSize: 12, color: Colors.outline, fontStyle: 'italic' },
  bottomBar: { padding: 24, backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(193, 198, 214, 0.1)' },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { fontFamily: FontFamily.interBold, fontSize: FontSize.bodyLg, color: '#ffffff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContentPicker: { backgroundColor: '#fff', borderRadius: 16, paddingBottom: 16, width: '100%', overflow: 'hidden' },
  pickerHeaderiOS: { flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: '#f0f0f0', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  pickerDoneText: { fontFamily: FontFamily.interBold, color: Colors.primary, fontSize: FontSize.bodyLg },
  cardBox: { padding: 16, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 2, borderColor: 'rgba(193, 198, 214, 0.15)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, elevation: 1 },
  cardBoxTitle: { fontFamily: FontFamily.interBold, fontSize: FontSize.labelSm, color: Colors.onSurface, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  chipItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceContainerLow || '#f3f3f4', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  chipItemText: { fontFamily: FontFamily.interMedium, fontSize: FontSize.bodyMd, color: Colors.onSurface, flex: 1 },
  chipItemSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceVariant || '#e2e2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  chipTextSmall: { fontFamily: FontFamily.interMedium, fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(26, 115, 232, 0.2)', backgroundColor: 'transparent' },
  ghostBtnText: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.primary, marginLeft: 8 },
});
