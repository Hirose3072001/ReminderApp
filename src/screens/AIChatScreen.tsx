import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';

export const AIChatScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.aiAvatar}>
          <MaterialIcons name="smart-toy" size={24} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Trợ lý AI</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.chatArea}>
        <Text style={styles.dateStamp}>Hôm nay</Text>
        <View style={styles.botMessage}>
          <Text style={styles.messageText}>Xin chào! Tôi có thể giúp bạn sắp xếp lịch trình hoặc tạo công việc mới. Hãy thử nói: "Lên lịch họp lúc 3h chiều mai"</Text>
        </View>
        <View style={styles.userMessage}>
          <Text style={styles.messageTextUser}>Thêm sự kiện đi xem phim tối mai lúc 8h</Text>
        </View>
        <View style={styles.botMessage}>
          <Text style={styles.messageText}>Đã thêm sự kiện "Xem phim" vào 20:00 ngày mai!</Text>
          <View style={styles.actionChip}>
            <MaterialIcons name="open-in-new" size={14} color={Colors.primary} />
            <Text style={styles.actionChipText}>Xem sự kiện</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachBtn}>
          <MaterialIcons name="mic" size={24} color={Colors.outline} />
        </TouchableOpacity>
        <TextInput 
          style={styles.textInput} 
          placeholder="Nhắn tin cho Trợ lý..." 
          placeholderTextColor={Colors.outlineVariant}
        />
        <TouchableOpacity style={styles.sendBtn}>
          <MaterialIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryContainer || '#d8e2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: FontSize.titleMd,
    color: Colors.onSurface,
  },
  chatArea: {
    padding: 16,
    paddingBottom: 40,
  },
  dateStamp: {
    textAlign: 'center',
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.labelSm,
    color: Colors.outline,
    marginBottom: 24,
  },
  botMessage: {
    backgroundColor: Colors.surfaceContainerLowest || '#fff',
    padding: 16,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    maxWidth: '85%',
    marginBottom: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 20,
    borderTopRightRadius: 4,
    maxWidth: '85%',
    marginBottom: 16,
    alignSelf: 'flex-end',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  messageText: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  messageTextUser: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.bodyMd,
    color: '#ffffff',
    lineHeight: 22,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: Colors.primaryContainer || '#d8e2ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionChipText: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.labelSm,
    color: Colors.primary,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceContainerLowest || '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHighest || '#e2e2e2',
  },
  attachBtn: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surfaceContainer || '#eeeeee',
    borderRadius: 22,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
