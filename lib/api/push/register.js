"use strict";

const crypto = require("crypto");
const { privateDb, savePrivateDb, clean, id, bearer, readToken } = require("../auth/_common");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = clean(req.body?.token, 4096);
    const platform = clean(req.body?.platform || "android", 30);
    if (!token || token.length < 20) {
      return res.status(400).json({ error: "Token perangkat tidak valid." });
    }

    const db = await privateDb();
    db.pushDevices = Array.isArray(db.pushDevices) ? db.pushDevices : [];

    const session = readToken(bearer(req));
    const userId = session?.uid ? String(session.uid) : "";

    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date().toISOString();

    const existing = db.pushDevices.find(x => x.hash === hash);
    if (existing) {
      existing.token = token;
      existing.platform = platform;
      existing.userId = userId || existing.userId || "";
      existing.updatedAt = now;
      existing.active = true;
    } else {
      db.pushDevices.unshift({
        id: id("push"),
        hash,
        token,
        platform,
        userId,
        active: true,
        createdAt: now,
        updatedAt: now
      });
    }

    db.pushDevices = db.pushDevices
      .filter(x => x && x.token && x.active !== false)
      .slice(0, 10000);

    await savePrivateDb(db);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Gagal mendaftarkan perangkat." });
  }
};
