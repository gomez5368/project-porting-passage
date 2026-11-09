import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string | null;
  hint?: string;
  suffix?: string;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  hint,
  suffix,
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          style={styles.input}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs * 1.5,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: spacing.xs * 1.5,
  },
  suffix: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  error: {
    color: colors.error,
    fontSize: 13,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
