import { LocalDataStore } from "./store.js";
import { SessionManager, validateLogin, checkCredentials, partnerProfile } from "./auth.js";
import { accessReason } from "./roleGuard.js";
import { dashboard, simulate, decide, filtered, downloadCsv } from "./admin.js";
import { generateTotp } from "./totp.js";
const filters = { query: "", status: "", role: "" };
let challenge = null,
  tick;
const store = new LocalDataStore();
const sessions = new SessionManager(store);
const $ = (selector) => document.querySelector(selector);
const view = $("#view");
const e = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
const icons = {
  admin: "shield-lock",
  student: "mortarboard",
  approved: "check-circle",
  pending: "hourglass-split",
  denied: "x-circle",
  active: "check-circle",
  ended: "stop-circle",
};
const badge = (status, label = status[0].toUpperCase() + status.slice(1)) =>
  `<span class="badge ${e(status)}"><i aria-hidden="true" class="bi bi-${icons[status]}"></i>${e(label)}</span>`;
const btn = (label, action, style = "", id = "") =>
  `<button class="${style}" data-action="${action}" data-id="${e(id)}">${label}</button>`;
function sessionDetails(s) {
  return `<dl><dt>Session ID</dt><dd>${e(s.sessionId)}</dd><dt>User ID</dt><dd>${e(s.userId)}</dd><dt>Role</dt><dd>${badge(s.role)}</dd><dt>Created</dt><dd>${e(new Date(s.createdAt).toLocaleString())}</dd><dt>Status</dt><dd>${badge(s.status)}</dd></dl>${s.status === "active" ? btn("Revoke Session", "revoke", "", s.sessionId) : ""}`;
}
let timer,
  partnerReady = false,
  selectedRole = "student",
  notice = null;
