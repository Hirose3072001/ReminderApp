import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { aiService } from '../services/aiService';
import { useReminderStore } from '../store/useReminderStore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: 'pending' | 'confirmed' | 'cancelled';
  actionData?: {
    type: 'create_reminder';
    params: {
      type: 'event' | 'task';
      title: string;
      description: string;
      dueDate: string;
      subtasks?: string[];
    };
  };
}

export const AIChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là Trợ lý AI của Remind Me. Tôi có thể giúp bạn tạo lịch hẹn hoặc công việc nhanh chóng. Thử nói: "Tạo lịch họp lúc 3h chiều mai" nhé!',
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { addReminder } = useReminderStore();

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    // Gọi AI để phân tích
    try {
      const parsed = await aiService.parseCommand(userMessage.text);
      
      let botReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        timestamp: new Date(),
        text: '',
      };

      if (parsed.action === 'create') {
        const timeStr = format(new Date(parsed.dateTime), 'HH:mm - dd/MM/yyyy', { locale: vi });
        botReply.text = `Tôi đã nhận được yêu cầu ${parsed.type === 'event' ? 'sự kiện' : 'công việc'}: "${parsed.title}" vào lúc ${timeStr}.\nBạn có muốn thêm mục này vào lịch không?`;
        
        // Chuẩn bị dữ liệu để xác nhận
        let finalDescription = `Được tạo bởi Trợ lý AI: ${userMessage.text}`;
        if (parsed.subtasks && parsed.subtasks.length > 0) {
          finalDescription += `\n\n[Nhiệm vụ cần làm]\n` + parsed.subtasks.map(s => `- [ ] ${s}`).join('\n');
        }

        botReply.status = 'pending';
        botReply.actionData = {
          type: 'create_reminder',
          params: {
            type: parsed.type,
            title: parsed.title,
            description: finalDescription,
            dueDate: parsed.dateTime,
            subtasks: parsed.subtasks
          }
        };
      } else {
        botReply.text = 'Xin lỗi, tôi chưa hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn hành động muốn thực hiện (ví dụ: tạo, thêm, nhắc...) không?';
      }

      setMessages(prev => [...prev, botReply]);
    } catch (error) {
      console.error('AIChat Error:', error);
      const errorReply: Message = {
        id: Date.now().toString(),
        sender: 'bot',
        timestamp: new Date(),
        text: 'Có lỗi xảy ra khi kết nối với AI. Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình API Key.',
      };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTask = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.actionData) {
        // Thực hiện tạo trong database
        addReminder({
          type: msg.actionData.params.type,
          title: msg.actionData.params.title,
          description: msg.actionData.params.description,
          priority: 'medium',
          dueDate: msg.actionData.params.dueDate,
        });

        return { 
          ...msg, 
          status: 'confirmed' as const,
          text: `Tuyệt vời! Tôi đã thêm xong ${msg.actionData.params.type === 'event' ? 'sự kiện' : 'công việc'} "${msg.actionData.params.title}" vào lịch của bạn.`
        };
      }
      return msg;
    }));
  };

  const cancelTask = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { 
          ...msg, 
          status: 'cancelled' as const,
          text: 'Đã hủy yêu cầu thêm vào lịch.' 
        };
      }
      return msg;
    }));
  };

  useEffect(() => {
    // Tự động cuộn xuống khi có tin nhắn mới
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageWrapper,
      item.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper
    ]}>
      <View style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userMessageText : styles.botMessageText
        ]}>
          {item.text}
        </Text>
        
        {item.status === 'pending' && item.actionData && (
          <View style={styles.confirmationContainer}>
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <MaterialIcons name={item.actionData.params.type === 'event' ? 'event' : 'assignment'} size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.previewTitle} numberOfLines={1}>{item.actionData.params.title}</Text>
              </View>
              <View style={styles.previewRow}>
                <MaterialIcons name="access-time" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.previewTime}>{format(new Date(item.actionData.params.dueDate), 'HH:mm - dd/MM/yyyy')}</Text>
              </View>
              {item.actionData.params.subtasks && item.actionData.params.subtasks.length > 0 && (
                <View style={styles.previewSubtasks}>
                  {item.actionData.params.subtasks.slice(0, 2).map((s, idx) => (
                    <Text key={idx} style={styles.subtaskItem} numberOfLines={1}>• {s}</Text>
                  ))}
                  {item.actionData.params.subtasks.length > 2 && (
                    <Text style={styles.subtaskMore}>+ {item.actionData.params.subtasks.length - 2} nhiệm vụ khác...</Text>
                  )}
                </View>
              )}
            </View>
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => cancelTask(item.id)}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={() => confirmTask(item.id)}>
                <MaterialIcons name="add-task" size={16} color={Colors.onPrimary} />
                <Text style={styles.confirmButtonText}>Thêm vào lịch</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {item.status === 'confirmed' && (
          <View style={styles.confirmedBadge}>
            <MaterialIcons name="check-circle" size={14} color="#2DCE89" />
            <Text style={styles.confirmedText}>Đã thêm</Text>
          </View>
        )}
      </View>
      <Text style={styles.timestamp}>
        {format(item.timestamp, 'HH:mm')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.aiAvatar}>
            <MaterialIcons name="auto-awesome" size={20} color={Colors.onPrimary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Trợ lý thông minh</Text>
            <View style={styles.statusContainer}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Đang trực tuyến</Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? (
            <View style={styles.loadingWrapper}>
              <View style={styles.botBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            </View>
          ) : null}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ví dụ: Lên lịch họp lúc 12h..."
            placeholderTextColor={Colors.onSurfaceVariant}
            multiline
            maxLength={200}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <MaterialIcons name="send" size={20} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2DCE89',
    marginRight: 4,
  },
  statusText: {
    fontFamily: FontFamily.interRegular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  botMessageWrapper: {
    alignSelf: 'flex-start',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontFamily: FontFamily.interRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  botMessageText: {
    color: Colors.onSurface,
  },
  userMessageText: {
    color: Colors.onPrimary,
  },
  timestamp: {
    fontFamily: FontFamily.interRegular,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    marginHorizontal: 4,
  },
  loadingWrapper: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 92,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    maxHeight: 100,
    fontFamily: FontFamily.interRegular,
    fontSize: 15,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.outlineVariant,
  },
  confirmationContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 12,
  },
  previewCard: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 14,
    color: Colors.onSurface,
    marginLeft: 8,
    flex: 1,
  },
  previewTime: {
    fontFamily: FontFamily.interRegular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginLeft: 8,
  },
  previewSubtasks: {
    marginTop: 4,
    paddingLeft: 22,
  },
  subtaskItem: {
    fontFamily: FontFamily.interRegular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  subtaskMore: {
    fontFamily: FontFamily.interRegular,
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F3F5',
  },
  cancelButtonText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  confirmButtonText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F9F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  confirmedText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: 11,
    color: '#2DCE89',
  },
});
