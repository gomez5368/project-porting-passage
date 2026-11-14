import { useState } from 'react';
import { Cloud, LogOut } from 'lucide-react';
import { useAccount } from '@/context/AuthContext';
import { useCarData } from '@/context/CarDataContext';
import { Button } from '@/components/ui/button';
export function CloudAccountStatus() {
  const { user, signOut } = useAccount();
  const { cloudStatus, cloudError, retryCloud, reloadCloud, legacyData, transferLegacy, dismissLegacy } = useCarData();
  const [error, setError] = useState('');
  return <section className="mb-5 space-y-3 border-b border-border pb-4">
    <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{user?.email}</p><p role="status" className="flex items-center gap-2 text-sm text-secondary"><Cloud className="size-4" />{cloudStatus}</p></div>
      <Button variant="ghost" size="icon" title="Odhlásiť sa" aria-label="Odhlásiť sa" onClick={async () => { if (cloudStatus !== 'Uložené v cloude' && !window.confirm('Niektoré zmeny ešte nie sú uložené v cloude. Odhlásiť sa?')) return; try { await signOut(); } catch { setError('Odhlásenie sa nepodarilo.'); } }}><LogOut /></Button></div>
    {cloudError ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{cloudError}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={retryCloud}>Skúsiť znova</Button><Button variant="outline" size="sm" onClick={() => { if (window.confirm('Načítať údaje z cloudu? Neuložené zmeny budú nahradené. Najprv ich exportujte do JSON.')) reloadCloud(); }}>Načítať cloud</Button></div></div> : null}
    {legacyData ? <div className="space-y-3"><p className="text-sm">V tomto prehliadači sú pôvodné údaje: {legacyData.vehicles.length} áut, {legacyData.fillUps.length} tankovaní a {legacyData.costs.length} nákladov.</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { if (window.confirm('Preniesť pôvodnú históriu do tohto účtu? Pôvodná lokálna záloha zostane zachovaná.')) transferLegacy(); }}>Preniesť do môjho účtu</Button><Button variant="ghost" size="sm" onClick={dismissLegacy}>Teraz nie</Button></div></div> : null}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </section>;
}