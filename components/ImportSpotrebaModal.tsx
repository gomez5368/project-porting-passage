import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { ModalSheet } from '@/components/ModalSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  fillUpKey,
  parseSpotrebaImport,
  type ImportedFillUp,
  type ImportResult,
} from '@/lib/importSpotreba';
import { formatCurrency, formatDate, formatNumber } from '@/lib/fuelCalculations';
import type { FillUp } from '@/types/fuel';

type ImportSpotrebaModalProps = {
  visible: boolean;
  onClose: () => void;
  existingFillUps: FillUp[];
  onImport: (records: ImportedFillUp[]) => void;
};

export function ImportSpotrebaModal({ visible, onClose, existingFillUps, onImport }: ImportSpotrebaModalProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const existingKeys = useMemo(() => new Set(existingFillUps.map(fillUpKey)), [existingFillUps]);

  const newRecords = result?.records.filter((r) => !existingKeys.has(fillUpKey(r))) ?? [];
  const duplicateCount = (result?.records.length ?? 0) - newRecords.length;

  const handleTextChange = (value: string) => {
    setText(value);
    setResult(null);
    setAnalysisError(null);
  };

  const handleAnalyze = () => {
    const parsed = parseSpotrebaImport(text);
    setResult(parsed);
    setAnalysisError(
      parsed.records.length === 0 && parsed.issues.length === 0
        ? 'V texte sme nenašli žiadne údaje o tankovaní. Skontrolujte, či ste skopírovali celú tabuľku.'
        : null,
    );
  };

  const handleSave = () => {
    onImport(newRecords);
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setResult(null);
    setAnalysisError(null);
    onClose();
  };

  return (
    <ModalSheet visible={visible} title="Import starých dát zo spotreba.sk" onClose={handleClose}>
      <Text style={styles.instructions}>
        Na webe spotreba.sk označte tabuľku s tankovaniami, skopírujte ju (Ctrl+C) a vložte sem (Ctrl+V).
      </Text>

      <TextInput
        value={text}
        onChangeText={handleTextChange}
        multiline
        placeholder={'Dátum\tStav tachometra\tLitre\tCena\n01.10.2025\t125 340\t45,20\t72,90'}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
        style={styles.textarea}
      />

      <PrimaryButton title="Analyzovať dáta" onPress={handleAnalyze} disabled={text.trim() === ''} />

      {analysisError ? <Text style={styles.error}>{analysisError}</Text> : null}

      {result && result.records.length > 0 ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            Rozpoznaných tankovaní: {result.records.length}
          </Text>
          <Text style={styles.summaryText}>
            Nových na import: {newRecords.length}
            {duplicateCount > 0 ? ` · duplicitných (preskočíme): ${duplicateCount}` : ''}
          </Text>
        </View>
      ) : null}

      {result && result.issues.length > 0 ? (
        <View style={styles.issues}>
          <Text style={styles.issuesTitle}>Riadky, ktoré sa nepodarilo načítať:</Text>
          {result.issues.map((issue) => (
            <Text key={issue.line} style={styles.issueText}>
              Riadok {issue.line}: {issue.message}
            </Text>
          ))}
        </View>
      ) : null}

      {newRecords.length > 0 ? (
        <View style={styles.preview}>
          {newRecords.map((record, index) => (
            <View key={`${fillUpKey(record)}-${index}`} style={styles.previewRow}>
              <Text style={styles.previewDate}>{formatDate(record.date)}</Text>
              <Text style={styles.previewText}>
                {formatNumber(record.odometer)} km · {formatNumber(record.liters, 2)} l · {formatCurrency(record.totalCost)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <PrimaryButton
        title={newRecords.length > 0 ? `Uložiť ${newRecords.length} tankovaní` : 'Uložiť do histórie'}
        onPress={handleSave}
        disabled={newRecords.length === 0}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  instructions: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  textarea: {
    minHeight: 220,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xs * 1.5,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  error: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 21,
  },
  summary: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.xs * 1.5,
    gap: 4,
  },
  summaryTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  issues: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.xs * 1.5,
    gap: 4,
  },
  issuesTitle: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '700',
  },
  issueText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  preview: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  previewRow: {
    paddingHorizontal: spacing.xs * 1.5,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  previewDate: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  previewText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
