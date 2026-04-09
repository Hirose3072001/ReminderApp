import { supabase } from './supabase';
import { Reminder, upsertReminder } from '../database/queries';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';

export const invitationService = {
  /**
   * Kiểm tra xem một email có tồn tại trong hệ thống (bảng profiles) không
   */
  async checkUserExists(email: string): Promise<{ exists: boolean; userId?: string }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle(); // Dùng maybeSingle để không văng lỗi PGRST116 nếu không tìm thấy
      
      if (error || !data) return { exists: false };
      return { exists: true, userId: data.id };
    } catch (err) {
      console.error('Error checking user exists:', err);
      return { exists: false };
    }
  },

  /**
   * Gửi lời mời tới danh sách email
   */
  async sendInvitations(reminderId: string, reminderData: any, emails: string[]) {
    const sender = useAuthStore.getState().profile;
    if (!sender) return;

    for (const email of emails) {
      // 1. Kiểm tra user (Tùy chọn)
      // Do chính sách RLS của profiles thường chặn xem thông tin người khác,
      // nên bước checkUserExists có thể luôn trả về false.
      // Vì vậy ta cứ tạo lời mời. Người dùng nào có email khớp sẽ nhận được.
      const { exists } = await this.checkUserExists(email);
      if (!exists) {
        console.log(`User ${email} profile not public or not found. Inserting invitation anyway.`);
      }

      // 2. Tạo bản ghi invitation trên Supabase
      const { error } = await supabase
        .from('invitations')
        .insert({
          sender_id: sender.id,
          receiver_email: email,
          reminder_id: reminderId,
          reminder_data: reminderData,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`Failed to send invitation to ${email}:`, error);
      } else {
        console.log(`Invitation sent successfully to ${email}`);
      }
    }
  },

  /**
   * Phản hồi lời mời (Chấp nhận hoặc Từ chối)
   */
  async respondToInvitation(invitationId: string, status: 'accepted' | 'rejected', reminderData?: any) {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false };

    try {
      // 1. Cập nhật trạng thái trên Supabase
      const { error } = await supabase
        .from('invitations')
        .update({ status })
        .eq('id', invitationId);

      if (error) throw error;

      // 2. Nếu chấp nhận, thêm vào cơ sở dữ liệu local
      if (status === 'accepted' && reminderData) {
        const newReminder: Reminder = {
          ...reminderData,
          user_id: user.id, // Đổi sang ID người nhận
          synced: 0, // Đánh dấu chưa sync để syncService đẩy lên Cloud của người nhận
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completed: 0,
        };
        
        // Thêm hoặc cập nhật SQLite local
        upsertReminder(newReminder);
        
        // Load lại danh sách nhắc nhở (cần import store hoặc trigger sync)
        const { useReminderStore } = require('../store/useReminderStore');
        useReminderStore.getState().loadReminders();
      }

      return { success: true };
    } catch (err) {
      console.error('Error responding to invitation:', err);
      return { success: false, error: err };
    }
  }
};
