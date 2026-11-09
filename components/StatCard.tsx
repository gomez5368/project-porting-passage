import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  accentColor?: string;
};

export function StatCard({ label, value, unit, accentColor = colors.accent }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.indicator, { backgroundColor: accentColor }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexWrap: 'wrap',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  unit: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
