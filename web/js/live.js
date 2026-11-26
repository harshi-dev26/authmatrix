const $ = (s) => document.querySelector(s);
const marks = { pending: "◷ Pending", approved: "✓ Approved", denied: "× Denied" };
let session = null,
  rows = [],
  version = 0,
  readId = 0;
try {
  session = JSON.parse(sessionStorage.getItem("am-live"));
} catch {}
async function api(action, fields = {}) {
  const r = await fetch("/api/access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: "Bearer " + session.token } : {}),
    },
    body: JSON.stringify({ action, ...fields }),
  });
  const body = await r.json();
  if (!r.ok) {
    if (r.status === 401 && session) signout();
    throw Error(body.error || "Please retry.");
  }
  return body;
}
function feedback(message) {
  $("#notice").textContent = message;
}
function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function list() {
  const shown = rows.filter((r) => !$("#filter").value || r.status === $("#filter").value);
  const items = shown.map((r) => {
    const li = document.createElement("li");
    const box = document.createElement("div");
    li.append(box);
    box.append(
      element("strong", r.name + " · " + r.userEmail),
      element("p", r.reason),
      element("small", r.requestId + " · " + new Date(r.createdAt).toLocaleString()),
      element("strong", marks[r.status])
    );
    if (session?.user.role === "admin" && r.status === "pending") {
      for (const [label, status] of [
        ["Approve", "approved"],
        ["Deny", "denied"],
      ]) {
        const b = element("button", label);
        b.onclick = () =>
          act(async () => {
            await api("decide", { requestId: r.requestId, userId: r.userId, status });
            await refresh();
            feedback("Request " + status + ".");
          });
        li.append(b);
      }
    }
    return li;
  });
  $("#requests").replaceChildren(
    ...(items.length
      ? items
      : [element("li", "No " + ($("#filter").value || "matching") + " requests.")])
  );
  $("#submit button").disabled = rows[0]?.status === "pending";
  if (rows[0]?.status !== "approved") $("#resource").textContent = "";
}
async function refresh() {
  if (!session) return;
  const n = ++readId,
    v = version;
  const next = await api("list");
  if (n !== readId || v !== version) return;
  if (JSON.stringify(next.requests) !== JSON.stringify(rows)) {
    rows = next.requests;
    list();
  }
}
async function act(fn) {
  try {
    await fn();
  } catch (err) {
    feedback(err.message);
  }
}
function show() {
  version++;
  $("#login-card").hidden = !!session;
  $("#workspace").hidden = !session;
  $("#student").hidden = session?.user.role !== "student";
  $("#identity").textContent = session ? session.user.email + " · " + session.user.role : "";
  rows = [];
  list();
  if (session) act(refresh);
}
function signout() {
  session = null;
  sessionStorage.removeItem("am-live");
  $("#resource").textContent = "";
  show();
  feedback("Signed out.");
}
$("#login").onsubmit = (e) => {
  e.preventDefault();
  act(async () => {
    session = await api("login", { email: $("#email").value, password: $("#password").value });
    sessionStorage.setItem("am-live", JSON.stringify(session));
    $("#password").value = "";
    feedback("");
    show();
  });
};
$("#submit").onsubmit = (e) => {
  e.preventDefault();
  act(async () => {
    await api("submit", { reason: $("#reason").value });
    $("#reason").value = "";
    feedback("Request sent. Waiting for an admin.");
    await refresh();
  });
};
$("#lab").onclick = () =>
  act(async () => {
    const result = await api("lab");
    $("#resource").textContent = result.assignment;
    feedback("Project Lab opened.");
  });
$("#filter").onchange = list;
$("#logout").onclick = signout;
show();
setInterval(() => {
  if (!document.hidden && session) act(refresh);
}, 4000);

$("#check").onsubmit = (e) => {
  e.preventDefault();
  act(async () => {
    const result = await api("verify", { code: $("#otp-live").value });
    $("#otp-live").value = "";
    feedback(result.valid ? "Code verified." : "Invalid or expired code.");
  });
};
