import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import ApprovalPrompt from "../components/ApprovalPrompt";
import { Badge, styles, Button } from "../components/ui";
import { access } from "../utils/live";
export default function ApprovalScreen({ token }) {
  const [items, setItems] = useState([]),
    [message, say] = useState("Loading requests…"),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    let active = true,
      busy = false;
    async function refresh() {
      if (busy) return;
      busy = true;
      try {
        const result = await access("list", {}, token);
        if (active) {
          setItems(result.requests);
          say("");
        }
      } catch (e) {
        if (active) say(e.message);
      } finally {
        busy = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token]);
  async function decide(requestId, status) {
    try {
      const item = items.find((r) => r.requestId === requestId);
      await access("decide", { requestId, userId: item.userId, status }, token);
      setItems((await access("list", {}, token)).requests);
      say("Request " + status + ".");
    } catch (e) {
      say(e.message);
    }
  }
  const shown = items.filter((r) => filter === "all" || r.status === filter);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Access requests
      </Text>
      <View style={styles.row}>
        {["all", "pending", "approved", "denied"].map((s) => (
          <Button
            key={s}
            label={s}
            selected={s === filter}
            primary={s === filter}
            onPress={() => setFilter(s)}
          />
        ))}
      </View>
      <Text accessibilityLiveRegion="polite">{message}</Text>
      {!shown.length && !message && <Text>No matching requests.</Text>}
      {shown.map((r) =>
        r.status === "pending" ? (
          <ApprovalPrompt key={r.requestId} item={r} onDecision={decide} />
        ) : (
          <View style={styles.card} key={r.requestId}>
            <Text style={styles.heading}>{r.userEmail}</Text>
            <Text>{r.reason}</Text>
            <Text selectable>{r.requestId}</Text>
            <Badge kind={r.status} />
          </View>
        )
      )}
    </ScrollView>
  );
}
