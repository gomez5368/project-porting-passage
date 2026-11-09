import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Upload } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { ImportSpotrebaModal } from '@/components/ImportSpotrebaModal';
import type { ImportedFillUp } from '@/lib/importSpotreba';
import type { FillUp } from '@/types/fuel';

type ImportSpotrebaCardProps = {
  existingFillUps: FillUp[];
  onImport: (records: ImportedFillUp[]) => void;
};

export function ImportSpotrebaCard({ existingFillUps, onImport }: ImportSpotrebaCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Upload size={18} color={colors.secondary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Import starých dát zo spotreba.sk</Text>
          <Text style={styles.text}>Skopírujte tabuľku tankovaní z webu a pridajte ju do histórie jedným krokom.</Text>
        </View>
      </View>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}>
        <Text style={styles.buttonText}>Importovať dáta</Text>
      </Pressable>

      <ImportSpotrebaModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        existingFillUps={existingFillUps}
        onImport={(records) => {
          onImport(records);
          setIsOpen(false);
        }}
      />
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
    gap: spacing.xs,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingVertical: spacing.xs * 1.5,
  },
  buttonPressed: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  buttonText: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '700',
  },
});
