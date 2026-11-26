const fallback = {
  users: [
    {
      userId: "stu-001",
      email: "maya@example.test",
      displayName: "Maya Rao",
      role: "student",
      passwordHash: "educational-placeholder:StudentDemo1",
      createdAt: "2026-01-01T09:00:00Z",
    },
    {
      userId: "adm-001",
      email: "alex@example.test",
      displayName: "Alex Chen",
      role: "admin",
      passwordHash: "educational-placeholder:AdminDemo1",
      createdAt: "2026-01-01T09:00:00Z",
    },
  ],
  approvals: [
    {
      requestId: "req-001",
      userId: "stu-001",
      userEmail: "maya@example.test",
      role: "student",
      status: "pending",
      createdAt: "2026-01-02T10:00:00Z",
    },
  ],
  totpSecrets: [
    { userId: "stu-001", secret: "IF2XI2CNMF2HE2LYFVSGK3LPFVZXI5LEMVXHI", periodSeconds: 30 },
    { userId: "adm-001", secret: "IF2XI2CNMF2HE2LYFVSGK3LPFVQWI3LJNY", periodSeconds: 30 },
  ],
};
const keys = ["users", "session", "approvals", "prefs"];
const roleOk = (value) => ["student", "admin"].includes(value);
const strings = (value, fields) =>
  fields.every((key) => typeof value?.[key] === "string" && value[key].length);
function sessionOk(s, users) {
  return (
    strings(s, ["sessionId", "userId", "createdAt"]) &&
    Number.isFinite(Date.parse(s.createdAt)) &&
    ["active", "ended"].includes(s.status) &&
    users.some((u) => u.userId === s.userId && u.role === s.role)
  );
}
function valid(data) {
  const { users, session, approvals, prefs } = data;
  return (
    Array.isArray(users) &&
    ["admin", "student"].every((role) => users.some((u) => u?.role === role)) &&
    users.every(
      (u) =>
        strings(u, ["userId", "email", "displayName", "passwordHash", "createdAt"]) &&
        roleOk(u.role)
    ) &&
    (session === null || sessionOk(session, users)) &&
    Array.isArray(approvals) &&
    approvals.every(
      (a) =>
        strings(a, ["requestId", "userId", "userEmail", "createdAt"]) &&
        roleOk(a.role) &&
        ["pending", "approved", "denied"].includes(a.status)
    ) &&
    Array.isArray(prefs?.recentSessions) &&
    prefs.recentSessions.every((s) => sessionOk(s, users))
  );
}
export class LocalDataStore {
  seed = fallback;
  defaults() {
    return {
      users: structuredClone(this.seed.users),
      session: null,
      approvals: structuredClone(this.seed.approvals),
      prefs: { recentSessions: [] },
    };
  }
  async init() {
    try {
      const response = await fetch("./data/sample-data.json");
      if (response.ok) {
        const seed = await response.json();
        if (
          valid({
            users: seed.users,
            session: null,
            approvals: seed.approvals,
            prefs: { recentSessions: [] },
          })
        )
          this.seed = seed;
      }
    } catch {
      /* Direct-file and offline launches use the bundled sample. */
    }
    this.load();
  }
  load() {
    try {
      const raw = keys.map((k) => localStorage.getItem("authmatrix_" + k));
      if (raw.every((x) => x === null)) {
        this.reset();
        return;
      }
      if (raw.some((x) => x === null)) throw Error();
      const next = Object.fromEntries(keys.map((k, i) => [k, JSON.parse(raw[i])]));
      if (!valid(next)) throw Error();
      this.data = next;
      this.error = false;
    } catch {
      this.fail();
    }
  }
  fail() {
    this.error = true;
    this.data = this.defaults();
  }
  write(changes) {
    try {
      for (const [k, v] of Object.entries(changes))
        localStorage.setItem("authmatrix_" + k, JSON.stringify(v));
      Object.assign(this.data, changes);
      this.error = false;
      return true;
    } catch {
      this.fail();
      return false;
    }
  }
  reset() {
    this.data = this.defaults();
    return this.write(this.data);
  }
}
