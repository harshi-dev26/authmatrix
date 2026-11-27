import {
  createHash,
  createHmac,
  timingSafeEqual,
  verify,
  randomUUID,
  randomBytes,
} from "node:crypto";

import { get, put } from "@vercel/blob";
import accounts, { issuer } from "../server/accounts.js";
async function serverKey() {
  const name = "config/live-key-v1";
  const current = await get(name, { access: "private", useCache: false });
  if (current) return new Response(current.stream).text();
  const key = randomBytes(48).toString("base64url");
  try {
    await put(name, key, { access: "private", addRandomSuffix: false, allowOverwrite: false });
    return key;
  } catch (error) {
    const winner = await get(name, { access: "private", useCache: false });
    if (winner) return new Response(winner.stream).text();
    throw error;
  }
}
function accountSecret(id, key) {
  const input = createHmac("sha256", key)
    .update("totp:" + id)
    .digest()
    .subarray(0, 20);
  let buf = 0,
    bits = 0,
    output = "";
  for (const byte of input) {
    buf = (buf << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[(buf >> bits) & 31];
    }
  }
  return output;
}

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
function equal(a, b) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function sign(data, key) {
  return createHmac("sha256", key).update(data).digest("base64url");
}
function profile({ id, name, email, role }) {
  return { id, name, email, role };
}
function issue(user, key) {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, expires: Date.now() + 4 * 3600000, nonce: randomUUID() })
  ).toString("base64url");
  return payload + "." + sign(payload, key);
}
function authenticate(req, config) {
  const [payload, sig] = String(req.headers.authorization || "")
    .replace(/^Bearer /, "")
    .split(".");
  if (!payload || !sig || !equal(sign(payload, config.key), sig)) fail(401, "Sign in again.");
  const claims = JSON.parse(Buffer.from(payload, "base64url"));
  const user = config.accounts.find((u) => u.id === claims.sub);
  if (!user || claims.expires <= Date.now()) fail(401, "Session expired. Sign in again.");
  return user;
}
function totp(secret) {
  let bits = 0,
    buf = 0;
  const key = [];
  for (const c of secret) {
    buf = (buf << 5) | "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      key.push((buf >> bits) & 255);
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", Buffer.from(key)).update(counter).digest();
  return String((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1000000).padStart(6, "0");
}
const filename = (id) => "access/v1/" + id + ".json";
async function read(id) {
  const result = await get(filename(id), { access: "private", useCache: false });
  if (!result) return { rows: [], etag: null };
  return { rows: await new Response(result.stream).json(), etag: result.blob.etag };
}
async function save(id, rows, etag) {
  try {
    await put(filename(id), JSON.stringify(rows), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: Boolean(etag),
      ...(etag ? { ifMatch: etag } : {}),
      contentType: "application/json",
    });
  } catch (err) {
    if (err.name === "BlobPreconditionFailedError" || /already exists/i.test(err.message))
      fail(409, "Request changed. Refresh and try again.");
    throw err;
  }
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    if (req.method !== "POST") fail(405, "Use POST.");
    const config = { accounts, key: await serverKey() };
    const body = req.body || {};
    const { action } = body;
    if (action === "login") {
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const user = config.accounts.find((u) => u.email === email);
      const pass = String(body.password || "").trim();
      const assignedPassword =
        user && equal(createHash("sha256").update(pass).digest("hex"), user.passwordHash);
      const signedPass =
        user &&
        pass.length === 86 &&
        verify(
          null,
          Buffer.from("authmatrix-live/v1/" + email),
          issuer,
          Buffer.from(pass, "base64url")
        );
      if (!assignedPassword && !signedPass) fail(401, "Invalid email or password.");
      return res.json({ user: profile(user), token: issue(user, config.key) });
    }
    const user = authenticate(req, config);
    if (action === "authenticator")
      return res.json({
        userId: user.id,
        secret: accountSecret(user.id, config.key),
        periodSeconds: 30,
      });
    if (action === "verify")
      return res.json({
        valid: equal(
          totp(accountSecret(user.id, config.key)),
          String(body.code || "").replace(/ /g, "")
        ),
      });
    if (action === "list") {
      const owners =
        user.role === "admin" ? config.accounts.filter((u) => u.role === "student") : [user];
      const sets = await Promise.all(owners.map((s) => read(s.id)));
      return res.json({
        requests: sets
          .flatMap((s) => s.rows)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      });
    }
    if (action === "submit" || action === "lab") {
      if (user.role !== "student") fail(403, "Student access only.");
      const { rows, etag } = await read(user.id);
      if (action === "lab") {
        if (rows[0]?.status !== "approved") fail(403, "Project Lab access requires approval.");
        return res.json({
          message: "Project Lab workspace",
          assignment: "Design a sign-in flow and document how you tested its access rules.",
        });
      }
      const reason = String(body.reason || "").trim();
      if (reason.length < 1 || reason.length > 500)
        fail(400, "Enter a reason of 1–500 characters.");
      if (rows[0]?.status === "pending") fail(409, "You already have a pending request.");
      const request = {
        requestId: randomUUID(),
        userId: user.id,
        userEmail: user.email,
        name: user.name,
        role: user.role,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      await save(user.id, [request, ...rows], etag);
      return res.status(201).json({ request });
    }
    if (action === "decide") {
      if (user.role !== "admin") fail(403, "Admin access required.");
      if (!["approved", "denied"].includes(body.status)) fail(400, "Invalid decision.");
      const owner = config.accounts.find((u) => u.id === body.userId && u.role === "student");
      if (!owner) fail(404, "Student not found.");
      const { rows, etag } = await read(owner.id);
      const request = rows.find((r) => r.requestId === body.requestId);
      if (!request) fail(404, "Request not found.");
      if (request.status !== "pending") fail(409, "This request already has a decision.");
      Object.assign(request, {
        status: body.status,
        decidedAt: new Date().toISOString(),
        decidedBy: user.email,
      });
      await save(owner.id, rows, etag);
      return res.json({ request });
    }
    fail(400, "Unknown action.");
  } catch (err) {
    return res
      .status(err.status || 503)
      .json({ error: err.status ? err.message : "Service unavailable. Please retry shortly." });
  }
}
