import { format, subMinutes, subHours, subDays, subWeeks, subMonths, addDays, isAfter, startOfDay, parse, getDay, getDate } from 'date-fns';

/**
 * Chuyển đổi đối tượng Date sang chuỗi ISO chuẩn quốc tế (UTC).
 * Đảm bảo dữ liệu lưu trữ nhất quán trên Database.
 */
export const toLocalISOString = (date: Date): string => {
  return date.toISOString();
};

/**
 * Phân tách chuỗi ngày YYYY-MM-DD và tạo đối tượng Date theo giờ địa phương.
 * Tránh lỗi JavaScript tự động coi YYYY-MM-DD là giờ UTC 00:00.
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export interface ReminderRule {
  timing: 'Khi bắt đầu' | 'Khi kết thúc' | 'Trước khi bắt đầu' | 'Trước khi kết thúc';
  amount: string;
  unit: 'Phút' | 'Giờ' | 'Ngày' | 'Tuần' | 'Tháng';
  frequency: 'none' | 'daily' | 'weekly' | 'monthly';
  repeatWeekDays?: string[]; // ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  repeatMonthDays?: number[]; // [1, 2, ..., 31]
  timeSlots?: string[]; // ['08:00', '20:00']
}

export interface TriggerTime {
  date: Date;
  body: string;
  title: string;
}

/**
 * Tạo ID thông báo mang tính định danh (deterministic).
 * Giúp tránh lặp dữ liệu trên Supabase khi đồng bộ.
 */
export const getDeterministicNotifId = (reminderId: string | null, timestamp: string | Date): string | null => {
  if (!reminderId) return null;
  const timeMs = (typeof timestamp === 'string' ? new Date(timestamp) : timestamp).getTime();
  return `notif_${reminderId}_${timeMs}`;
};

const VI_WEEKDAYS_MAP: Record<number, string> = {
  0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7'
};

