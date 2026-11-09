import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { formatCurrency, formatDate, formatNumber } from '@/lib/fuelCalculations';
import type { FillUp } from '@/types/fuel';

type FillUpRowProps = {
  fillUp: FillUp;
  consumption: number | null;
  onDelete: (fillUpId: string) => void;
};

export function FillUpRow({ fillUp, consumption, onDelete }: FillUpRowProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.date}>{formatDate(fillUp.date)}</Text>
          <Text style={styles.odometer}>{formatNumber(fillUp.odometer)} km</Text>
        </View>
        <View style={styles.badges}>
          <View style={styles.fuelBadge}>
            <Text style={styles.fuelBadgeText}>{fillUp.fuelType}</Text>
          </View>
          {fillUp.isFullTank ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>Plná nádrž</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Meta label="Litre" value={`${formatNumber(fillUp.liters, 2)} l`} />
        <Meta label="Cena" value={formatCurrency(fillUp.totalCost)} />
        <Meta label="Cena za liter" value={formatCurrency(fillUp.pricePerLiter, 3)} />
        {fillUp.tankLevelPercent !== undefined ? (
          <Meta label="Nádrž" value={`${formatNumber(fillUp.tankLevelPercent)} %`} />
        ) : null}
        <Meta
          label="Spotreba"
          value={consumption !== null ? `${formatNumber(consumption, 1)} l/100 km` : '—'}
          highlight={consumption !== null}
        />
      </View>

      {confirming ? (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmText}>Naozaj chcete tento záznam vymazať?</Text>
          <View style={styles.confirmActions}>
            <Pressable
              onPress={() => setConfirming(false)}
              style={({ pressed }) => [styles.confirmButton, pressed ? styles.cancelHover : null]}>
              <Text style={styles.cancelText}>Zrušiť</Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(fillUp.id)}
              style={({ pressed }) => [styles.confirmButton, styles.deleteButton, pressed ? styles.deleteHover : null]}>
              <Text style={styles.deleteText}>Vymazať</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setConfirming(true)}
          style={({ pressed }) => [styles.removeButton, pressed ? styles.removeHover : null]}>
          <Trash2 size={16} color={colors.error} />
          <Text style={styles.removeText}>Vymazať záznam</Text>
        </Pressable>
      )}
    </View>
  );
}

function Meta({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, highlight ? styles.metaHighlight : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  headerText: {
    gap: 2,
  },
  date: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  odometer: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  fuelBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fuelBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  fullBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  fullBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    minWidth: 96,
    gap: 2,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  metaHighlight: {
    color: colors.accent,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: radius.md,
  },
  removeHover: {
    backgroundColor: colors.errorSoft,
  },
  removeText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmRow: {
    gap: spacing.xs,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.xs * 1.5,
  },
  confirmText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelHover: {
    backgroundColor: colors.surfaceElevated,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  deleteHover: {
    opacity: 0.85,
  },
  deleteText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});
