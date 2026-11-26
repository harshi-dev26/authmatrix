import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { access } from "../utils/live";
import { readSecret } from "../utils/secureStorage";
import TotpDisplay from "../components/TotpDisplay";
import { Badge, styles } from "../components/ui";
export default function AuthenticatorScreen({ session }) {
  const [source, setSource] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    access("authenticator", {}, session.token)
      .then(readSecret)
      .then((s) => {
        if (active) setSource(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Authenticator
      </Text>
      <Text>{session.user.email}</Text>
      <Badge kind={session.user.role} />
      {source ? <TotpDisplay source={source} /> : <Text>{error || "Loading your key…"}</Text>}
      <Text>
        Use this account’s code in the live website’s authenticator check. Codes refresh every 30
        seconds.
      </Text>
    </ScrollView>
  );
}