const announce = (message, bad = false) => {
  notice = { message, bad };
  paintFeedback();
};
function paintFeedback() {
  const n = store.error
    ? {
        bad: true,
        message:
          "Sample storage is blocked or damaged. Allow browser storage, then reset the sample data to recover.",
      }
    : notice;
  $("#feedback").innerHTML = n
    ? `<div class="alert ${n.bad ? "bad" : "good"}"><i aria-hidden="true" class="bi bi-${n.bad ? "exclamation-circle" : "check-circle"}"></i> ${e(n.message)} ${store.error ? btn("Reset Sample Data", "reset") : ""}</div>`
    : "";
}
function go(route, message, bad = false) {
  const hash = "#" + route;
  if (location.hash !== hash) history.pushState(null, "", hash);
  notice = message ? { message, bad } : null;
  render();
  $("#main").focus();
}
const route = () => location.hash.slice(1) || (sessions.user ? "home" : "signin");
function restricted(reason) {
  return `<section class="card narrow"><h1>Access blocked</h1><p>${e(reason)}</p>${btn(sessions.user ? "Return to protected home" : "Return to sign-in", sessions.user ? "home" : "signin", "primary")}</section>`;
}
function partner() {
  if (!partnerReady) {
    timer = setTimeout(() => {
      partnerReady = true;
      render();
    }, 650);
    return '<section class="card narrow" role="status"><span class="spinner-border"></span> Connecting to the mock partner…</section>';
  }
  const u = store.data.users.find((u) => u.role === selectedRole);
  const profile = partnerProfile(u);
  return `<section class="card narrow"><div class="eyebrow">Mock partner redirect</div><h1>Northstar Identity</h1><p>Allow AuthMatrix to use this sample profile for single sign-on?</p><label for="role">Demo role</label><select id="role" class="form-select" aria-describedby="role-help">${["student", "admin"].map((r) => `<option value="${r}" ${r === selectedRole ? "selected" : ""}>${r === "admin" ? "Admin" : "Student"}</option>`).join("")}</select><small id="role-help">Choose the profile to share with AuthMatrix.</small><dl><dt>Provider</dt><dd>${e(profile.provider)}</dd><dt>External ID</dt><dd>${e(profile.externalId)}</dd><dt>Name</dt><dd>${e(profile.displayName)}</dd><dt>Role</dt><dd>${badge(profile.role)}</dd></dl><div class="actions">${btn("Approve &amp; Return to AuthMatrix", "consent", "primary")}${btn("Cancel / Deny", "cancel")}</div></section>`;
}
function help() {
  return `<section class="card narrow"><h1>About / Help</h1><h2>Standard sign-in</h2><p>Fill a demo account, then sign in. The app compares the sample credentials and saves a session in this browser.</p><h2>Role-based access control</h2><p>Both roles can open protected home. The admin role can also review simulated login requests. Try Test Admin Action with each account.</p><h2>Partner sign-in</h2><p>A partner typically authenticates you before returning to the relying application. OAuth 2.0 delegates access and OpenID Connect adds identity. Here you select a synthetic profile and grant or deny consent locally.</p><h2>Time-based one-time passwords</h2><p>RFC 6238 combines a shared secret with a time counter to generate a short-lived code. A verifier checks the code using the same secret and time window. Open the mobile Authenticator and select the matching account. Enter the six digits before the countdown resets. Simulated push decisions stay on each device.</p><h2>Educational prototype</h2><p>Anyone using this browser can change localStorage, including roles and sessions. All identities, credentials, consent and approval decisions are synthetic. Production identity systems require server-side verification, secure sessions, and validated protocol responses. Never enter real credentials here.</p></section>`;
}
function render() {
  clearTimeout(timer);
  clearInterval(tick);
  if (route() !== "verify") challenge = null;
  paintFeedback();
  const user = sessions.user,
    r = route();
  if (r !== "partner") {
    partnerReady = false;
    selectedRole = "student";
  }
  const nav = user
    ? [
        ["home", "Protected home"],
        ...(user.role === "admin" ? [["admin", "Admin dashboard"]] : []),
        ["help", "About / Help"],
      ]
    : [
        ["signin", "Sign in"],
        ["help", "About / Help"],
      ];
  $("#links").innerHTML = nav
    .map(([key, name]) => `<a href="#${key}" ${key === r ? 'aria-current="page"' : ""}>${name}</a>`)
    .join("");
  $(".brand").href = user ? "#home" : "#signin";
  if (store.error) {
    view.innerHTML = "<h1>Workspace unavailable</h1>";
    return;
  }
  const reason = accessReason(r, user);
  if (reason) {
    view.innerHTML = restricted(reason);
    return;
  }
  switch (r) {
    case "signin":
      view.replaceChildren($("#loginView").content.cloneNode(true));
      break;
    case "partner":
      view.innerHTML = partner();
      break;
    case "verify":
      if (!challenge) {
        view.innerHTML = restricted("Start a new sign-in to verify a second factor.");
        break;
      }
      view.innerHTML = `<dialog id="verify-dialog" class="modal-content" aria-labelledby="verify-title"><h2 id="verify-title">Awaiting mobile approval</h2><p>Open Authenticator and select ${e(challenge.email)}. Enter its code or simulate a push approval.</p><form id="verify-form" novalidate><label for="otp">Six-digit TOTP code</label><input id="otp" class="form-control" inputmode="numeric" autocomplete="one-time-code" aria-describedby="otp-error"><small id="otp-error" class="error" aria-live="polite"></small><p id="clock" aria-live="polite"></p><button class="primary">Verify code</button></form><hr><div class="actions">${btn("Simulate Mobile Push Approval", "push")}${btn("Cancel", "cancel-factor")}</div></dialog>`;
      $("#verify-dialog").showModal();
      $("#verify-dialog").addEventListener("cancel", (event) => {
        event.preventDefault();
        go("signin", "Verification canceled.", true);
      });
      const clock = () => {
        $("#clock").textContent =
          "Code refreshes in " + (30 - (Math.floor(Date.now() / 1000) % 30)) + " seconds.";
      };
      clock();
      tick = setInterval(clock, 1000);
      break;
    case "home":
      view.innerHTML = `<section class="card narrow">${badge(user.role)}<h1>Welcome, ${e(user.displayName)}.</h1><p>You are on your protected home page.</p><h2>Your active sessions</h2>${[
        store.data.session,
        ...store.data.prefs.recentSessions,
      ]
        .filter((s) => s?.userId === user.userId && s.status === "active")
        .map(sessionDetails)
        .join(
          ""
        )}<div class="actions">${btn("Test Admin Action", "admin", "primary")}${btn("Start another sign-in", "signin")}${btn("Log out", "logout")}</div></section>`;
      break;
    case "admin":
      view.innerHTML = dashboard(store.data, { e, badge, btn, sessionDetails, filters });
      break;
    case "ended":
      view.innerHTML = restricted("Your session has ended.");
      if (!user)
        view.insertAdjacentHTML(
          "beforeend",
          '<p class="narrow">No active session selected. Sign in to start a new one.</p>'
        );
      break;
    case "help":
      view.innerHTML = help();
      break;
    default:
      view.innerHTML = restricted("This page could not be found.");
  }
}
function start(u) {
  challenge = u;
  go("verify");
}
function finish(u) {
  if (!challenge || u !== challenge || store.error) return;
  if (sessions.start(u)) go("home", "Signed in. You are on your protected home page.");
  else render();
}
function validate(form) {
  const errors = validateLogin(form.elements.email.value.trim(), form.elements.password.value);
  for (const [id, message] of Object.entries(errors)) {
    form.elements[id].setAttribute("aria-invalid", String(Boolean(message)));
    $("#" + id + "-error").textContent = message;
  }
  return Object.keys(errors).find((id) => errors[id]);
}
await store.init();

