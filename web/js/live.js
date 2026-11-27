const $ = (s) => document.querySelector(s);
const marks = { pending: "◷ Pending", approved: "✓ Approved", denied: "× Denied" };
let session = null,
  pendingSession = null,
  rows = [],
  version = 0,
  readId = 0;
try {
  session = JSON.parse(sessionStorage.getItem("am-live-v2fa"));
} catch {}
async function api(action, fields = {}, token = session?.token) {
  const r = await fetch("/api/access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
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
  $("#notice").innerHTML = message
    ? `<div class="alert good"><i class="bi bi-info-circle" aria-hidden="true"></i> ${message}</div>`
    : "";
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
  $("#login-card").hidden = !!session || !!pendingSession;
  $("#verify-card").hidden = !pendingSession || !!session;
  $("#workspace").hidden = !session;
  $("#student").hidden = session?.user.role !== "student";
  $("#identity").textContent = session ? session.user.email + " · " + session.user.role : "";
  $("#signin-link").textContent = session ? "Workspace" : pendingSession ? "Verify" : "Sign in";
  $("#verify-identity").textContent = pendingSession
    ? pendingSession.user.email + " · " + pendingSession.user.role
    : "";
  if (session) {
    $("#workspace-title").textContent =
      session.user.role === "admin" ? "Admin dashboard" : "Protected home";
    $("#request-title").textContent =
      session.user.role === "admin" ? "Student access requests" : "My access requests";
    $("#request-help").textContent =
      session.user.role === "admin"
        ? "Approve or deny requests sent by students. Status filters update this list."
        : "Your administrator’s decision appears here automatically.";
  }
  rows = [];
  list();
  if (session) act(refresh);
}
function signout() {
  session = null;
  pendingSession = null;
  sessionStorage.removeItem("am-live-v2fa");
  $("#resource").textContent = "";
  show();
  feedback("Signed out.");
}
$("#login").onsubmit = (e) => {
  e.preventDefault();
  act(async () => {
    pendingSession = await api("login", {
      email: $("#email").value,
      password: $("#password").value,
    });
    $("#password").value = "";
    feedback("Password accepted. Complete mobile verification.");
    show();
  });
};
function finishVerification(message) {
  session = pendingSession;
  pendingSession = null;
  sessionStorage.setItem("am-live-v2fa", JSON.stringify(session));
  $("#verify-code").value = "";
  show();
  feedback(message);
}
$("#verify-form").onsubmit = (e) => {
  e.preventDefault();
  act(async () => {
    const code = $("#verify-code").value.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) throw Error("Enter the current six-digit mobile code.");
    const result = await api("verify", { code }, pendingSession?.token);
    if (!result.valid) throw Error("Invalid or expired code. Enter the newest mobile code.");
    finishVerification("Code verified. Welcome to your protected workspace.");
  });
};
$("#simulate-approval").onclick = () =>
  finishVerification("Mobile push approval simulated. Welcome to your protected workspace.");
$("#cancel-verification").onclick = () => {
  pendingSession = null;
  $("#verify-code").value = "";
  show();
  feedback("Verification canceled.");
};
setInterval(() => {
  const countdown = $("#verify-countdown");
  if (countdown && pendingSession)
    countdown.textContent =
      "The mobile code refreshes in " + (30 - (Math.floor(Date.now() / 1000) % 30)) + " seconds.";
}, 1000);
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
$("#student-fill").onclick = () => {
  $("#email").value = "student@authmatrix.test";
  $("#password").value = "StudentDemo1";
  feedback("Student demo account filled.");
};
$("#admin-fill").onclick = () => {
  $("#email").value = "admin@authmatrix.test";
  $("#password").value = "AdminDemo1";
  feedback("Admin demo account filled.");
};
show();
setInterval(() => {
  if (!document.hidden && session) act(refresh);
}, 4000);
