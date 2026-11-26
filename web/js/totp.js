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
export async function generateTotp(record, timeMs = Date.now()) {
  const { key, message } = totpInputs(record.secret, timeMs, record.periodSeconds);
  const handle = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, [
    "sign",
  ]);
  return truncate(new Uint8Array(await crypto.subtle.sign("HMAC", handle, message)));
}
