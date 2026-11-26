import * as Crypto from "expo-crypto";
// Decode the public Base32 sample key and encode the RFC time counter in network byte order.
export function totpInputs(secret, timeMs, period = 30) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0,
    buffer = 0;
  const key = [];
  for (const ch of secret.toUpperCase().replace(/=+$/, "")) {
    const value = alphabet.indexOf(ch);
    if (value < 0) throw Error("Invalid demo key.");
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      key.push((buffer >> bits) & 255);
    }
  }
  const message = new Uint8Array(8);
  let counter = Math.floor(timeMs / 1000 / period);
  for (let i = 7; i >= 0; i--) {
    message[i] = counter % 256;
    counter = Math.floor(counter / 256);
  }
  return { key: Uint8Array.from(key), message };
}
export function truncate(hash) {
  const offset = hash[hash.length - 1] & 15;
  const value =
    ((hash[offset] & 127) << 24) |
    (hash[offset + 1] << 16) |
    (hash[offset + 2] << 8) |
    hash[offset + 3];
  return String(value % 1000000).padStart(6, "0");
}

// Expo Go supplies the SHA-1 digest; construct the RFC 2104 inner and outer HMAC pads.
export async function generateTotp(record, timeMs = Date.now()) {
  const { key, message } = totpInputs(record.secret, timeMs, record.periodSeconds);
  const digest = async (bytes) =>
    new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA1, bytes));
  const normalized = key.length > 64 ? await digest(key) : key;
  const inner = new Uint8Array(64 + message.length);
  const outer = new Uint8Array(64 + 20);
  inner.fill(0x36, 0, 64);
  outer.fill(0x5c, 0, 64);
  for (let i = 0; i < normalized.length; i++) {
    inner[i] ^= normalized[i];
    outer[i] ^= normalized[i];
  }
  inner.set(message, 64);
  outer.set(await digest(inner), 64);
  return truncate(await digest(outer));
}
