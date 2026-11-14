import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [
    { title: 'Nové heslo – Spotreba auta' }, { name: 'description', content: 'Bezpečné obnovenie hesla k súkromnej histórii vozidiel.' },
    { property: 'og:title', content: 'Nové heslo – Spotreba auta' }, { property: 'og:description', content: 'Obnovte prístup k svojmu účtu.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const [valid, setValid] = useState(false); const [password, setPassword] = useState('');
  const [again, setAgain] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    if (recovery) sessionStorage.setItem('spotreba-password-recovery', '1');
    void supabase.auth.getUser().then(({ data }) => setValid(!!data.user && (recovery || sessionStorage.getItem('spotreba-password-recovery') === '1')));
  }, []);
  return <section className="mx-auto max-w-sm space-y-5 py-6"><h1 className="text-2xl font-bold">Nové heslo</h1>
    {valid ? <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); if (password !== again) { setError('Heslá sa nezhodujú.'); return; }
      setBusy(true); setError('');
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (error) { setError('Heslo sa nepodarilo zmeniť. Skúste nový odkaz na obnovenie.'); return; }
      sessionStorage.removeItem('spotreba-password-recovery'); await navigate({ to: '/', replace: true });
    }}>
      <label className="block space-y-2 text-sm font-semibold">Nové heslo<Input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label className="block space-y-2 text-sm font-semibold">Zopakovať heslo<Input type="password" autoComplete="new-password" minLength={8} required value={again} onChange={(e) => setAgain(e.target.value)} /></label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<Button disabled={busy} className="w-full">Uložiť nové heslo</Button>
    </form> : <><p className="text-sm text-muted-foreground">Otvorte platný odkaz na obnovenie z e-mailu.</p><Button onClick={() => void navigate({ to: '/auth' })}>Späť na prihlásenie</Button></>}
  </section>;
}