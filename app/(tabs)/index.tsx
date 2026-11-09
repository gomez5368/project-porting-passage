import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';
import { useCarData } from '@/context/CarDataContext';
import { EmptyVehicleState } from '@/components/EmptyVehicleState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import { TrendChart, type TrendPoint } from '@/components/TrendChart';
import { VehicleSwitcher } from '@/components/VehicleSwitcher';
import {
  formatNumber,
  formatShortDate,
  sortFillUps,
  summarizeVehicle,
} from '@/lib/fuelCalculations';

export default function OverviewScreen() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle } = useCarData();

  const summary = selectedVehicle ? summarizeVehicle(selectedVehicle, selectedFillUps) : null;

  const consumptionPoints: TrendPoint[] =
    summary?.segments.map((s) => ({ label: formatShortDate(s.date), value: s.consumption })) ?? [];

  const pricePoints: TrendPoint[] = sortFillUps(selectedFillUps).map((f) => ({
    label: formatShortDate(f.date),
    value: f.pricePerLiter,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Prehľad"
          subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Štatistiky vášho auta'}
        />

        {selectedVehicle && summary ? (
          <>
            <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />

            <View style={styles.statsGrid}>
              <StatCard
                label="Priemerná spotreba"
                value={summary.averageConsumption !== null ? formatNumber(summary.averageConsumption, 1) : '—'}
                unit="l/100 km"
                accentColor={colors.accent}
              />
              <StatCard
                label="Náklady na palivo"
                value={formatNumber(summary.totalCost, 2)}
                unit="€"
                accentColor={colors.secondary}
              />
              <StatCard
                label="Cena za 1 km"
                value={summary.costPerKm !== null ? formatNumber(summary.costPerKm, 3) : '—'}
                unit="€/km"
                accentColor={colors.warning}
              />
              <StatCard
                label="Najazdené km"
                value={formatNumber(summary.totalKm)}
                unit="km"
                accentColor={colors.success}
              />
            </View>

            {summary.averageConsumption === null ? (
              <Text style={styles.note}>
                Priemerná spotreba sa zobrazí po dvoch tankovaniach do plnej nádrže.
              </Text>
            ) : null}

            <TrendChart
              title="Vývoj spotreby"
              points={consumptionPoints}
              color={colors.accent}
              formatValue={(v) => `${formatNumber(v, 1)} l/100 km`}
              emptyText="Graf spotreby sa zobrazí po dvoch tankovaniach do plnej nádrže."
            />
            <TrendChart
              title="Vývoj ceny paliva"
              points={pricePoints}
              color={colors.secondary}
              formatValue={(v) => `${formatNumber(v, 3)} €/l`}
              emptyText="Zatiaľ žiadne tankovania. Graf ceny sa zobrazí po prvom tankovaní."
            />
          </>
        ) : (
          <EmptyVehicleState />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
