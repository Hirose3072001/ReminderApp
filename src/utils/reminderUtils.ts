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

    rules.forEach(rule => {
      const baseDate = (rule.timing === 'Khi bắt đầu' || rule.timing === 'Trước khi bắt đầu') ? new Date(startTime) : new Date(endTime);

      if (rule.timing === 'Khi bắt đầu' || rule.timing === 'Khi kết thúc') {
        const atStart = rule.timing === 'Khi bắt đầu';
        let displayTitle = 'Nhắc lịch';
        let displayBody = isEvent 
           ? `Sự kiện "${title.trim()}" ${atStart ? 'đã bắt đầu' : 'đã kết thúc'}`
           : `Công việc "${title.trim()}" ${atStart ? 'đã bắt đầu' : 'đã kết thúc'}`;
        
        triggers.push({ date: baseDate, body: displayBody, title: displayTitle });
      } else {
        const amount = parseInt(rule.amount) || 0;
        const multiplier = rule.unit === 'Phút' ? 60000 : rule.unit === 'Giờ' ? 3600000 : 86400000;
        const beforeStart = rule.timing === 'Trước khi bắt đầu';

        let displayTitle = 'Nhắc lịch';
        let actionText = beforeStart ? 'sắp diễn ra' : 'đang diễn ra';

        const templateBody = (date: Date) => {
          if (isEvent) {
             return `Sự kiện "${title.trim()}" ${actionText}`;
          } else {
             const timeStr = format(date, 'HH:mm');
             return `Công việc "${title.trim()}" ${beforeStart ? `sẽ bắt đầu vào lúc ${timeStr}` : `sẽ kết thúc vào lúc ${timeStr}`} chưa được hoàn thành`;
          }
        };

        if (rule.unit === 'Ngày' && rule.timeSlots && rule.timeSlots.length > 0) {
          for (let i = 0; i <= amount; i++) {
            const targetDate = new Date(baseDate.getTime() - (i * 86400000));
            rule.timeSlots.forEach(timeStr => {
              const [hrs, mins] = timeStr.split(':').map(Number);
              const slotDate = new Date(targetDate);
              slotDate.setHours(hrs, mins, 0, 0);
              
              triggers.push({ 
                date: slotDate, 
                body: templateBody(beforeStart ? startTime : endTime), 
                title: displayTitle 
              });
            });
          }
        } else {
          const triggerDate = new Date(baseDate.getTime() - (amount * multiplier));
          triggers.push({ 
            date: triggerDate, 
            body: templateBody(beforeStart ? startTime : endTime), 
            title: displayTitle 
          });
        }
      }
    });
  } catch (e) {
    console.error('Error generating triggers:', e);
  }

  return triggers;
};