document.addEventListener("submit", async (event) => {
  if (event.target.id === "verify-form") {
    event.preventDefault();
    const pending = challenge;
    if (!pending) return;
    const input = $("#otp"),
      err = $("#otp-error"),
      code = input.value.replace(/ /g, "");
    try {
      const record = store.seed.totpSecrets.find((s) => s.userId === pending.userId);
      if (/^\d{6}$/.test(code) && code === (await generateTotp(record))) {
        finish(pending);
        return;
      }
      err.textContent = "Enter the current six-digit code for this account.";
    } catch {
      err.textContent =
        "Code verification is unavailable. Use localhost or HTTPS, or simulate push approval.";
    }
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }
  if (event.target.id !== "login") return;
  event.preventDefault();
  const form = event.target;
  const invalid = validate(form);
  if (invalid) {
    announce("Check the highlighted fields.", true);
    form.elements[invalid].focus();
    return;
  }
  const u = checkCredentials(
    store.data.users,
    form.elements.email.value.trim(),
    form.elements.password.value
  );
  if (u) start(u);
  else announce("Invalid email or password. Check your details and try again.", true);
});
function updateFilters(event) {
  const control = event.target;
  if (!control.id?.startsWith("filter-") || sessions.user?.role !== "admin") return;
  filters[control.id.slice(7)] = control.value;
  const next = document.createElement("div");
  next.innerHTML = dashboard(store.data, { e, badge, btn, sessionDetails, filters });
  for (const id of ["admin-results", "print-audit"])
    $("#" + id).replaceWith(next.querySelector("#" + id));
}
document.addEventListener("input", (event) => {
  if (event.target.id === "filter-query") updateFilters(event);
  if (event.target.form?.id === "login" && event.target.hasAttribute("aria-invalid"))
    validate(event.target.form);
});
document.addEventListener("change", (event) => {
  if (["filter-status", "filter-role"].includes(event.target.id)) updateFilters(event);
  if (event.target.id === "role") {
    selectedRole = event.target.value;
    render();
    $("#role").focus();
  }
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".skip")) {
    event.preventDefault();
    $("#main").focus();
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "reset") {
    $("#resetDialog").showModal();
    return;
  }
  if (action === "close") {
    $("#resetDialog").close();
    return;
  }
  if (action === "confirm-reset") {
    $("#resetDialog").close();
    Object.assign(filters, { query: "", role: "", status: "" });
    store.reset();
    go("signin", "Sample data restored.");
    return;
  }
  if (store.error) return;
  switch (action) {
    case "push":
      if (challenge && route() === "verify") finish(challenge);
      break;
    case "cancel-factor":
      go("signin", "Verification canceled.", true);
      break;
    case "csv":
    case "pdf":
      store.load();
      if (store.error || sessions.user?.role !== "admin" || route() !== "admin") {
        render();
        break;
      }
      if (action === "csv") downloadCsv(filtered(store.data.approvals, filters));
      else {
        render();
        window.print();
      }
      break;
    case "revoke": {
      store.load();
      const current = store.data.session?.sessionId === target.dataset.id;
      if (!store.error && sessions.revoke(target.dataset.id)) {
        if (current) go("ended", "Session revoked.");
        else {
          announce("Session revoked.");
          render();
        }
      } else render();
      break;
    }

    case "student":
    case "admin-fill": {
      const role = action === "student" ? "student" : "admin";
      const u = store.data.users.find((u) => u.role === role);
      $("#email").value = u.email;
      $("#password").value = u.passwordHash.slice("educational-placeholder:".length);
      validate($("#login"));
      announce("Demo account filled. Select Sign in to continue.");
      break;
    }
    case "partner":
    case "signin":
    case "home":
    case "admin":
      go(action);
      break;
    case "consent":
      if (route() === "partner" && partnerReady) {
        const u = store.data.users.find((u) => u.role === selectedRole);
        start(u);
      }
      break;
    case "cancel":
      go("signin", "Approval denied. Partner sign-in was canceled.", true);
      break;
    case "logout":
      if (sessions.user && sessions.end()) go("ended", "Signed out.");
      else render();
      break;
    case "simulate":
    case "approved":
    case "denied": {
      store.load();
      if (store.error || accessReason("admin", sessions.user)) {
        render();
        break;
      }
      const ok =
        action === "simulate"
          ? simulate(store, sessions.user)
          : decide(store, sessions.user, target.dataset.id, action);
      announce(
        ok
          ? action === "simulate"
            ? "New login request pending approval."
            : "Login approval " + action + "."
          : "The request could not be updated.",
        !ok || action === "denied"
      );
      render();
      break;
    }
  }
});
window.addEventListener("hashchange", () => {
  notice = null;
  render();
  $("#main").focus();
});
window.addEventListener("storage", (event) => {
  if (!event.key || event.key.startsWith("authmatrix_")) {
    challenge = null;
    store.load();
    notice = null;
    render();
  }
});
render();
