import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

// On Web: We don't import SQLite and we use window.localStorage

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  job?: string;
  phone?: string;
  birthday?: string;
  sync_google_calendar?: boolean;
  sync_icloud_calendar?: boolean;
  sync_outlook_calendar?: boolean;
  sync_system_calendar?: boolean;
  push_notifications?: boolean;
  updated_at?: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isFirstTime: boolean;
  isAuthenticated: boolean;
  setSession: (session: Session | null) => void;
  setFirstTime: (value: boolean) => void;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isFirstTime: true,
  isAuthenticated: false,
  setSession: (session) => {
    set({ 
      session, 
      user: session?.user ?? null,
      isAuthenticated: !!session 
    });
    if (session) {
      get().fetchProfile();
    } else {
      set({ profile: null });
    }
  },
  setFirstTime: (value) => set({ isFirstTime: value }),
  fetchProfile: async () => {
    const user = get().user;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          })
          .select()
          .single();
        
        if (!createError) set({ profile: newProfile });
      } else if (!error) {
        set({ profile: data });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during signOut cleanup:', err);
    } finally {
      set({ session: null, user: null, profile: null, isAuthenticated: false });
    }
  },
  updateProfile: async (profileData) => {
    const user = get().user;
    if (!user) return { success: false, error: 'Phiên đăng nhập hết hạn' };

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (profileError) throw profileError;

      await supabase.auth.updateUser({
        data: { ...profileData }
      });
      
      set({ profile: data });
      return { success: true };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  },
}));
