export function decide(store, user, id, status) {
  if (user?.role !== "admin" || !["approved", "denied"].includes(status)) return false;
  const items = store.data.approvals;
  if (!items.some((a) => a.requestId === id && a.status === "pending")) return false;
  return store.write({ approvals: items.map((a) => (a.requestId === id ? { ...a, status } : a)) });
}
export function simulate(store, user) {
  if (user?.role !== "admin") return false;
  const sample = store.data.users.find((u) => u.role === "student");
  return store.write({
    approvals: [
      {
        requestId: crypto.randomUUID(),
        userId: sample.userId,
        userEmail: sample.email,
        role: sample.role,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      ...store.data.approvals,
    ],
  });
}
export function dashboard(data, ui) {
  const { e, badge, btn, sessionDetails } = ui;
  const approvals = filtered(data.approvals, ui.filters);
  const pending = approvals.filter((a) => a.status === "pending");
  function row(a) {
    return `<li><div><strong>${e(a.userEmail)}</strong><small>${e(a.requestId)}</small> ${badge(a.role)}<small>${e(new Date(a.createdAt).toLocaleString())}</small></div><div class="actions">${badge(a.status)} ${a.status === "pending" ? btn("Approve", "approved", "", a.requestId) + btn("Deny", "denied", "", a.requestId) : ""}</div></li>`;
  }
  return `<h1>Admin dashboard</h1>${auditControls(ui.filters, e)}<div id="admin-results"><section class="card"><div class="heading"><h2>Login approvals</h2>${badge("pending", pending.length + " pending")}</div>${btn("Simulate New Login Request", "simulate", "primary")}<ul class="records">${pending.map(row).join("") || "<li>No pending approvals match this view. Clear filters or simulate a request.</li>"}</ul>${
    approvals.length > pending.length
      ? `<details><summary>Decision history (${approvals.length - pending.length})</summary><ul class="records">${approvals
          .filter((a) => a.status !== "pending")
          .map(row)
          .join("")}</ul></details>`
      : ""
  }</section><section class="card"><h2>Sample users &amp; roles</h2><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>${data.users.map((u) => `<tr><td>${e(u.displayName)}</td><td>${e(u.email)}</td><td>${badge(u.role)}</td></tr>`).join("")}</tbody></table></section><section class="card"><h2>Active and recent sessions</h2>${[data.session, ...data.prefs.recentSessions].filter(Boolean).map(sessionDetails).join("") || "No active or recent sessions."}${btn("Log out", "logout")}</section></div><section id="print-audit">${auditReport(approvals, e)}</section>`;
}
export function filtered(rows, filters) {
  const query = filters.query.trim().toLowerCase();
  return rows.filter(
    (a) =>
      (a.userEmail.toLowerCase().includes(query) || a.requestId.toLowerCase().includes(query)) &&
      (!filters.status || filters.status === a.status) &&
      (!filters.role || filters.role === a.role)
  );
}
export const auditColumns = ["requestId", "userId", "userEmail", "role", "status", "createdAt"];
export function auditCsv(rows) {
  function cell(value) {
    const s = String(value);
    return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
  }
  return [auditColumns, ...rows.map((a) => auditColumns.map((k) => a[k]))]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}
export function downloadCsv(rows) {
  const url = URL.createObjectURL(new Blob([auditCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "authmatrix-audit.csv";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function auditReport(rows, e) {
  return (
    "<h1>AuthMatrix approval audit</h1><p>" +
    e(new Date().toLocaleString()) +
    " · " +
    rows.length +
    ' matching requests</p><table class="table"><thead><tr>' +
    auditColumns.map((k) => "<th>" + e(k) + "</th>").join("") +
    "</tr></thead><tbody>" +
    rows
      .map((a) => "<tr>" + auditColumns.map((k) => "<td>" + e(a[k]) + "</td>").join("") + "</tr>")
      .join("") +
    "</tbody></table>"
  );
}
export function auditControls(filters, e) {
  const select = (key, values) =>
    `<label for="filter-${key}">${key === "role" ? "Role" : "Status"}</label><select class="form-select" id="filter-${key}"><option value="">All</option>${values.map((v) => `<option value="${v}" ${filters[key] === v ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select>`;
  return `<section class="card"><h2>Find approval requests</h2><div class="filters"><div><label for="filter-query">Email or request ID</label><input class="form-control" id="filter-query" type="search" value="${e(filters.query)}"></div><div>${select("status", ["pending", "approved", "denied"])}</div><div>${select("role", ["student", "admin"])}</div></div><div class="actions"><button data-action="csv">Export CSV</button><button data-action="pdf">Export PDF</button></div></section>`;
}
