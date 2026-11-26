const endpoint = "https://authmatrix-sage.vercel.app/api/access";
export async function access(action, fields = {}, token) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({ action, ...fields }),
  });
  const result = await r.json();
  if (!r.ok) throw Error(result.error || "Unable to connect.");
  return result;
}