export const generateTriggersFromRules = (
  rulesStr: string | null,
  startTime: Date,
  endTime: Date,
  title: string,
  type: 'task' | 'event'
): TriggerTime[] => {
  const triggers: TriggerTime[] = [];
  if (!rulesStr) return triggers;

  try {
    const rules: ReminderRule[] = JSON.parse(rulesStr);
    const isEvent = type === 'event';
    const now = new Date();

    // Chuẩn hóa thời gian
    const start = new Date(startTime);
    start.setSeconds(0, 0);
    const end = new Date(endTime);
    end.setSeconds(0, 0);

    rules.forEach(rule => {
      const baseDate = (rule.timing === 'Khi bắt đầu' || rule.timing === 'Trước khi bắt đầu')
        ? start
        : end;

      if (rule.timing === 'Khi bắt đầu' || rule.timing === 'Khi kết thúc') {
        const atStart = rule.timing === 'Khi bắt đầu';
        const displayBody = isEvent
          ? `Sự kiện "${title.trim()}" ${atStart ? 'đã bắt đầu' : 'đã kết thúc'}`
          : `Công việc "${title.trim()}" ${atStart ? 'đã bắt đầu' : 'đã kết thúc'}`;

        if (isAfter(baseDate, now)) {
          triggers.push({ date: baseDate, body: displayBody, title: 'Nhắc lịch' });
        }
      } else {
        // Nhắc TRƯỚC
        const amount = parseInt(rule.amount) || 0;
        const actionText = (rule.timing === 'Trước khi bắt đầu') ? 'sắp bắt đầu' : 'sắp kết thúc';
        
        let startDate: Date;
        switch (rule.unit) {
          case 'Phút': startDate = subMinutes(baseDate, amount); break;
          case 'Giờ': startDate = subHours(baseDate, amount); break;
          case 'Ngày': startDate = subDays(baseDate, amount); break;
          case 'Tuần': startDate = subWeeks(baseDate, amount); break;
          case 'Tháng': startDate = subMonths(baseDate, amount); break;
          default: startDate = subDays(baseDate, amount);
        }

        // Logic lặp
        if (rule.frequency === 'none' || !rule.frequency) {
          // Nhắc 1 lần duy nhất tại startDate
          if (rule.unit === 'Ngày' || rule.unit === 'Tuần' || rule.unit === 'Tháng') {
             // Nếu là đơn vị lớn, cho phép dùng timeSlots
             if (rule.timeSlots && rule.timeSlots.length > 0) {
                rule.timeSlots.forEach(slot => {
                  const [h, m] = slot.split(':').map(Number);
                  const d = new Date(startDate);
                  d.setHours(h, m, 0, 0);
                  if (isAfter(d, now)) {
                     triggers.push({ date: d, body: getBodyText(title, actionText, baseDate, isEvent), title: 'Nhắc lịch' });
                  }
                });
             } else {
                if (isAfter(startDate, now)) {
                  triggers.push({ date: startDate, body: getBodyText(title, actionText, baseDate, isEvent), title: 'Nhắc lịch' });
                }
             }
          } else {
            if (isAfter(startDate, now)) {
              triggers.push({ date: startDate, body: getBodyText(title, actionText, baseDate, isEvent), title: 'Nhắc lịch' });
            }
          }
        } else {
          // Logic lặp : Hàng ngày, Hàng tuần, Hàng tháng
          // Khoảng thời gian từ max(now, startDate) đến baseDate
          let current = isAfter(startDate, now) ? startOfDay(startDate) : startOfDay(now);
          const endLimit = baseDate;
          let count = 0;
          const MAX_TRIGGERS = 50;

          while (isAfter(endLimit, current) && count < MAX_TRIGGERS) {
            let match = false;
            if (rule.frequency === 'daily') match = true;
            else if (rule.frequency === 'weekly') {
              const dow = VI_WEEKDAYS_MAP[getDay(current)];
              if (rule.repeatWeekDays?.includes(dow)) match = true;
            } else if (rule.frequency === 'monthly') {
              const dom = getDate(current);
              if (rule.repeatMonthDays?.includes(dom)) match = true;
            }

            if (match && rule.timeSlots) {
              rule.timeSlots.forEach(slot => {
                if (count >= MAX_TRIGGERS) return;
                const [h, m] = slot.split(':').map(Number);
                const triggerDate = new Date(current);
                triggerDate.setHours(h, m, 0, 0);
                
                // Chỉ thêm nếu triggerDate nằm trong khoảng [startDate, baseDate] và là tương lai
                if (isAfter(triggerDate, now) && !isAfter(triggerDate, endLimit) && isAfter(triggerDate, startDate)) {
                  triggers.push({ 
                    date: triggerDate, 
                    body: getBodyText(title, actionText, baseDate, isEvent), 
                    title: 'Nhắc lịch' 
                  });
                  count++;
                }
              });
            }
            current = addDays(current, 1);
          }
        }
      }
    });
  } catch (e) {
    console.error('Error generating triggers:', e);
  }

  return triggers;
};

const getBodyText = (title: string, actionText: string, baseDate: Date, isEvent: boolean): string => {
  const timeStr = format(baseDate, 'HH:mm dd/MM/yyyy');
  const typeText = isEvent ? 'Sự kiện' : 'Công việc';
  return `${typeText} "${title.trim()}" ${actionText} vào lúc ${timeStr}`;
};

export interface PriorityInfo {
  label: string;
  color: string;
  bgColor: string;
}

export const getPriorityInfo = (priority: string): PriorityInfo => {
  switch (priority) {
    case 'high':
      return { label: 'Ưu tiên cao', color: '#C62828', bgColor: '#FEE2E2' };
    case 'medium':
      return { label: 'Ưu tiên trung bình', color: '#B8860B', bgColor: '#FEF3C7' };
    case 'low':
      return { label: 'Ưu tiên thấp', color: '#2E7D32', bgColor: '#DCFCE7' };
    default:
      return { label: 'Ưu tiên trung bình', color: '#B8860B', bgColor: '#FEF3C7' };
  }
};

