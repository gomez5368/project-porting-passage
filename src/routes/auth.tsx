import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Fuel, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Prihlásenie – Spotreba auta' },
    { name: 'description', content: 'Prihláste sa do svojho súkromného účtu a obnovte autá aj históriu z cloudu.' },
    { property: 'og:title', content: 'Prihlásenie – Spotreba auta' },
    { property: 'og:description', content: 'Súkromný účet pre vaše autá, tankovania a údržbu.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AuthPage,
});
function AuthPage() {
  const { user, ready } = useAccount(); const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { if (ready && user) void navigate({ to: '/', replace: true }); }, [ready, user, navigate]);
  return <section className="mx-auto max-w-sm space-y-6 py-6">
    <div className="flex items-center gap-3"><Fuel className="size-10 text-primary" /><h1 className="text-2xl font-bold">Spotreba auta</h1></div>
    <h2 className="text-xl font-semibold">{mode === 'login' ? 'Prihlásenie' : mode === 'signup' ? 'Vytvoriť účet' : 'Obnoviť heslo'}</h2>
    <p className="text-sm text-muted-foreground">Vaše autá, tankovania a servis v súkromnom účte.</p>
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError(''); setMessage('');
      try {
        if (mode === 'forgot') {
          const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
          if (result.error) throw result.error;
          setMessage('Ak účet existuje, poslali sme vám odkaz na obnovenie hesla.');
        } else if (mode === 'signup') {
          const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
          if (result.error) throw result.error;
          setPassword(''); setMessage('Skontrolujte e-mail a potvrďte vytvorenie účtu. Potom sa prihláste.');
        } else {
          const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (result.error) throw result.error;
          await navigate({ to: '/', replace: true });
        }
      } catch (e) {
        const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
        setError(code === 'invalid_credentials' ? 'Nesprávny e-mail alebo heslo.' : code === 'email_not_confirmed' ? 'Najprv potvrďte e-mail cez doručený odkaz.' : 'Prihlásenie alebo odoslanie e-mailu zlyhalo. Skontrolujte údaje a skúste znova.');
      } finally { setBusy(false); }
    }}>
      <label className="block space-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><Mail className="size-4" />E-mail</span><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      {mode !== 'forgot' ? <label className="block space-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><LockKeyhole className="size-4" />Heslo</span><Input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={(e) => setPassword(e.target.value)} /></label> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-success">{message}</p> : null}
      <Button className="w-full" disabled={busy}>{busy ? 'Čakajte…' : mode === 'login' ? 'Prihlásiť sa' : mode === 'signup' ? 'Vytvoriť účet' : 'Poslať odkaz'}</Button>
    </form>
    <div className="flex flex-wrap justify-between gap-2">
      <Button variant="link" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setMessage(''); }}>{mode === 'signup' ? 'Mám účet' : 'Vytvoriť účet'}</Button>
      <Button variant="link" onClick={() => { setMode(mode === 'forgot' ? 'login' : 'forgot'); setError(''); setMessage(''); }}>{mode === 'forgot' ? 'Späť na prihlásenie' : 'Zabudnuté heslo'}</Button>
    </div>
  </section>;
}