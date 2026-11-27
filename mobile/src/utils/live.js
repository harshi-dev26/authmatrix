const endpoint = "https://authmatrix-gxicepaxa-harshibuilds-1048.vercel.app/api/access";
export async function access(action, fields = {}, token) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({ action, ...fields }),
  });
  const text = await r.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw Error("The AuthMatrix server is unavailable. Check the deployment link and try again.");
  }
  if (!r.ok) throw Error(result.error || "Unable to connect.");
  return result;
}
