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
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 40; // formContainer padding is 20, so 20 * 2 = 40
const CARD_PADDING = 48; // ruleCard padding is 24, so 24 * 2 = 48
const TOTAL_HORIZONTAL_PADDING = GRID_PADDING + CARD_PADDING;
const DAY_BUTTON_GAP = 8;
const MONTH_BUTTON_GAP = 8;

// Calc width for 7 columns (Weekly)
const itemWidth = (SCREEN_WIDTH - TOTAL_HORIZONTAL_PADDING - (DAY_BUTTON_GAP * 6)) / 7;

// Calc width for 7 columns (Monthly)
const monthItemWidth = (SCREEN_WIDTH - TOTAL_HORIZONTAL_PADDING - (MONTH_BUTTON_GAP * 6)) / 7;

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
    { id: 'r-' + Date.now(), timing: 'Trước khi bắt đầu', amount: '15', unit: 'Phút', frequency: 'none', repeatWeekDays: [], repeatMonthDays: [], timeSlots: [] }
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
      timing: 'Trước khi bắt đầu',
      amount: '10',
      unit: 'Phút',
      frequency: 'none',
      repeatWeekDays: [],
      repeatMonthDays: [],
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

  // Helper to convert field names if needed (though we've aligned them now)
  const updateRuleField = (id: string, field: keyof ReminderRule, value: any) => {
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r;
      
      let newValue = value;
      // Enforce amount >= 1
      if (field === 'amount') {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          newValue = value === '' ? '' : '1'; 
        } else {
          newValue = num.toString();
        }
      }

      const updatedRule = { ...r, [field]: newValue };

      // Default 07:00 for large units or recurring frequencies
      const isLargeUnit = updatedRule.unit === 'Ngày' || updatedRule.unit === 'Tuần' || updatedRule.unit === 'Tháng';
      const isRecurring = updatedRule.frequency !== 'none';
      
      if ((isLargeUnit || isRecurring) && updatedRule.timeSlots.length === 0) {
        updatedRule.timeSlots = ['07:00'];
      }

      return updatedRule;
    }));
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
             const showBeforeParams = rule.timing === 'Trước khi bắt đầu' || rule.timing === 'Trước khi kết thúc';
             const isLargeUnit = rule.unit === 'Ngày' || rule.unit === 'Tuần' || rule.unit === 'Tháng';
             const showTimeSlots = (isLargeUnit && showBeforeParams) || rule.frequency !== 'none';

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
                    value={rule.timing}
                    options={['Trước khi bắt đầu', 'Khi bắt đầu', 'Trước khi kết thúc', 'Khi kết thúc']}
                    onSelect={(val) => updateRuleField(rule.id, 'timing', val)}
                  />
                </View>

                {showBeforeParams && (
                  <View style={[styles.rowGroup, { marginTop: 16, gap: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subLabel}>Giá trị</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={rule.amount}
                        onChangeText={(val) => updateRuleField(rule.id, 'amount', val)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.subLabel}>Đơn vị</Text>
                      <CustomPicker 
                        value={rule.unit}
                        options={['Phút', 'Giờ', 'Ngày', 'Tuần', 'Tháng']}
                        onSelect={(val) => {
                          updateRuleField(rule.id, 'unit', val);
                          if (val === 'Phút' || val === 'Giờ') {
                            updateRuleField(rule.id, 'frequency', 'none');
                          }
                        }}
                      />
                    </View>
                  </View>
                )}

                {showBeforeParams && isLargeUnit && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.subLabel}>Lặp lại</Text>
                    <CustomPicker 
                      value={rule.frequency === 'none' ? 'Không lặp' : rule.frequency === 'daily' ? 'Hàng ngày' : rule.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}
                      options={['Không lặp', 'Hàng ngày', 'Hàng tuần', 'Hàng tháng']}
                      onSelect={(val) => {
                        const freqMap: any = { 'Không lặp': 'none', 'Hàng ngày': 'daily', 'Hàng tuần': 'weekly', 'Hàng tháng': 'monthly' };
                        updateRuleField(rule.id, 'frequency', freqMap[val]);
                      }}
                    />
                  </View>
                )}

                {rule.frequency === 'weekly' && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.subLabel}>Chọn thứ lặp lại</Text>
                    <View style={styles.selectorGrid}>
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                        <TouchableOpacity
                          key={day}
                          style={[styles.selectorBtn, rule.repeatWeekDays.includes(day) && styles.selectorBtnActive]}
                          onPress={() => {
                            const current = rule.repeatWeekDays;
                            const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
                            updateRuleField(rule.id, 'repeatWeekDays', next);
                          }}
                        >
                          <Text style={[styles.selectorText, rule.repeatWeekDays.includes(day) && styles.selectorTextActive]}>{day}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {rule.frequency === 'monthly' && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.subLabel}>Chọn ngày lặp lại</Text>
                    <View style={styles.monthGrid}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <TouchableOpacity
                          key={day}
                          style={[styles.monthBtn, rule.repeatMonthDays.includes(day) && styles.monthBtnActive]}
                          onPress={() => {
                            const current = rule.repeatMonthDays;
                            const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
                            updateRuleField(rule.id, 'repeatMonthDays', next.sort((a,b)=>a-b));
                          }}
                        >
                          <Text style={[styles.monthText, rule.repeatMonthDays.includes(day) && styles.monthTextActive]}>{day}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {showTimeSlots && (
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
                          <TouchableOpacity onPress={() => updateRuleField(rule.id, 'timeSlots', rule.timeSlots.filter(t => t !== time))}>
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
                              updateRuleField(rule.id, 'timeSlots', [...rule.timeSlots, timeStr].sort());
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
                          updateRuleField(activeRuleId, 'timeSlots', [...rule.timeSlots, val].sort());
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
  container: { flex: 1, backgroundColor: '#ffffff' },
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
    borderColor: Colors.surfaceContainerHighest || 'rgba(193, 198, 214, 0.3)',
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
    backgroundColor: '#ffffff',
    borderColor: '#E8F1FF',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    paddingVertical: 0,
    fontSize: FontSize.bodyLg,
    fontFamily: FontFamily.interSemiBold,
    color: Colors.onSurface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
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
  selectorGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: DAY_BUTTON_GAP, 
    justifyContent: 'space-between',
    marginTop: 8 
  },
  selectorBtn: { 
    width: itemWidth, 
    height: itemWidth, 
    borderRadius: 12, 
    backgroundColor: '#ffffff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#E8F1FF' 
  },
  selectorBtnActive: { 
    backgroundColor: Colors.primary, 
    borderColor: Colors.primary, 
    elevation: 4, 
    shadowColor: Colors.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  selectorText: { 
    fontFamily: FontFamily.interSemiBold, 
    fontSize: 13, 
    color: Colors.onSurfaceVariant 
  },
  selectorTextActive: { 
    color: '#ffffff', 
    fontWeight: 'bold' 
  },
  monthGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: MONTH_BUTTON_GAP, 
    justifyContent: 'space-between', // Center by balancing gaps
    marginTop: 8 
  },
  monthBtn: { 
    width: monthItemWidth, 
    height: monthItemWidth, 
    borderRadius: 8, 
    backgroundColor: '#ffffff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#E8F1FF' 
  },
  monthBtnActive: { 
    backgroundColor: Colors.primary, 
    borderColor: Colors.primary, 
    elevation: 3 
  },
  monthText: { 
    fontFamily: FontFamily.interMedium, 
    fontSize: 13, 
    color: Colors.onSurfaceVariant 
  },
  monthTextActive: { 
    color: '#ffffff', 
    fontWeight: 'bold' 
  },
});
