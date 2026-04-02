import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../theme';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, updateProfile, fetchProfile } = useAuthStore();
  
  const [fullName, setFullName] = useState('');
  const [job, setJob] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState(new Date());
  const [tempBirthday, setTempBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setJob(profile.job || '');
      setPhone(profile.phone || '');
      if (profile.birthday) {
        const date = new Date(profile.birthday);
        setBirthday(date);
        setTempBirthday(date);
      }
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [profile, user]);

  const handleSave = async (updatedFields?: any) => {
    setLoading(true);
    const dataToSave = {
      full_name: fullName.trim(),
      job: job.trim(),
      phone: phone.trim(),
      birthday: birthday.toISOString(),
      ...updatedFields
    };

    if (!dataToSave.full_name) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên');
      setLoading(false);
      return;
    }

    const result = await updateProfile(dataToSave);
    setLoading(false);

    if (result.success) {
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật');
    } else {
      Alert.alert('Lỗi', result.error || 'Không thể cập nhật thông tin');
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        setBirthday(selectedDate);
      }
    } else {
      // iOS: Just update temp state
      if (selectedDate) {
        setTempBirthday(selectedDate);
      }
    }
  };

  const handleConfirmIOS = () => {
    setShowDatePicker(false);
    setBirthday(tempBirthday);
  };

  const userEmail = user?.email || 'Chưa cập nhật email';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý hồ sơ cá nhân</Text>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={() => handleSave()} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
            <TouchableOpacity style={styles.editAvatarButton} activeOpacity={0.8}>
              <MaterialIcons name="photo-camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{fullName || user?.email?.split('@')[0] || 'Người dùng'}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Họ và tên:</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập họ và tên"
              placeholderTextColor={Colors.outline}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email:</Text>
            <View style={[styles.input, styles.disabledInput]}>
              <Text style={styles.disabledInputText}>{userEmail}</Text>
              <MaterialIcons name="lock-outline" size={18} color={Colors.outline} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại:</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Nhập số điện thoại"
              placeholderTextColor={Colors.outline}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ngày sinh:</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.inputText}>
                {birthday ? format(birthday, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày sinh'}
              </Text>
              <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Date Picker Modal for iOS / or Plain for Android */}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerCancelText}>Hủy</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Chọn ngày sinh</Text>
                    <TouchableOpacity onPress={handleConfirmIOS}>
                      <Text style={styles.pickerDoneText}>Xong</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempBirthday}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    textColor={Colors.onSurface}
                  />
                </View>
              </View>
            </Modal>
          )}

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={birthday}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Công việc:</Text>
            <TextInput
              style={styles.input}
              value={job}
              onChangeText={setJob}
              placeholder="Nhập công việc của bạn"
              placeholderTextColor={Colors.outline}
            />
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Remind Me v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 18,
    color: Colors.onSurface,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  saveButtonText: {
    fontFamily: FontFamily.interBold,
    fontSize: 16,
    color: Colors.primary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing[4],
    width: 100,
    height: 100,
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceContainer,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  userName: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 22,
    color: Colors.onSurface,
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: FontFamily.interRegular,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  formSection: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: 14,
    color: Colors.onSurface,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    color: Colors.onSurface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    color: Colors.onSurface,
  },
  disabledInput: {
    backgroundColor: '#F8F9FA',
    borderColor: '#F1F3F5',
  },
  disabledInputText: {
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    color: Colors.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  pickerTitle: {
    fontFamily: FontFamily.manropeBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  pickerCancelText: {
    fontFamily: FontFamily.interMedium,
    fontSize: 16,
    color: Colors.onSurfaceVariant,
  },
  pickerDoneText: {
    fontFamily: FontFamily.interBold,
    fontSize: 16,
    color: Colors.primary,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FontFamily.interRegular,
    fontSize: 12,
    color: Colors.outline,
  }
});
