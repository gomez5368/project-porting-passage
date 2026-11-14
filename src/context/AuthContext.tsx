import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const AuthContext = createContext<{ user: User | null; ready: boolean; signOut: () => Promise<void> }>({ user: null, ready: false, signOut: async () => {} });
export const useAccount = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data } = await supabase.auth.getUser();
      if (active) { setUser(data.user); setReady(true); }
    };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('spotreba-password-recovery', '1');
        setTimeout(() => { void router.navigate({ to: '/reset-password', replace: true }); }, 0);
      }
      if (!['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) return;
      if (event === 'SIGNED_OUT') { setUser(null); queryClient.clear(); }
      // Do not await an Auth call inside its state-change callback.
      setTimeout(() => { void refresh().then(() => { void router.invalidate(); if (event !== 'SIGNED_OUT') void queryClient.invalidateQueries(); }); }, 0);
    });
    void refresh();
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [queryClient, router]);
  const signOut = async () => {
    await queryClient.cancelQueries(); queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Odhlásenie sa nepodarilo.');
    setUser(null);
    await router.navigate({ to: '/auth', replace: true });
  };
  return <AuthContext.Provider value={{ user, ready, signOut }}>{children}</AuthContext.Provider>;
}