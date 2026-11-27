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
    payload.prompts.map((item) =>
      prompt(
        payload.profiles.find((user) => user.userId === item.userId),
        item,
        item.requestId
      )
    )
  );

  function simulate() {
    setItems((previous) => [
      prompt(
        payload.profiles[previous.length % payload.profiles.length],
        payload.prompts[0],
        "mobile-" + (previous.length + 1)
      ),
      ...previous,
    ]);
  }

  function decide(id, status) {
    setItems((previous) =>
      previous.map((item) =>
        item.requestId === id && item.status === "pending" ? { ...item, status } : item
      )
    );
  }

  const pending = items.filter((item) => item.status === "pending");
  const history = items.filter((item) => item.status !== "pending");

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Approvals
      </Text>
      {pending.map((item) => (
        <ApprovalPrompt key={item.requestId} item={item} onDecision={decide} />
      ))}
      {!pending.length && <Text style={styles.body}>No pending requests.</Text>}
      <Button label="Simulate Incoming Prompt" onPress={simulate} />
      <Text accessibilityRole="header" style={styles.heading}>
        Decision history
      </Text>
      <View accessibilityLiveRegion="polite" style={styles.card}>
        {history.map((item) => (
          <View key={item.requestId}>
            <Text style={styles.body}>
              {item.email} · {item.requestId}
            </Text>
            <Badge kind={item.status} />
          </View>
        ))}
        {!history.length && <Text>No decisions yet.</Text>}
      </View>
    </ScrollView>
  );
}
