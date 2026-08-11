import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CATEGORIES, colors, spacing, radius, typography } from '../theme/theme';

interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
  max: number;
}

/**
 * Multi-select category chips with a hard cap.
 *
 * At the cap, unselected chips dim and stop responding rather than silently
 * ignoring taps — otherwise it just looks broken.
 */
export default function CategoryChips({ selected, onChange, max }: Props) {
  const atLimit = selected.length >= max;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((c) => c !== value));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, value]);
  };

  return (
    <View style={styles.row}>
      {CATEGORIES.map((category) => {
        const isSelected = selected.includes(category);
        const dimmed = !isSelected && atLimit;
        return (
          <Pressable
            key={category}
            style={[styles.chip, isSelected && styles.chipActive, dimmed && styles.chipDimmed]}
            onPress={() => toggle(category)}
            disabled={dimmed}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextActive,
                dimmed && styles.chipTextDimmed,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDimmed: { opacity: 0.4 },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: colors.card, fontWeight: '700' },
  chipTextDimmed: { color: colors.textMuted },
});
