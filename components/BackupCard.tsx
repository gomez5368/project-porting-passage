import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Download, Upload } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { useCarData } from '@/context/CarDataContext';
import { getBackupErrorMessage, parseJsonBackup, serializeJsonBackup } from '@/lib/jsonBackup';
import type { AppState } from '@/types/fuel';

function downloadBackup(text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `spotreba-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function pickBackupFile(onPick: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) onPick(file);
  };
  input.click();
}

export function BackupCard() {
  const { vehicles, fillUps, selectedVehicleId, replaceAppState } = useCarData();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState<AppState | null>(null);

  const isWeb = Platform.OS === 'web';

  const handleExport = () => {
    setError(null);
    setMessage(null);
    try {
      downloadBackup(serializeJsonBackup({ vehicles, fillUps, selectedVehicleId }));
      setMessage('Záloha bola stiahnutá.');
    } catch (caught) {
      setError(getBackupErrorMessage(caught));
    }
  };

  const handlePick = () => {
    setError(null);
    setMessage(null);
    setPendingState(null);
    pickBackupFile(async (file) => {
      try {
        setPendingState(parseJsonBackup(await file.text()));
      } catch (caught) {
        setError(getBackupErrorMessage(caught));
      }
    });
  };

  const handleConfirmRestore = () => {
    if (!pendingState) return;
    replaceAppState(pendingState);
    setMessage(`Dáta boli obnovené: ${pendingState.vehicles.length} vozidiel, ${pendingState.fillUps.length} tankovaní.`);
    setPendingState(null);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Download size={18} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Záloha dát</Text>
          <Text style={styles.text}>Uložte si všetky vozidlá a tankovania do súboru alebo ich obnovte z predtým uloženej zálohy.</Text>
        </View>
      </View>

      {isWeb ? (
        <View style={styles.actions}>
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [styles.button, styles.primaryButton, pressed ? styles.primaryButtonPressed : null]}>
            <Download size={16} color={colors.accentText} />
            <Text style={styles.primaryButtonText}>Exportovať zálohu</Text>
          </Pressable>
          <Pressable
            onPress={handlePick}
            style={({ pressed }) => [styles.button, styles.secondaryButton, pressed ? styles.secondaryButtonPressed : null]}>
            <Upload size={16} color={colors.secondary} />
            <Text style={styles.secondaryButtonText}>Obnoviť zo zálohy</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.text}>Export a obnovenie zálohy sú dostupné v prehliadači na počítači.</Text>
      )}

      {pendingState ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            Obnovenie nahradí všetky aktuálne dáta v aplikácii. Naozaj pokračovať?
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={handleConfirmRestore}
              style={({ pressed }) => [styles.button, styles.dangerButton, pressed ? styles.dangerButtonPressed : null]}>
              <Text style={styles.dangerButtonText}>Nahradiť dáta</Text>
            </Pressable>
            <Pressable
              onPress={() => setPendingState(null)}
              style={({ pressed }) => [styles.button, styles.ghostButton, pressed ? styles.ghostButtonPressed : null]}>
              <Text style={styles.ghostButtonText}>Zrušiť</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}
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
    backgroundColor: colors.accentSoft,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.xs * 1.25,
    paddingHorizontal: spacing.sm,
    flexGrow: 1,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  primaryButtonText: {
    color: colors.accentText,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderColor: colors.secondary,
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  secondaryButtonText: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBox: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  confirmText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  dangerButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  dangerButtonPressed: {
    opacity: 0.85,
  },
  dangerButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  ghostButton: {
    borderColor: colors.border,
  },
  ghostButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  ghostButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
});
