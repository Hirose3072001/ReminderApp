import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isFirstTime: boolean;
  isAuthenticated: boolean;
  setSession: (session: Session | null) => void;
  setFirstTime: (value: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isFirstTime: true,
      isAuthenticated: false,
      setSession: (session) => set({ 
        session, 
        user: session?.user ?? null,
        isAuthenticated: !!session 
      }),
      setFirstTime: (value) => set({ isFirstTime: value }),
      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
