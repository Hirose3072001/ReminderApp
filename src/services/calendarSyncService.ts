import { supabase } from './supabase';
import { toLocalISOString } from '../utils/reminderUtils';
import { Reminder, upsertReminder } from '../database/queries';

export const syncGoogleCalendar = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.provider_token) {
      console.log('No Google session found for sync');
      return { success: false, error: 'No active session or missing provider token' };
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
      toLocalISOString(new Date()),
      {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
        },
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Google Calendar API Error:', data.error);
      return { success: false, error: data.error.message };
    }

    const events = data.items || [];
    
    for (const event of events) {
      if (event.status === 'cancelled') continue;

      const reminder: Reminder = {
        id: event.id,
        type: 'event',
        title: event.summary || '(Không có tiêu đề)',
        description: event.description || '',
        priority: 'medium',
        dueDate: event.start?.dateTime || event.start?.date || toLocalISOString(new Date()),
        endTime: event.end?.dateTime || event.end?.date || null,
        completed: 0,
        reminderTime: event.start?.dateTime || event.start?.date || null,
        reminderRepeat: 'none',
        notificationId: null,
        reminderRules: null,
        createdAt: event.created || toLocalISOString(new Date()),
        updatedAt: event.updated || toLocalISOString(new Date()),
      };

      upsertReminder(reminder);
    }

    return { success: true, count: events.length };
  } catch (error: any) {
    console.error('Sync Error:', error);
    return { success: false, error: error.message };
  }
};
