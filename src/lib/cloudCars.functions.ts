import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validateBackup } from '@/lib/jsonBackup';
import type { Json } from '@/integrations/supabase/types';

export const readCloudCars = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('car_account_data').select('state,revision').eq('user_id', context.userId).maybeSingle();
    if (error) throw new Error('Cloudové údaje sa nepodarilo načítať.');
    return data ? { state: validateBackup(data.state), revision: data.revision } : null;
  });

export const writeCloudCars = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { state: unknown; revision: number }) => {
    if (!Number.isInteger(input.revision) || input.revision < 0) throw new Error('Neplatná verzia.');
    return { state: validateBackup(input.state), revision: input.revision };
  })
  .handler(async ({ data, context }) => {
    const row = { user_id: context.userId, state: data.state as unknown as Json, revision: data.revision + 1, updated_at: new Date().toISOString() };
    const result = data.revision === 0
      ? await context.supabase.from('car_account_data').insert(row).select('revision').maybeSingle()
      : await context.supabase.from('car_account_data').update(row).eq('user_id', context.userId).eq('revision', data.revision).select('revision').maybeSingle();
    if (result.error?.code === '23505' || (!result.error && !result.data)) return { conflict: true as const };
    if (result.error) throw new Error('Zmeny sa nepodarilo uložiť do cloudu.');
    return { conflict: false as const, revision: result.data?.revision ?? row.revision };
  });