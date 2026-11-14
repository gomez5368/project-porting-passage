import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { CloudAccountStatus } from '@/components/app/CloudAccountStatus';
import { useCarData } from '@/context/CarDataContext';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: '/auth', replace: true });
  },
  component: PrivatePages,
});
function PrivatePages() {
  const { isReady } = useCarData();
  return <><CloudAccountStatus />{isReady ? <Outlet /> : <p className="py-8 text-center text-sm text-muted-foreground">Načítavam súkromné údaje…</p>}</>;
}