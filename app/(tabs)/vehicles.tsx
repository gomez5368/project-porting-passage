import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/constants/theme';
import { useCarData } from '@/context/CarDataContext';
import { AddVehicleModal } from '@/components/AddVehicleModal';
import { BackupCard } from '@/components/BackupCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatNumber } from '@/lib/fuelCalculations';
import type { Vehicle } from '@/types/fuel';

export default function VehiclesScreen() {
  const { vehicles, selectedVehicle, addVehicle, selectVehicle } = useCarData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAdd = (vehicle: Omit<Vehicle, 'id'>) => {
    addVehicle(vehicle);
    setIsModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Vozidlá" subtitle="Spravujte autá, ktorých spotrebu chcete sledovať." />

        <Pressable
          onPress={() => setIsModalOpen(true)}
          style={({ pressed }) => [
            styles.addButton,
            pressed ? styles.addButtonActive : null,
          ]}>
          <Plus size={18} color={colors.accentText} />
          <Text style={styles.addButtonText}>Pridať vozidlo</Text>
        </Pressable>

        {vehicles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Zatiaľ žiadne vozidlo. Pridajte prvé tlačidlom vyššie.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {vehicles.map((vehicle) => {
              const isActive = vehicle.id === selectedVehicle?.id;
              return (
                <Pressable
                  key={vehicle.id}
                  onPress={() => selectVehicle(vehicle.id)}
                  style={({ pressed }) => [
                    styles.card,
                    isActive ? styles.cardActive : null,
                    pressed && !isActive ? styles.cardHover : null,
                  ]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      {vehicle.brand} {vehicle.model}
                    </Text>
                    {isActive ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Aktívne</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Rok výroby</Text>
                      <Text style={styles.metaValue}>{vehicle.year}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Počiatočný stav</Text>
                      <Text style={styles.metaValue}>{formatNumber(vehicle.initialOdometer)} km</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <BackupCard />
      </ScrollView>

      <AddVehicleModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAdd} />
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.xs * 1.5,
  },
  addButtonActive: {
    backgroundColor: colors.accentPressed,
  },
  addButtonText: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  cardActive: {
    borderColor: colors.accent,
  },
  cardHover: {
    borderColor: colors.textMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    gap: 4,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
