import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
export const colors = {
  primary: "#4338CA",
  ink: "#1F2937",
  page: "#F8FAFC",
  paper: "#FFFFFF",
  error: "#B42318",
  warning: "#B54708",
  success: "#166534",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  card: {
    gap: 12,
    padding: 20,
    backgroundColor: colors.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9DCE6",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#AEB5C5",
    color: colors.ink,
    fontSize: 16,
  },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink },
  heading: { fontSize: 21, fontWeight: "700", color: colors.ink },
  body: { fontSize: 16, color: colors.ink, lineHeight: 24 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6 },
  code: {
    fontSize: 44,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bar: { height: 8, borderRadius: 4, backgroundColor: "#E3E0FF", overflow: "hidden" },
});
export function Button({ label, onPress, primary = false, selected }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? {} : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? colors.primary : colors.paper, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={{ color: primary ? colors.paper : colors.primary, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}
const marks = {
  student: ["school-outline", colors.primary],
  admin: ["shield-outline", colors.primary],
  pending: ["time-outline", colors.warning],
  approved: ["checkmark-circle-outline", colors.success],
  denied: ["close-circle-outline", colors.error],
  stored: ["lock-closed-outline", colors.success],
  fallback: ["information-circle-outline", colors.warning],
};
export function Badge({ kind, label = kind }) {
  const [icon, color] = marks[kind];
  return (
    <View accessible accessibilityLabel={label} style={styles.badge}>
      <Ionicons name={icon} size={19} color={color} />
      <Text style={{ color, fontWeight: "600", flexShrink: 1 }}>{label}</Text>
    </View>
  );
}
