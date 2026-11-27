import React, { useState } from "react";
import { StatusBar, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ApprovalScreen from "./src/screens/ApprovalScreen";
import AuthenticatorScreen from "./src/screens/AuthenticatorScreen";
import { Button, styles, colors } from "./src/components/ui";

export default function App() {
  const [tab, setTab] = useState("Approvals");

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.content}>
          <Text style={{ fontSize: 21, fontWeight: "700", color: colors.ink }}>AuthMatrix</Text>
          <View style={styles.row}>
            {["Approvals", "Authenticator"].map((name) => (
              <Button
                key={name}
                selected={tab === name}
                label={name}
                primary={tab === name}
                onPress={() => setTab(name)}
              />
            ))}
          </View>
        </View>
        <View style={{ flex: 1, display: tab === "Approvals" ? "flex" : "none" }}>
          <ApprovalScreen />
        </View>
        {tab === "Authenticator" && <AuthenticatorScreen />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
