import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

interface Props {
  value: number;
  /** Omit to render a read-only rating. */
  onChange?: (rating: number) => void;
  size?: number;
  /** Draws half stars for averages like 4.5. Ignored when interactive. */
  allowHalf?: boolean;
}

export default function StarRating({ value, onChange, size = 18, allowHalf = false }: Props) {
  const interactive = typeof onChange === 'function';

  const iconFor = (position: number): keyof typeof Ionicons.glyphMap => {
    if (value >= position) return 'star';
    // A 4.5 shows four filled and one half — rounding up would overstate it.
    if (allowHalf && value >= position - 0.5) return 'star-half';
    return 'star-outline';
  };

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((position) => {
        const star = (
          <Ionicons
            name={iconFor(position)}
            size={size}
            color={value >= position - 0.5 ? colors.accent : colors.border}
          />
        );

        if (!interactive) return <View key={position}>{star}</View>;

        return (
          <Pressable
            key={position}
            onPress={() => onChange?.(position)}
            hitSlop={6}
            style={styles.tap}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tap: { padding: 2 },
});
