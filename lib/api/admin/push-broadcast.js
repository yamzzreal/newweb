"use strict";

const crypto = require("crypto");
const { requireAdmin } = require("./_common");
const { privateDb, savePrivateDb, clean } = require("../auth/_common");

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON belum dikonfigurasi.");
  const data = JSON.parse(raw);
  if (!data.project_id || !data.client_email || !data.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON tidak lengkap.");
  }
  return data;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

async function googleAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(sa.private_key, "base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Gagal mendapatkan token Firebase.");
  }
  return data.access_token;
}

async function sendOne(accessToken, projectId, device, title, body, link) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          token: device.token,
          notification: { title, body },
          data: { link: String(link || "produk.html") },
          android: {
            priority: "HIGH",
            notification: {
              sound: "default"
            }
          }
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

module.exports = async (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Admin session tidak valid." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const title = clean(req.body?.title || "Promo Yamzz Market", 100);
    const body = clean(req.body?.body || "Ada promo atau diskon terbaru di Yamzz Market.", 500);
    const link = clean(req.body?.link || "produk.html", 500);

    const sa = serviceAccount();
    const accessToken = await googleAccessToken(sa);
    const db = await privateDb();
    db.pushDevices = Array.isArray(db.pushDevices) ? db.pushDevices : [];

    const devices = db.pushDevices.filter(x => x?.token && x.active !== false);
    let sent = 0;
    let failed = 0;
    const invalid = new Set();

    for (let i = 0; i < devices.length; i += 25) {
      const chunk = devices.slice(i, i + 25);
      const results = await Promise.all(
        chunk.map(device => sendOne(accessToken, sa.project_id, device, title, body, link))
      );

      results.forEach((result, index) => {
        if (result.ok) {
          sent++;
          return;
        }
        failed++;
        const err = JSON.stringify(result.data || "");
        if (/UNREGISTERED|INVALID_ARGUMENT|registration-token-not-registered/i.test(err)) {
          invalid.add(chunk[index].hash);
        }
      });
    }

    if (invalid.size) {
      db.pushDevices = db.pushDevices.filter(x => !invalid.has(x.hash));
      await savePrivateDb(db);
    }

    return res.json({ success: true, sent, failed, removed: invalid.size });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Gagal mengirim notifikasi." });
  }
};
