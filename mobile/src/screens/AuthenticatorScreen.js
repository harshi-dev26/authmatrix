import React, { useEffect, useState } from "react";
import { Modal, ScrollView, Text } from "react-native";
import { View } from "react-native";
import payload from "../data/payload.json";
import { readSecret } from "../utils/secureStorage";
import TotpDisplay from "../components/TotpDisplay";
import { Badge, Button, styles } from "../components/ui";
export default function AuthenticatorScreen() {
  const [index, select] = useState(0),
    [source, setSource] = useState(null),
    [info, setInfo] = useState(false);
  const user = payload.profiles[index];
  useEffect(() => {
    let mounted = true;
    readSecret(payload.totpSecrets.find((s) => s.userId === user.userId)).then((next) => {
      if (mounted) setSource(next);
    });
    return () => {
      mounted = false;
    };
  }, [user]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Authenticator
      </Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Demo account</Text>
        <View style={styles.row}>
          {payload.profiles.map((p, i) => (
            <Button
              key={p.userId}
              selected={i === index}
              primary={i === index}
              label={p.displayName}
              onPress={() => select(i)}
            />
          ))}
        </View>
        <Text style={styles.body}>{user.email}</Text>
        <Badge kind={user.role} />
      </View>
      {source?.record.userId === user.userId ? (
        <TotpDisplay key={user.userId} source={source} />
      ) : (
        <Text>Loading sample secret…</Text>
      )}
      <Button label="About / Limits" onPress={() => setInfo(true)} />
      <Modal
        visible={info}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInfo(false)}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>
            About this authenticator
          </Text>
          <Text style={styles.body}>
            Each demo account has a public synthetic secret bundled with the app. The phone, browser
            and CLI independently calculate the same code every 30 seconds. Keep automatic date and
            time enabled. Approval prompts and their history stay on this device and clear on
            restart.
          </Text>
          <Button label="Close" onPress={() => setInfo(false)} />
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}
