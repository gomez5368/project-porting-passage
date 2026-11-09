import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';
import { useCarData } from '@/context/CarDataContext';
import { EmptyVehicleState } from '@/components/EmptyVehicleState';
import { FillUpRow } from '@/components/FillUpRow';
import { ImportSpotrebaCard } from '@/components/ImportSpotrebaCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VehicleSwitcher } from '@/components/VehicleSwitcher';
import { buildConsumptionSegments, sortFillUps } from '@/lib/fuelCalculations';

export default function HistoryScreen() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle, deleteFillUp, addFillUps } = useCarData();

  const consumptionById = new Map(
    buildConsumptionSegments(selectedFillUps).map((s) => [s.fillUpId, s.consumption]),
  );
  const newestFirst = sortFillUps(selectedFillUps).reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="História"
          subtitle={
            selectedVehicle
              ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedFillUps.length} tankovaní`
              : 'Všetky zapísané tankovania'
          }
        />

        {selectedVehicle ? (
          <>
            <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />

            <ImportSpotrebaCard
              existingFillUps={selectedFillUps}
              onImport={(records) =>
                addFillUps(records.map((record) => ({ ...record, vehicleId: selectedVehicle.id })))
              }
            />

            {newestFirst.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Zatiaľ nemáte žiadne tankovanie. Zapíšte prvé na karte Tankovanie.</Text>
              </View>
            ) : (
              newestFirst.map((fillUp) => (
                <FillUpRow
                  key={fillUp.id}
                  fillUp={fillUp}
                  consumption={consumptionById.get(fillUp.id) ?? null}
                  onDelete={deleteFillUp}
                />
              ))
            )}
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
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
