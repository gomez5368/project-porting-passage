import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { formatCurrency, formatNumber } from '@/lib/fuelCalculations';
import { parseDecimal } from '@/lib/parseDecimal';
import { FUEL_TYPES, type FillUp, type FuelType } from '@/types/fuel';

type PriceMode = 'total' | 'perLiter';

type FillUpInput = Omit<FillUp, 'id' | 'vehicleId'>;

type FillUpFormProps = {
  latestOdometer: number;
  onSubmit: (input: FillUpInput) => void;
};

type FormErrors = Partial<Record<'date' | 'odometer' | 'liters' | 'price' | 'tankLevel', string>>;

const PRICE_MODE_LABELS: Record<PriceMode, string> = {
  total: 'Celková cena',
  perLiter: 'Cena za liter',
};

const FULL_TANK_OPTIONS = ['yes', 'no'] as const;
type FullTankOption = (typeof FULL_TANK_OPTIONS)[number];

const FULL_TANK_LABELS: Record<FullTankOption, string> = {
  yes: 'Áno',
  no: 'Nie',
};

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function FillUpForm({ latestOdometer, onSubmit }: FillUpFormProps) {
  const [date, setDate] = useState(todayIso);
  const [odometer, setOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [priceMode, setPriceMode] = useState<PriceMode>('total');
  const [priceValue, setPriceValue] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('Benzín');
  const [isFullTank, setIsFullTank] = useState<FullTankOption>('yes');
  const [tankLevel, setTankLevel] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const litersValue = parseDecimal(liters);
  const priceInput = parseDecimal(priceValue);
  const hasValidLiters = Number.isFinite(litersValue) && litersValue > 0;
  const hasValidPrice = Number.isFinite(priceInput) && priceInput > 0;
  const tankLevelValue = parseDecimal(tankLevel);
  const hasTankLevel = tankLevel.trim() !== '';

  const derivedTotal =
    hasValidLiters && hasValidPrice
      ? priceMode === 'total'
        ? priceInput
        : priceInput * litersValue
      : null;
  const derivedPerLiter =
    hasValidLiters && hasValidPrice
      ? priceMode === 'perLiter'
        ? priceInput
        : priceInput / litersValue
      : null;

  const handleSubmit = () => {
    const odometerValue = parseDecimal(odometer);
    const nextErrors: FormErrors = {};

    if (!isValidIsoDate(date)) nextErrors.date = 'Zadajte dátum vo formáte RRRR-MM-DD.';
    if (!Number.isInteger(odometerValue) || odometerValue < 0) {
      nextErrors.odometer = 'Zadajte celé číslo v km.';
    } else if (odometerValue < latestOdometer) {
      nextErrors.odometer = `Stav tachometra nesmie byť nižší ako ${formatNumber(latestOdometer)} km.`;
    }
    if (!hasValidLiters) nextErrors.liters = 'Zadajte množstvo litrov väčšie ako 0.';
    if (!hasValidPrice) {
      nextErrors.price = priceMode === 'total' ? 'Zadajte celkovú cenu väčšiu ako 0.' : 'Zadajte cenu za liter väčšiu ako 0.';
    }
    if (hasTankLevel && (!Number.isFinite(tankLevelValue) || tankLevelValue < 0 || tankLevelValue > 100)) {
      nextErrors.tankLevel = 'Zadajte percentá od 0 do 100.';
    }

    setErrors(nextErrors);
    setSavedMessage(null);
    if (Object.keys(nextErrors).length > 0 || derivedTotal === null || derivedPerLiter === null) return;

    onSubmit({
      date,
      odometer: odometerValue,
      liters: litersValue,
      totalCost: Math.round(derivedTotal * 100) / 100,
      pricePerLiter: Math.round(derivedPerLiter * 1000) / 1000,
      fuelType,
      isFullTank: isFullTank === 'yes',
      tankLevelPercent: hasTankLevel ? tankLevelValue : undefined,
    });

    setOdometer('');
    setLiters('');
    setPriceValue('');
    setTankLevel('');
    setSavedMessage('Tankovanie bolo uložené.');
  };

  return (
    <View style={styles.container}>
      <FormField
        label="Dátum tankovania"
        value={date}
        onChangeText={setDate}
        placeholder="RRRR-MM-DD"
        error={errors.date}
      />
      <FormField
        label="Aktuálny stav tachometra"
        value={odometer}
        onChangeText={setOdometer}
        placeholder={`napr. ${formatNumber(latestOdometer + 1)}`}
        keyboardType="numeric"
        suffix="km"
        error={errors.odometer}
        hint={`Posledný zapísaný stav: ${formatNumber(latestOdometer)} km`}
      />
      <FormField
        label="Natankované litre"
        value={liters}
        onChangeText={setLiters}
        placeholder="napr. 45,5"
        keyboardType="decimal-pad"
        suffix="l"
        error={errors.liters}
      />

      <View style={styles.group}>
        <Text style={styles.label}>Zadajte</Text>
        <SegmentedControl options={['total', 'perLiter'] as const} value={priceMode} onChange={setPriceMode} labels={PRICE_MODE_LABELS} />
        <FormField
          label={priceMode === 'total' ? 'Celková cena' : 'Cena za liter'}
          value={priceValue}
          onChangeText={setPriceValue}
          placeholder={priceMode === 'total' ? 'napr. 72,90' : 'napr. 1,599'}
          keyboardType="decimal-pad"
          suffix="€"
          error={errors.price}
          hint={
            derivedTotal !== null && derivedPerLiter !== null
              ? priceMode === 'total'
                ? `Cena za liter: ${formatCurrency(derivedPerLiter, 3)}`
                : `Celková cena: ${formatCurrency(derivedTotal)}`
              : undefined
          }
        />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Typ paliva</Text>
        <SegmentedControl options={FUEL_TYPES} value={fuelType} onChange={setFuelType} />
      </View>

      <FormField
        label="Stav naplnenia nádrže po tankovaní"
        value={tankLevel}
        onChangeText={setTankLevel}
        placeholder="napr. 100"
        keyboardType="decimal-pad"
        suffix="%"
        error={errors.tankLevel}
        hint="Nepovinné. Pomôže sledovať, koľko paliva bolo v nádrži."
      />

      <View style={styles.group}>
        <Text style={styles.label}>Natankované do plnej nádrže?</Text>
        <SegmentedControl options={FULL_TANK_OPTIONS} value={isFullTank} onChange={setIsFullTank} labels={FULL_TANK_LABELS} />
        <Text style={styles.hint}>
          Spotreba sa počíta len medzi dvoma tankovaniami do plnej nádrže.
        </Text>
      </View>

      {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}

      <PrimaryButton title="Uložiť tankovanie" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  group: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  success: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
});
