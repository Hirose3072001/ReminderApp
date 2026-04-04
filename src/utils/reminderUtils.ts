import { format } from 'date-fns';

export interface ReminderRule {
  timing: 'Khi bắt đầu' | 'Khi kết thúc' | 'Trước khi bắt đầu' | 'Trước khi kết thúc';
  amount: string;
  unit: 'Phút' | 'Giờ' | 'Ngày';
  timeSlots?: string[];
}

export interface TriggerTime {
  date: Date;
  body: string;
  title: string;
}

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
    const now = Date.now();

    // Chuẩn hóa thời gian về 00 giây và 000 mili giây để nhắc nhở chính xác
    startTime.setSeconds(0, 0);
    endTime.setSeconds(0, 0);

    rules.forEach(rule => {
      // baseDate là mốc thời gian gốc (ngày bắt đầu hoặc kết thúc)
      const baseDate = (rule.timing === 'Khi bắt đầu' || rule.timing === 'Trước khi bắt đầu')
        ? new Date(startTime)
        : new Date(endTime);

      if (rule.timing === 'Khi bắt đầu' || rule.timing === 'Khi kết thúc') {
        // Nhắc đúng lúc bắt đầu/kết thúc
        const atStart = rule.timing === 'Khi bắt đầu';
        const displayBody = isEvent
          ? `Sự kiện "${title.trim()}" ${atStart ? 'đã bắt đầu' : 'đã kết thúc'}`
          : `Công việc "${title.trim()}" ${atStart ? 'đã bắt đầu' : 'đã kết thúc'}`;

        if (baseDate.getTime() > now) {
          triggers.push({ date: baseDate, body: displayBody, title: 'Nhắc lịch' });
        }
      } else {
        // Nhắc TRƯỚC khi bắt đầu/kết thúc
        const daysAmount = parseInt(rule.amount) || 0;
        const beforeStart = rule.timing === 'Trước khi bắt đầu';
        const actionText = beforeStart ? 'sắp bắt đầu' : 'sắp kết thúc';

        if (rule.unit === 'Ngày' && rule.timeSlots && rule.timeSlots.length > 0) {
          // Lặp qua từng ngày: i=daysAmount là N ngày trước, i=0 là đúng ngày hạn
          for (let i = daysAmount; i >= 0; i--) {
            // Lấy ngày đích bằng cách trừ i ngày từ baseDate
            const targetDayMs = baseDate.getTime() - (i * 86400000);
            const targetDateNormalized = new Date(targetDayMs);
            targetDateNormalized.setHours(0, 0, 0, 0);

            rule.timeSlots.forEach(timeStr => {
              const [hrs, mins] = timeStr.split(':').map(Number);
              const slotDate = new Date(targetDateNormalized);
              slotDate.setHours(hrs, mins, 0, 0);

              // Chỉ thêm nếu thời điểm nhắc nhở trong tương lai (với buffer 5 giây)
              if (slotDate.getTime() > now + 5000) {
                const daysLeft = i;
                let displayBody: string;

                if (daysLeft === 0) {
                  const timeStr2 = format(baseDate, 'HH:mm dd/MM/yyyy');
                  displayBody = isEvent
                    ? `Sự kiện "${title.trim()}" ${actionText} vào lúc ${timeStr2}`
                    : `Công việc "${title.trim()}" ${actionText} vào lúc ${timeStr2}. Thực hiện ngay!`;
                } else {
                  displayBody = isEvent
                    ? `Sự kiện "${title.trim()}" ${actionText} sau ${daysLeft} ngày nữa`
                    : `Công việc "${title.trim()}" ${actionText} sau ${daysLeft} ngày nữa. Đừng trễ!`;
                }

                triggers.push({
                  date: slotDate,
                  body: displayBody,
                  title: 'Nhắc lịch',
                });
              }
            });
          }
        } else if (rule.unit === 'Giờ' || rule.unit === 'Phút') {
          // Nhắc X giờ/phút trước
          const multiplier = rule.unit === 'Phút' ? 60000 : 3600000;
          const triggerDate = new Date(baseDate.getTime() - (daysAmount * multiplier));
          triggerDate.setSeconds(0, 0); // Làm tròn giây

          if (triggerDate.getTime() > now + 5000) {
            const timeStr2 = format(baseDate, 'HH:mm dd/MM/yyyy');
            const displayBody = isEvent
              ? `Sự kiện "${title.trim()}" ${actionText} vào lúc ${timeStr2}`
              : `Công việc "${title.trim()}" ${actionText} vào lúc ${timeStr2}. Thực hiện ngay!`;

            triggers.push({
              date: triggerDate,
              body: displayBody,
              title: 'Nhắc lịch',
            });
          }
        }
      }
    });
  } catch (e) {
    console.error('Error generating triggers:', e);
  }

  return triggers;
};
