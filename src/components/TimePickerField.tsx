import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/theme';
import { HOURS, MINUTES, parseTime, formatTime, snapMinute, pad2 } from '../utils/time';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5; // odd, so one row sits dead centre
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelProps {
  values: number[];
  selected: number;
  onChange: (value: number) => void;
}

/**
 * A single snapping column.
 *
 * Built from a plain ScrollView rather than a native picker so it behaves
 * identically on both platforms and needs no native module — which also means
 * it keeps working in Expo Go. Padding above and below the list lets the first
 * and last entries reach the centre band.
 */
function Wheel({ values, selected, onChange }: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, values.indexOf(selected));

  // Jump to the current value when the picker opens. Without the frame delay
  // the ScrollView hasn't laid out yet and the offset is ignored.
  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [selectedIndex]);

  const handleSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(index, 0), values.length - 1);
    const value = values[clamped];
    if (value !== selected) onChange(value);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ height: PICKER_HEIGHT }}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={handleSettle}
      // Fires when a slow drag ends without momentum, which otherwise
      // leaves the wheel parked between two values.
      onScrollEndDrag={handleSettle}
    >
      {values.map((value) => (
        <Pressable
          key={value}
          style={styles.item}
          onPress={() => {
            onChange(value);
            scrollRef.current?.scrollTo({ y: values.indexOf(value) * ITEM_HEIGHT, animated: true });
          }}
        >
          <Text style={[styles.itemText, value === selected && styles.itemTextActive]}>
            {pad2(value)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

interface Props {
  label: string;
  /** "HH:mm" */
  value: string;
  onChange: (value: string) => void;
}

export default function TimePickerField({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value) ?? { hour: 21, minute: 0 };
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(snapMinute(parsed.minute));

  const openPicker = () => {
    const current = parseTime(value) ?? { hour: 21, minute: 0 };
    setHour(current.hour);
    setMinute(snapMinute(current.minute));
    setOpen(true);
  };

  const confirm = () => {
    onChange(formatTime(hour, minute));
    setOpen(false);
  };

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={styles.fieldText}>{value || '시간 선택'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={styles.cancel}>취소</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable onPress={confirm} hitSlop={10}>
              <Text style={styles.done}>완료</Text>
            </Pressable>
          </View>

          <View style={styles.wheels}>
            {/* Sits behind the columns to mark the selected row. */}
            <View style={styles.highlight} pointerEvents="none" />
            <Wheel values={HOURS} selected={hour} onChange={setHour} />
            <Text style={styles.colon}>:</Text>
            <Wheel values={MINUTES} selected={minute} onChange={setMinute} />
          </View>

          <Text style={styles.preview}>{formatTime(hour, minute)}</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.bodyBold, marginBottom: spacing.xs, marginTop: spacing.md },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fieldText: { ...typography.body, color: colors.text },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: { ...typography.bodyBold },
  cancel: { ...typography.body, color: colors.textMuted },
  done: { ...typography.body, color: colors.primary, fontWeight: '700' },

  wheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  highlight: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) + spacing.sm,
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  itemText: { fontSize: 22, color: colors.textMuted },
  itemTextActive: { color: colors.text, fontWeight: '700' },
  colon: { fontSize: 22, fontWeight: '700', color: colors.text },

  preview: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
