import { useCallback, useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { readCloudCars, writeCloudCars } from '@/lib/cloudCars.functions';
import { accountCacheKey, emptyCarState, parseAccountCache } from '@/lib/accountCache';
import { loadAppState } from '@/lib/storage';
import { validateBackup } from '@/lib/jsonBackup';
import type { AppState } from '@/types/fuel';

export function useCloudCars(userId: string | undefined) {
  const [state, setState] = useState<AppState>(emptyCarState);
  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState<string | undefined>();
  const [status, setStatus] = useState('Načítavam cloudové údaje…');
  const [error, setError] = useState('');
  const [legacy, setLegacy] = useState<AppState | null>(null);
  const [reload, setReload] = useState(0);
  const read = useServerFn(readCloudCars); const write = useServerFn(writeCloudCars);
  const revision = useRef(0); const latest = useRef(state); const saved = useRef(state);
  const running = useRef(false); const generation = useRef(0);
  const cache = useCallback((value: AppState, pending: boolean) => {
    if (!userId) return;
    try { localStorage.setItem(accountCacheKey(userId), JSON.stringify({ state: value, revision: revision.current, pending })); }
    catch { /* Cloud saving must still work when browser storage is full. */ }
  }, [userId]);

  useEffect(() => {
    const gen = ++generation.current;
    running.current = false; setReady(false); setOwner(undefined); setStatus('Načítavam cloudové údaje…'); setError(''); setLegacy(null); setState(emptyCarState());
    if (!userId) return;
    void (async () => {
      try {
        const remote = await read();
        if (gen !== generation.current) return;
        const cached = parseAccountCache(localStorage.getItem(accountCacheKey(userId)));
        revision.current = remote?.revision ?? 0;
        const value = cached?.pending && cached.revision === revision.current ? cached.state : remote?.state ?? emptyCarState();
        latest.current = value; saved.current = remote?.state ?? emptyCarState();
        setState(value); setOwner(userId); setReady(true); setStatus('Uložené v cloude');
        if (cached?.pending && cached.revision !== revision.current) {
          latest.current = cached.state; setState(cached.state);
          setError('Na inom zariadení sa údaje zmenili. Najprv exportujte neuložené údaje a potom načítajte cloud.');
        }
        try {
          const old = validateBackup(loadAppState());
          if (old.vehicles.length && !localStorage.getItem('spotreba-local-transferred-v1')) setLegacy(old);
        } catch { /* Invalid legacy data must not prevent reading a valid cloud account. */ }
      } catch { if (gen === generation.current) setError('Cloudové údaje sa nepodarilo načítať. Skontrolujte pripojenie a skúste znova.'); }
    })();
    return () => { generation.current++; };
  }, [userId, reload, read]);

  const flush = useCallback(async () => {
    if (!userId || owner !== userId || !ready || running.current || error) return;
    const gen = generation.current; running.current = true;
    try {
      while (saved.current !== latest.current && gen === generation.current) {
        const value = latest.current;
        cache(value, true); setStatus('Ukladám do cloudu…');
        const result = await write({ data: { state: value, revision: revision.current } });
        if (gen !== generation.current) return;
        if (result.conflict) throw new Error('Na inom zariadení sa údaje zmenili. Exportujte neuložené údaje a potom načítajte cloud.');
        revision.current = result.revision; saved.current = value;
        cache(latest.current, latest.current !== value);
      }
      if (gen === generation.current) setStatus('Uložené v cloude');
    } catch (e) { if (gen === generation.current) { cache(latest.current, true); setError(e instanceof Error ? e.message : 'Cloudové uloženie zlyhalo.'); setStatus('Neuložené zmeny'); } }
    finally { if (gen === generation.current) running.current = false; }
  }, [userId, owner, ready, error, cache, write]);
  useEffect(() => {
    if (!ready || owner !== userId) return;
    latest.current = state;
    if (state !== saved.current) { cache(state, true); if (!error) setStatus('Ukladám do cloudu…'); }
    const timeout = setTimeout(() => { void flush(); }, 400);
    return () => clearTimeout(timeout);
  }, [state, ready, owner, userId, error, cache, flush]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (ready && latest.current !== saved.current) { event.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [ready]);
  return { state, setState, ready: ready && owner === userId && !!userId, status, error, legacy,
    retry: () => { if (!ready) setReload((n) => n + 1); else setError(''); },
    reloadCloud: () => { if (userId) localStorage.removeItem(accountCacheKey(userId)); setReload((n) => n + 1); },
    transfer: () => {
      if (!legacy) return;
      // Only an empty cloud account can receive the complete legacy state.
      if (state.vehicles.length) { setError('Cloud už obsahuje údaje. Lokálnu históriu preneste cez JSON zálohu po kontrole.'); return; }
      setState(legacy); localStorage.setItem('spotreba-local-transferred-v1', '1'); setLegacy(null);
    },
    dismissLegacy: () => { setLegacy(null); localStorage.setItem('spotreba-local-transferred-v1', '1'); },
  };
}