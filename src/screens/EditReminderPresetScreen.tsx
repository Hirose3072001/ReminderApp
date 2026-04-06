import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore, ReminderRule, ReminderPreset } from '../store/useSettingsStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid } from 'date-fns';
import { CustomPicker, PickerOption } from '../components/ui/CustomPicker';
import { WebDateSegmentInput } from '../components/ui/WebDateSegmentInput';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditReminderPreset'>;
  route: RouteProp<RootStackParamList, 'EditReminderPreset'>;
};

export const EditReminderPresetScreen: React.FC<Props> = ({ navigation, route }) => {
  const { presetId } = route.params || {};
  const { reminderPresets, addPreset, updatePreset } = useSettingsStore();

  const preset = useMemo(() => 
    presetId ? reminderPresets.find(p => p.id === presetId) : undefined
  , [reminderPresets, presetId]);

  if (presetId && !preset) {
    navigation.goBack();
    return null;
  }

  const [name, setName] = useState(preset?.name ?? 'Bộ nhắc mới');
  const [rules, setRules] = useState<ReminderRule[]>(preset?.rules ?? [
    { id: 'r-' + Date.now(), type: 'before_start', offsetValue: 15, offsetUnit: 'minutes', timeSlots: [] }
  ]);

  const isDuplicateName = useMemo(() => {
    if (!name.trim()) return false;
    return reminderPresets.some(p => 
      p.name.trim().toLowerCase() === name.trim().toLowerCase() && 
      (!presetId || p.id !== presetId)
    );
  }, [name, reminderPresets, presetId]);

  // Time Picker State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [tempTimeSlot, setTempTimeSlot] = useState<string | null>(null);
  const [webAddingTimeSlotRuleId, setWebAddingTimeSlotRuleId] = useState<string | null>(null);
  const [webNewTimeSlot, setWebNewTimeSlot] = useState(new Date());

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên bộ nhắc lịch');
      return;
    }
    if (isDuplicateName) {
      Alert.alert('Lỗi', 'Tên bộ nhắc này đã tồn tại');
      return;
    }
    
    if (presetId) {
      updatePreset(presetId, name.trim(), rules);
    } else {
      addPreset(name.trim(), rules);
    }
    navigation.goBack();
  };

  const addRule = () => {
    const newRule: ReminderRule = {
      id: 'r-' + Date.now(),
      type: 'before_start',
      offsetValue: 15,
      offsetUnit: 'minutes',
      timeSlots: []
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<ReminderRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const addTimeSlot = (ruleId: string) => {
    setActiveRuleId(ruleId);
    if (Platform.OS === 'web') {
      setWebAddingTimeSlotRuleId(ruleId);
      setWebNewTimeSlot(new Date());
    } else {
      setTempTimeSlot(format(new Date(), 'HH:mm'));
      setShowTimePicker(true);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed' || !selectedDate || !activeRuleId) {
      if (Platform.OS === 'android') setActiveRuleId(null);
      return;
    }

    const timeStr = format(selectedDate, 'HH:mm');
    if (Platform.OS === 'android') {
      const rule = rules.find(r => r.id === activeRuleId);
      if (rule && !rule.timeSlots.includes(timeStr)) {
        updateRule(activeRuleId, { timeSlots: [...rule.timeSlots, timeStr].sort() });
      }
      setActiveRuleId(null);
    } else {
      setTempTimeSlot(timeStr);
    }
  };

  const getPickerDateRaw = () => {
    if (tempTimeSlot) {
      const [h, m] = tempTimeSlot.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
    return new Date();
  };

  const getTimingText = (type: string) => {
    switch (type) {
      case 'before_start': return 'Trước khi bắt đầu';
      case 'at_start': return 'Khi bắt đầu';
      case 'before_end': return 'Trước khi kết thúc';
      case 'at_end': return 'Khi kết thúc';
      default: return 'Chọn thời điểm...';
    }
  };

  const getTypeValue = (text: string): any => {
    switch (text) {
      case 'Trước khi bắt đầu': return 'before_start';
      case 'Khi bắt đầu': return 'at_start';
      case 'Trước khi kết thúc': return 'before_end';
      case 'Khi kết thúc': return 'at_end';
      default: return 'at_start';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="close" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{presetId ? 'Chỉnh sửa bộ nhắc' : 'Bộ nhắc lịch mới'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.iconBtn}>
          <MaterialIcons name="check" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>Tên bộ nhắc lịch</Text>
          <TextInput
            style={[styles.input, isDuplicateName && { borderColor: '#ba1a1a', borderWidth: 1.5 }]}
            value={name}
            onChangeText={setName}
            placeholder="Ví dụ: Mặc định, Ưu tiên cao..."
            placeholderTextColor={Colors.outlineVariant}
            autoFocus={name === 'Bộ nhắc mới'}
          />
          {isDuplicateName && <Text style={{ color: '#ba1a1a', fontSize: 12, marginTop: 4, marginLeft: 4 }}>Tên bộ nhắc này đã tồn tại</Text>}
        </View>

        <View style={styles.section}>
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Quy tắc nhắc lịch</Text>
          </View>

          {rules.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-off" size={48} color={Colors.surfaceVariant} />
              <Text style={styles.emptyText}>Chưa có quy tắc nào.</Text>
            </View>
          )}

          {rules.map((rule, idx) => {
             const showBeforeParams = rule.type === 'before_start' || rule.type === 'before_end';
             const isDayUnit = rule.offsetUnit === 'days';

             return (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleCardHeader}>
                  <Text style={styles.ruleCardTitle}>Nhắc lịch {idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeRule(rule.id)}>
                    <MaterialIcons name="delete-outline" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 16 }}>
                  <Text style={styles.subLabel}>Thời điểm</Text>
                  <CustomPicker
                    value={getTimingText(rule.type)}
                    options={['Trước khi bắt đầu', 'Khi bắt đầu', 'Trước khi kết thúc', 'Khi kết thúc']}
                    onSelect={(val) => updateRule(rule.id, { type: getTypeValue(val) })}
                  />
                </View>

                {showBeforeParams && (
                  <View style={[styles.rowGroup, { marginTop: 16, gap: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subLabel}>Giá trị</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={rule.offsetValue?.toString()}
                        onChangeText={(val) => updateRule(rule.id, { offsetValue: parseInt(val) || 0 })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.subLabel}>Đơn vị</Text>
                      <View style={styles.pickerRow}>
                        {[
                          { label: 'Phút', value: 'minutes' },
                          { label: 'Giờ', value: 'hours' },
                          { label: 'Ngày', value: 'days' }
                        ].map(opt => (
                          <PickerOption 
                            key={opt.value}
                            label={opt.label} 
                            selected={rule.offsetUnit === opt.value} 
                            onPress={() => updateRule(rule.id, { offsetUnit: opt.value as any })} 
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {isDayUnit && showBeforeParams && (
                  <View style={{ marginTop: 16 }}>
                    <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.subLabel}>Giờ nhắc trong ngày</Text>
                      <TouchableOpacity onPress={() => addTimeSlot(rule.id)}>
                        <MaterialIcons name="add-alarm" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.chipsContainer}>
                      {rule.timeSlots.map(time => (
                        <View key={time} style={styles.chip}>
                          <Text style={styles.chipText}>{time}</Text>
                          <TouchableOpacity onPress={() => updateRule(rule.id, { timeSlots: rule.timeSlots.filter(t => t !== time) })}>
                            <MaterialIcons name="cancel" size={16} color={Colors.outline} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {rule.timeSlots.length === 0 && !webAddingTimeSlotRuleId && (
                        <Text style={styles.infoText}>Chưa có giờ cụ thể</Text>
                      )}
                    </View>

                    {Platform.OS === 'web' && webAddingTimeSlotRuleId === rule.id && (
                      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <WebDateSegmentInput 
                          mode="time"
                          value={webNewTimeSlot}
                          onChange={setWebNewTimeSlot}
                        />
                        <TouchableOpacity 
                          style={{ backgroundColor: Colors.primary, padding: 8, borderRadius: 8 }}
                          onPress={() => {
                            const timeStr = format(webNewTimeSlot, 'HH:mm');
                            if (!rule.timeSlots.includes(timeStr)) {
                              updateRule(rule.id, { timeSlots: [...rule.timeSlots, timeStr].sort() });
                            }
                            setWebAddingTimeSlotRuleId(null);
                          }}
                        >
                          <MaterialIcons name="check" size={20} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={{ padding: 8 }}
                          onPress={() => setWebAddingTimeSlotRuleId(null)}
                        >
                          <MaterialIcons name="close" size={20} color={Colors.outline} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.addRuleBtnFull} activeOpacity={0.7} onPress={addRule}>
            <MaterialIcons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.addRuleTextFull}>Thêm quy tắc nhắc lịch</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {(showTimePicker && Platform.OS === 'android') && (
        <DateTimePicker
          value={getPickerDateRaw()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={onTimeChange}
        />
      )}

      {(showTimePicker && Platform.OS === 'ios') && (
        <Modal transparent animationType="fade">
          <View style={styles.modalBackdrop}>
             <View style={styles.modalContentPicker}>
                <View style={styles.pickerHeaderiOS}>
                   <TouchableOpacity onPress={() => {
                     if (activeRuleId) {
                        const val = tempTimeSlot || format(new Date(), 'HH:mm');
                        const rule = rules.find(r => r.id === activeRuleId);
                        if (rule && !rule.timeSlots.includes(val)) {
                          updateRule(activeRuleId, { timeSlots: [...rule.timeSlots, val].sort() });
                        }
                     }
                     setShowTimePicker(false);
                     setActiveRuleId(null);
                     setTempTimeSlot(null);
                   }}>
                     <Text style={styles.pickerDoneText}>Xong</Text>
                   </TouchableOpacity>
                </View>
                <DateTimePicker 
                  value={getPickerDateRaw()} 
                  mode="time" 
                  display="spinner" 
                  onChange={onTimeChange} 
                  textColor="#000" 
                  is24Hour={true}
                />
             </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 18,
    color: Colors.onSurface,
  },
  iconBtn: { padding: 8 },
  divider: { height: 1, backgroundColor: Colors.surfaceContainer },
  formContainer: { padding: 20 },
  section: { marginBottom: 32 },
  label: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.labelMd,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  subLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: 13,
    color: Colors.outline,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FontFamily.interRegular,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
  },
  ruleCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
  },
  ruleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleCardTitle: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.labelMd,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dummySelect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow || '#f3f3f4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dummySelectText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
  },
  rowGroup: { flexDirection: 'row' },
  numberInput: {
    backgroundColor: Colors.surfaceContainerLow || '#f3f3f4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: FontSize.bodyMd,
    fontFamily: FontFamily.interMedium,
    color: Colors.onSurface,
  },
  pickerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow || '#f3f3f4',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerChipActive: {
    backgroundColor: '#E8F1FF',
    borderColor: Colors.primary,
  },
  pickerChipText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.labelMd,
    color: Colors.outline,
  },
  pickerChipTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.interSemiBold,
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
  infoText: {
    fontFamily: FontFamily.interRegular,
    fontSize: 12,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow || '#f3f3f4',
    borderRadius: 24,
    gap: 12,
  },
  emptyText: {
    fontFamily: FontFamily.interRegular,
    fontSize: 14,
    color: Colors.outline,
  },
  addRuleBtnFull: {
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
  addRuleTextFull: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.labelMd,
    color: Colors.primary,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentPicker: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingBottom: 16,
    width: '100%',
    overflow: 'hidden',
  },
  pickerHeaderiOS: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerDoneText: {
    fontFamily: FontFamily.interBold,
    color: Colors.primary,
    fontSize: FontSize.bodyLg,
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  modalOptionText: {
    fontFamily: FontFamily.interMedium,
    fontSize: 15,
    color: Colors.onSurface,
  },
  modalOptionActive: {
    color: Colors.primary,
    fontFamily: FontFamily.interBold,
  },
});
