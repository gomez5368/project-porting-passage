import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';
import { useCarData } from '@/context/CarDataContext';
import { EmptyVehicleState } from '@/components/EmptyVehicleState';
import { FillUpForm } from '@/components/FillUpForm';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VehicleSwitcher } from '@/components/VehicleSwitcher';
import { getLatestOdometer } from '@/lib/fuelCalculations';

export default function RefuelScreen() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle, addFillUps } = useCarData();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Nové tankovanie"
          subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Zapíšte nové tankovanie'}
        />

        {selectedVehicle ? (
          <>
            <VehicleSwitcher
              vehicles={vehicles}
              selectedId={selectedVehicle.id}
              onSelect={selectVehicle}
            />
            <FillUpForm
              key={selectedVehicle.id}
              latestOdometer={getLatestOdometer(selectedVehicle, selectedFillUps)}
              onSubmit={(input) => addFillUps([{ ...input, vehicleId: selectedVehicle.id }])}
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
});
