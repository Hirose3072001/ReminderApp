import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore, ReminderRule, ReminderPreset } from '../store/useSettingsStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReminderSettings'>;
};

export const ReminderSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { reminderPresets, addPreset, deletePreset } = useSettingsStore();

  const handleAddPreset = () => {
    navigation.navigate('EditReminderPreset', {});
  };

  const handleMore = (preset: ReminderPreset) => {
    Alert.alert(
      'Tùy chọn',
      `Bạn muốn làm gì với "${preset.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Chỉnh sửa', 
          onPress: () => navigation.navigate('EditReminderPreset', { presetId: preset.id }) 
        },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Xác nhận xóa',
              `Bạn có chắc chắn muốn xóa bộ nhắc "${preset.name}"?`,
              [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa', style: 'destructive', onPress: () => deletePreset(preset.id) }
              ]
            );
          }
        }
      ]
    );
  };

  const getRuleDescription = (rule: ReminderRule, index: number) => {
    let typeText = '';
    if (rule.type === 'before_start') typeText = 'Trước khi bắt đầu';
    else if (rule.type === 'at_start') return `Nhắc lịch ${index + 1}: Tại thời điểm bắt đầu`;
    else if (rule.type === 'before_end') typeText = 'Trước khi kết thúc';

    const unitMap: any = { minutes: 'phút', hours: 'giờ', days: 'ngày' };
    const offsetText = rule.offsetValue ? `${rule.offsetValue} ${unitMap[rule.offsetUnit || 'minutes']}` : '';
    const timeText = rule.timeSlots.length > 0 ? `, Giờ nhắc: ${rule.timeSlots.join(', ')}` : '';

    return `Nhắc lịch ${index + 1}: ${typeText} ${offsetText}${timeText}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thiết lập nhắc lịch</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Danh sách nhắc lịch tùy chỉnh</Text>

        {reminderPresets.map((preset) => (
          <TouchableOpacity 
            key={preset.id} 
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EditReminderPreset', { presetId: preset.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.presetName}>{preset.name}</Text>
              <TouchableOpacity onPress={() => handleMore(preset)}>
                <MaterialIcons name="more-horiz" size={24} color={Colors.outline} />
              </TouchableOpacity>
            </View>
            <View style={styles.rulesContainer}>
              {preset.rules.map((rule, idx) => (
                <Text key={rule.id} style={styles.ruleText}>
                  {getRuleDescription(rule, idx)}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={handleAddPreset}>
          <View style={styles.addButtonInner}>
            <MaterialIcons name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.addButtonText}>Thêm nhắc lịch</Text>
          </View>
        </TouchableOpacity>

        {/* Big Bell Icon Placeholder */}
        <View style={styles.bellContainer}>
          <MaterialIcons name="notifications-none" size={120} color="#F0F0F0" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  headerTitle: { 
    fontFamily: FontFamily.manropeBold, 
    fontSize: 18, 
    color: Colors.onSurface 
  },
  backBtn: { padding: 4 },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  sectionTitle: { 
    fontFamily: FontFamily.interSemiBold, 
    fontSize: 14, 
    color: Colors.onSurface, 
    marginBottom: 20,
    marginTop: 10
  },
  card: { 
    backgroundColor: Colors.surfaceContainerLow, 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 20 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12
  },
  presetName: { 
    fontFamily: FontFamily.interBold, 
    fontSize: 18, 
    color: Colors.onSurface 
  },
  rulesContainer: { gap: 8 },
  ruleText: { 
    fontFamily: FontFamily.interRegular, 
    fontSize: 14, 
    color: Colors.onSurfaceVariant,
    lineHeight: 22
  },
  addButton: {
    marginTop: 10,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonInner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  addButtonText: { 
    fontFamily: FontFamily.interSemiBold, 
    fontSize: 15, 
    color: Colors.onSurface 
  },
  bellContainer: {
    alignItems: 'center',
    marginTop: 60,
  }
});
