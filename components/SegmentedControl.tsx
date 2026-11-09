import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type SegmentedControlProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.segment,
              active ? styles.segmentActive : null,
              pressed && !active ? styles.segmentHover : null,
            ]}>
            <Text style={[styles.text, active ? styles.textActive : null]}>
              {labels?.[option] ?? option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segment: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 72,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentHover: {
    backgroundColor: colors.surface,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  textActive: {
    color: colors.accentText,
  },
});
