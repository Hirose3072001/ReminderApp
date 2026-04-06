import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Colors, FontFamily, FontSize, Radius } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

export type PickerMode = 'date' | 'hour' | 'minute';

interface WebDateTimePickerProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onSelect: (date: Date) => void;
  mode: PickerMode;
}

export const WebDateTimePicker: React.FC<WebDateTimePickerProps> = ({
  visible,
  onClose,
  value,
  onSelect,
  mode
}) => {
  if (Platform.OS !== 'web' && !visible) return null;

  const renderHourPicker = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return (
      <View style={styles.gridContainer}>
        <Text style={styles.pickerTitle}>Chọn Giờ</Text>
        <View style={styles.grid}>
          {hours.map((h) => {
            const isSelected = value.getHours() === h;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => {
                  const newDate = new Date(value);
                  newDate.setHours(h);
                  onSelect(newDate);
                }}
                style={[styles.gridItem, isSelected && styles.gridItemActive]}
              >
                <Text style={[styles.gridText, isSelected && styles.gridTextActive]}>
                  {h.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMinutePicker = () => {
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
    return (
      <View style={styles.gridContainer}>
        <Text style={styles.pickerTitle}>Chọn Phút</Text>
        <View style={styles.grid}>
          {minutes.map((m) => {
            const isSelected = value.getMinutes() === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  const newDate = new Date(value);
                  newDate.setMinutes(m);
                  onSelect(newDate);
                }}
                style={[styles.gridItem, isSelected && styles.gridItemActive]}
              >
                <Text style={[styles.gridText, isSelected && styles.gridTextActive]}>
                  {m.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={styles.manualInput}
          placeholder="Nhập phút khác (0-59)..."
          keyboardType="numeric"
          maxLength={2}
          onSubmitEditing={(e) => {
            const m = parseInt(e.nativeEvent.text);
            if (!isNaN(m) && m >= 0 && m < 60) {
              const newDate = new Date(value);
              newDate.setMinutes(m);
              onSelect(newDate);
            }
          }}
        />
      </View>
    );
  };

  const renderDatePicker = () => {
    return (
      <View style={styles.calendarContainer}>
        <Text style={styles.pickerTitle}>Chọn Ngày</Text>
        <Calendar
          current={format(value, 'yyyy-MM-dd')}
          onDayPress={(day: any) => {
            const newDate = new Date(value);
            const selected = new Date(day.timestamp);
            newDate.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
            onSelect(newDate);
          }}
          markedDates={{
            [format(value, 'yyyy-MM-dd')]: { selected: true, selectedColor: Colors.primary }
          }}
          theme={{
            todayTextColor: Colors.primary,
            arrowColor: Colors.primary,
            textDayFontFamily: FontFamily.interRegular,
            textMonthFontFamily: FontFamily.manropeBold,
            textDayHeaderFontFamily: FontFamily.interSemiBold,
          }}
        />
      </View>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop}>
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === 'date' ? 'Chọn Ngày' : mode === 'hour' ? 'Chọn Giờ' : 'Chọn Phút'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
            {mode === 'date' && renderDatePicker()}
            {mode === 'hour' && renderHourPicker()}
            {mode === 'minute' && renderMinutePicker()}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Cần import TextInput cục bộ vì nó có thể trigger keyboard trên mobile
const TextInput = require('react-native').TextInput;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { backgroundColor: '#fff', borderRadius: Radius.xl, width: Platform.OS === 'web' ? 400 : '90%', maxHeight: '80%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow },
  headerTitle: { fontFamily: FontFamily.manropeBold, fontSize: FontSize.titleMd, color: Colors.onSurface },
  closeBtn: { padding: 4 },
  pickerTitle: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  gridContainer: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  gridItem: { width: 60, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md },
  gridItemActive: { backgroundColor: Colors.primary },
  gridText: { fontFamily: FontFamily.interMedium, fontSize: FontSize.bodyMd, color: Colors.onSurface },
  gridTextActive: { color: '#fff' },
  manualInput: { marginTop: 16, padding: 12, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, fontFamily: FontFamily.interMedium },
  calendarContainer: { padding: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow },
  doneBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
  doneBtnText: { fontFamily: FontFamily.interBold, fontSize: FontSize.bodyMd, color: '#fff' },
});
