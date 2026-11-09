import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs / 2,
    paddingTop: spacing.xs * 2,
    paddingBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
