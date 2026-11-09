import { ScrollView, StyleSheet, Pressable, Text } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import type { Vehicle } from '@/types/fuel';

type VehicleSwitcherProps = {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (vehicleId: string) => void;
};

export function VehicleSwitcher({ vehicles, selectedId, onSelect }: VehicleSwitcherProps) {
  if (vehicles.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {vehicles.map((vehicle) => {
        const active = vehicle.id === selectedId;
        return (
          <Pressable
            key={vehicle.id}
            onPress={() => onSelect(vehicle.id)}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : null,
              pressed && !active ? styles.chipHover : null,
            ]}>
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
              {vehicle.brand} {vehicle.model}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipHover: {
    borderColor: colors.textMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accent,
  },
});
