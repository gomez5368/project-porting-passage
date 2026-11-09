import { StyleSheet, Text, View } from 'react-native';
import { Car } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, radius, spacing } from '@/constants/theme';
import { PrimaryButton } from '@/components/PrimaryButton';

export function EmptyVehicleState() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Car size={32} color={colors.accent} strokeWidth={2} />
      </View>
      <Text style={styles.title}>Zatiaľ nemáte žiadne vozidlo</Text>
      <Text style={styles.text}>Pridajte svoje auto a začnite sledovať spotrebu a výdavky.</Text>
      <View style={styles.buttonWrapper}>
        <PrimaryButton title="Pridať vozidlo" onPress={() => router.push('/vehicles')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  text: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonWrapper: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
});
