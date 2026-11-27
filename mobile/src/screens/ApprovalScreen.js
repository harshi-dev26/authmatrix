import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import ApprovalPrompt from "../components/ApprovalPrompt";
import { access } from "../utils/live";
import { Badge, Button, styles } from "../components/ui";

const sessionKey = "authmatrix.admin.session";

export default function ApprovalScreen() {
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [email, setEmail] = useState("admin@authmatrix.test");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Loading admin inbox…");

  const disconnect = useCallback(async (notice = "Admin inbox disconnected.") => {
    setSession(null);
    setItems([]);
    setMessage(notice);
    await SecureStore.deleteItemAsync(sessionKey).catch(() => {});
  }, []);

  const refresh = useCallback(
    async (current) => {
      if (!current) return;
      try {
        const result = await access("list", {}, current.token);
        setItems(result.requests);
        setMessage("");
      } catch (error) {
        if (/sign in|expired/i.test(error.message)) await disconnect("Session expired. Connect again.");
        else setMessage(error.message);
      }
    },
    [disconnect]
  );

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(sessionKey)
      .then((value) => {
        if (!active || !value) {
          if (active) setMessage("Connect the Admin account to receive student requests.");
          return;
        }
        const saved = JSON.parse(value);
        setSession(saved);
        return refresh(saved);
      })
      .catch(() => {
        if (active) setMessage("Connect the Admin account to receive student requests.");
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!session) return undefined;
    const timer = setInterval(() => refresh(session), 4000);
    return () => clearInterval(timer);
  }, [refresh, session]);

  async function connect() {
    try {
      setMessage("Connecting admin inbox…");
      const next = await access("login", { email, password });
      if (next.user.role !== "admin") throw Error("Use the Admin account for Approvals.");
      await SecureStore.setItemAsync(sessionKey, JSON.stringify(next));
      setSession(next);
      setPassword("");
      await refresh(next);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function decide(requestId, status) {
    const item = items.find((request) => request.requestId === requestId);
    try {
      await access(
        "decide",
        { requestId, userId: item.userId, status },
        session.token
      );
      setMessage(status === "approved" ? "Student request approved." : "Student request denied.");
      await refresh(session);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const pending = items.filter((item) => item.status === "pending");
  const history = items.filter((item) => item.status !== "pending");

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>Approvals</Text>
      {!session ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Connect Admin inbox</Text>
          <Text style={styles.body}>Sign in once. The session is kept in SecureStore.</Text>
          <Text>Admin email</Text>
          <TextInput
            accessibilityLabel="Admin email"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text>Password</Text>
          <TextInput
            accessibilityLabel="Admin password"
            style={styles.input}
            secureTextEntry
            placeholder="Enter Admin password"
            value={password}
            onChangeText={setPassword}
          />
          <Button primary label="Connect" onPress={connect} />
        </View>
      ) : (
        <>
          {pending.map((item) => (
            <ApprovalPrompt key={item.requestId} item={item} onDecision={decide} />
          ))}
          {!pending.length && <Text style={styles.body}>No pending student requests.</Text>}
          <Button label="Refresh Requests" onPress={() => refresh(session)} />
          <Text accessibilityRole="header" style={styles.heading}>Decision history</Text>
          <View accessibilityLiveRegion="polite" style={styles.card}>
            {history.map((item) => (
              <View key={item.requestId}>
                <Text style={styles.body}>{item.userEmail} · {item.requestId}</Text>
                <Badge kind={item.status} />
              </View>
            ))}
            {!history.length && <Text>No decisions yet.</Text>}
          </View>
          <Button label="Disconnect Admin" onPress={() => disconnect()} />
        </>
      )}
      <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text>
    </ScrollView>
  );
}
