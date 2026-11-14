import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareVehiclePhoto } from '@/lib/vehiclePhoto';

export function VehiclePhotoField({ value, onChange, onBusyChange }: {
  value: string | undefined; onChange: (photo: string | undefined) => void; onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { request.current += 1; }, []);
  async function choose(file: File) {
    const current = ++request.current;
    setBusy(true); onBusyChange(true); setError('');
    try {
      const photo = await prepareVehiclePhoto(file);
      if (current === request.current) onChange(photo);
    } catch (err) {
      if (current === request.current) setError(err instanceof Error ? err.message : 'Fotku sa nepodarilo načítať.');
    } finally {
      if (current === request.current) { setBusy(false); onBusyChange(false); }
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">Fotka auta</p>
      {value ? <img src={value} alt="Fotka auta – náhľad" className="max-h-52 w-full rounded-lg bg-muted object-contain" /> : null}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Vybrať fotku auta" className="hidden"
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void choose(file); }} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Camera />}{busy ? 'Spracúvam fotku…' : value ? 'Zmeniť fotku' : 'Pridať fotku'}
        </Button>
        {value ? <Button type="button" variant="ghost" disabled={busy} onClick={() => { onChange(undefined); setError(''); }}><Trash2 /> Odstrániť fotku</Button> : null}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}