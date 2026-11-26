import React, { useState } from "react";
import { Text, TextInput, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ApprovalScreen from "./src/screens/ApprovalScreen";
import AuthenticatorScreen from "./src/screens/AuthenticatorScreen";
import { Button, styles } from "./src/components/ui";
import { access } from "./src/utils/live";
export default function App() {
  const [session, setSession] = useState(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, say] = useState(""),
    [tab, select] = useState("Authenticator");
  async function login() {
    try {
      const next = await access("login", { email, password });
      setPassword("");
      say("");
      select(next.user.role === "admin" ? "Access requests" : "Authenticator");
      setSession(next);
    } catch (e) {
      say(e.message);
    }
  }
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page}>
        {session ? (
          <>
            <View style={styles.content}>
              <Text style={styles.heading}>AuthMatrix</Text>
              <View style={styles.row}>
                {(session.user.role === "admin"
                  ? ["Access requests", "Authenticator"]
                  : ["Authenticator"]
                ).map((t) => (
                  <Button
                    key={t}
                    label={t}
                    selected={tab === t}
                    primary={tab === t}
                    onPress={() => select(t)}
                  />
                ))}
                <Button label="Sign out" onPress={() => setSession(null)} />
              </View>
            </View>
            {tab === "Access requests" && session.user.role === "admin" ? (
              <ApprovalScreen token={session.token} />
            ) : (
              <AuthenticatorScreen session={session} />
            )}
          </>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.title}>AuthMatrix</Text>
            <Text style={styles.heading}>Sign in</Text>
            <Text>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              style={styles.card}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Text>Access pass</Text>
            <TextInput
              accessibilityLabel="Access pass"
              style={styles.card}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Button label="Sign in" primary onPress={login} />
            <Text accessibilityLiveRegion="polite">{message}</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
