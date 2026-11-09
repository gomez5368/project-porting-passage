import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ title, onPress, disabled = false }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonActive : null,
        disabled ? styles.buttonDisabled : null,
      ]}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.xs * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.accentPressed,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  text: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '700',
  },
});
