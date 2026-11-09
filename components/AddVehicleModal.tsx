import { useState } from 'react';
import { FormField } from '@/components/FormField';
import { ModalSheet } from '@/components/ModalSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { parseDecimal } from '@/lib/parseDecimal';
import type { Vehicle } from '@/types/fuel';

type AddVehicleModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (vehicle: Omit<Vehicle, 'id'>) => void;
};

type FormErrors = Partial<Record<'brand' | 'model' | 'year' | 'initialOdometer', string>>;

export function AddVehicleModal({ visible, onClose, onSubmit }: AddVehicleModalProps) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [initialOdometer, setInitialOdometer] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const currentYear = new Date().getFullYear();

  const reset = () => {
    setBrand('');
    setModel('');
    setYear('');
    setInitialOdometer('');
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const yearValue = parseDecimal(year);
    const odometerValue = parseDecimal(initialOdometer);
    const nextErrors: FormErrors = {};

    if (!brand.trim()) nextErrors.brand = 'Zadajte značku vozidla.';
    if (!model.trim()) nextErrors.model = 'Zadajte model vozidla.';
    if (!Number.isInteger(yearValue) || yearValue < 1900 || yearValue > currentYear + 1) {
      nextErrors.year = `Zadajte platný rok (1900 - ${currentYear + 1}).`;
    }
    if (!Number.isFinite(odometerValue) || odometerValue < 0) {
      nextErrors.initialOdometer = 'Zadajte platný stav tachometra v km.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      brand: brand.trim(),
      model: model.trim(),
      year: yearValue,
      initialOdometer: Math.round(odometerValue),
    });
    reset();
  };

  return (
    <ModalSheet visible={visible} title="Nové vozidlo" onClose={handleClose}>
      <FormField label="Značka" value={brand} onChangeText={setBrand} placeholder="napr. Škoda" error={errors.brand} />
      <FormField label="Model" value={model} onChangeText={setModel} placeholder="napr. Octavia" error={errors.model} />
      <FormField
        label="Rok výroby"
        value={year}
        onChangeText={setYear}
        placeholder={String(currentYear)}
        keyboardType="numeric"
        error={errors.year}
      />
      <FormField
        label="Počiatočný stav tachometra"
        value={initialOdometer}
        onChangeText={setInitialOdometer}
        placeholder="napr. 125000"
        keyboardType="numeric"
        suffix="km"
        error={errors.initialOdometer}
      />
      <PrimaryButton title="Uložiť vozidlo" onPress={handleSubmit} />
    </ModalSheet>
  );
}
