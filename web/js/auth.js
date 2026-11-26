export function validateLogin(email, password) {
  return {
    email: !email
      ? "Enter your email address."
      : !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) || email.split("@").length !== 2
        ? "Enter a valid email address."
        : "",
    password: password ? "" : "Enter your password.",
  };
}
export function checkCredentials(users, email, password) {
  return users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.passwordHash === "educational-placeholder:" + password
  );
}
export function partnerProfile(user) {
  return {
    provider: "Northstar Identity",
    externalId: "northstar-" + user.userId,
    displayName: user.displayName,
    role: user.role,
  };
}
export class SessionManager {
  constructor(store) {
    this.store = store;
  }
  get user() {
    const { session, users } = this.store.data;
    return (
      session?.status === "active" &&
      users.find((u) => u.userId === session.userId && u.role === session.role)
    );
  }
  start(user) {
    const { session, prefs } = this.store.data;
    const previous = session ? [session, ...prefs.recentSessions] : prefs.recentSessions;
    return this.store.write({
      prefs: { ...prefs, recentSessions: previous },
      session: {
        sessionId: crypto.randomUUID(),
        userId: user.userId,
        role: user.role,
        createdAt: new Date().toISOString(),
        status: "active",
      },
    });
  }
  end() {
    const { session, prefs } = this.store.data;
    if (!this.user) return false;
    return this.store.write({
      session: { ...session, status: "ended" },
      prefs: {
        ...prefs,
        recentSessions: prefs.recentSessions.map((s) =>
          s.userId === session.userId ? { ...s, status: "ended" } : s
        ),
      },
    });
  }
  revoke(id) {
    const user = this.user;
    const { session, prefs } = this.store.data;
    const target = [session, ...prefs.recentSessions].find(
      (s) => s?.sessionId === id && s.status === "active"
    );
    if (!user || !target || (target.userId !== user.userId && user.role !== "admin")) return false;
    if (target === session) return this.store.write({ session: { ...session, status: "ended" } });
    return this.store.write({
      prefs: {
        ...prefs,
        recentSessions: prefs.recentSessions.map((s) =>
          s.sessionId === id ? { ...s, status: "ended" } : s
        ),
      },
    });
  }
}
