import React, { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { generateTotp } from "../utils/totp";
import { Badge, Button, colors, styles } from "./ui";
export default function TotpDisplay({ source }) {
  const [now, setNow] = useState(Date.now),
    [result, setResult] = useState(null),
    [feedback, setFeedback] = useState("");
  const period = source.record.periodSeconds,
    windowId = Math.floor(now / 1000 / period),
    remaining = period - (Math.floor(now / 1000) % period);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 500),
      sub = AppState.addEventListener("change", tick);
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    setFeedback("");
    generateTotp(source.record, windowId * period * 1000)
      .then((code) => {
        if (mounted) setResult({ windowId, code });
      })
      .catch(() => {
        if (mounted) setFeedback("Code unavailable. Reopen the authenticator.");
      });
    return () => {
      mounted = false;
    };
  }, [windowId, period, source]);
  const code = result?.windowId === windowId ? result.code : "";
  async function copy() {
    try {
      const live = await generateTotp(source.record);
      await Clipboard.setStringAsync(live);
      setFeedback("Current code copied.");
    } catch {
      setFeedback("Copy unavailable. Enter the displayed digits manually.");
    }
  }
  return (
    <View style={styles.card}>
      <Badge
        kind={source.stored ? "stored" : "fallback"}
        label={
          source.stored ? "Secret Stored in SecureStore" : "SecureStore unavailable · using memory"
        }
      />
      <Text
        selectable
        accessibilityLabel={code ? code.split("").join(" ") : "Generating code"}
        style={styles.code}
      >
        {code ? code.slice(0, 3) + " " + code.slice(3) : "··· ···"}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Time remaining"
        accessibilityValue={{ min: 0, max: period, now: remaining }}
        style={styles.bar}
      >
        <View
          style={{
            height: 8,
            width: (remaining / period) * 100 + "%",
            backgroundColor: colors.primary,
          }}
        />
      </View>
      <Text>{remaining} seconds remaining</Text>
      <Button primary label="Copy Code" onPress={copy} />
      {feedback ? <Text accessibilityLiveRegion="polite">{feedback}</Text> : null}
    </View>
  );
}
