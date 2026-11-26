import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import payload from "../data/payload.json";
import ApprovalPrompt from "../components/ApprovalPrompt";
import { Button, Badge, styles } from "../components/ui";
function prompt(profile, details, id) {
  return {
    ...details,
    ...profile,
    requestId: id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
}
export default function ApprovalScreen() {
  const [items, setItems] = useState(() =>
    payload.prompts.map((p) =>
      prompt(
        payload.profiles.find((u) => u.userId === p.userId),
        p,
        p.requestId
      )
    )
  );
  function simulate() {
    setItems((prev) => [
      prompt(
        payload.profiles[prev.length % payload.profiles.length],
        payload.prompts[0],
        "mobile-" + (prev.length + 1)
      ),
      ...prev,
    ]);
  }
  function decide(id, status) {
    setItems((prev) =>
      prev.map((p) => (p.requestId === id && p.status === "pending" ? { ...p, status } : p))
    );
  }
  const pending = items.filter((p) => p.status === "pending"),
    history = items.filter((p) => p.status !== "pending");
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Approvals
      </Text>
      {pending.map((p) => (
        <ApprovalPrompt key={p.requestId} item={p} onDecision={decide} />
      ))}
      {!pending.length && <Text style={styles.body}>No pending requests.</Text>}
      <Button label="Simulate Incoming Prompt" onPress={simulate} />
      <Text accessibilityRole="header" style={styles.heading}>
        Decision history
      </Text>
      <View accessibilityLiveRegion="polite" style={styles.card}>
        {history.map((p) => (
          <View key={p.requestId}>
            <Text style={styles.body}>
              {p.email} · {p.requestId}
            </Text>
            <Badge kind={p.status} />
          </View>
        ))}
        {!history.length && <Text>No decisions yet.</Text>}
      </View>
    </ScrollView>
  );
}
