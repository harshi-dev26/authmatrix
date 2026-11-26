import * as SecureStore from "expo-secure-store";
export async function readSecret(sample) {
  try {
    if (!(await SecureStore.isAvailableAsync())) throw Error();
    const name = "authmatrix.v2." + sample.userId;
    let value = await SecureStore.getItemAsync(name);
    if (value !== sample.secret) {
      await SecureStore.setItemAsync(name, sample.secret);
      value = await SecureStore.getItemAsync(name);
    }
    if (value !== sample.secret) throw Error();
    return { record: { ...sample, secret: value }, stored: true };
  } catch {
    return { record: sample, stored: false };
  }
}
