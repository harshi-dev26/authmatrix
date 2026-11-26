import React, { useMemo } from "react";
import { PanResponder, Text, View } from "react-native";
import { Button, Badge, styles } from "./ui";
export default function ApprovalPrompt({ item, onDecision }) {
  const gesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 16 && Math.abs(g.dx) > 2 * Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) >= 70) onDecision(item.requestId, g.dx > 0 ? "approved" : "denied");
        },
      }),
    [item.requestId, onDecision]
  );
  return (
    <View style={styles.card} {...gesture.panHandlers}>
      <Badge kind="pending" />
      <Text accessibilityRole="header" style={styles.heading}>
        Allow Project Lab access?
      </Text>
      <Text style={styles.body}>{item.reason}</Text>
      <Text selectable style={styles.body}>
        {item.userEmail}
      </Text>
      <Badge kind={item.role} />
      <Text style={styles.body}>
        {item.requestId}
        {"\n"}
        {new Date(item.createdAt).toLocaleString()}
      </Text>
      <View style={styles.row}>
        <Button primary label="Approve" onPress={() => onDecision(item.requestId, "approved")} />
        <Button label="Deny" onPress={() => onDecision(item.requestId, "denied")} />
      </View>
      <Text>Swipe right to approve or left to deny.</Text>
    </View>
  );
}
