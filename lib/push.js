"use strict";

const crypto = require("crypto");

function clean(v, max = 500) {
  return String(v ?? "").trim().slice(0, max);
}

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

async function sendFcm(accessToken, projectId, device, title, body, data = {}) {
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
          data: Object.fromEntries(
            Object.entries({ ...data, link: data.link || "akun.html#notifications" })
              .map(([key, value]) => [String(key), String(value ?? "")])
          ),
          android: {
            priority: "HIGH",
            notification: { sound: "default" }
          }
        }
      })
    }
  );

  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, data: result };
}

async function sendPushToUser(db, userId, { title, body, data = {} } = {}) {
  if (!db || !userId || !title || !body) return { sent: 0, failed: 0, removed: 0 };

  db.pushDevices = Array.isArray(db.pushDevices) ? db.pushDevices : [];
  const devices = db.pushDevices.filter(
    x => x?.token && x.active !== false && String(x.userId || "") === String(userId)
  );

  if (!devices.length) return { sent: 0, failed: 0, removed: 0 };

  try {
    const sa = serviceAccount();
    const accessToken = await googleAccessToken(sa);
    let sent = 0;
    let failed = 0;
    const invalid = new Set();

    for (const device of devices) {
      const result = await sendFcm(accessToken, sa.project_id, device, clean(title, 100), clean(body, 500), data);
      if (result.ok) {
        sent++;
        continue;
      }
      failed++;
      const err = JSON.stringify(result.data || "");
      if (/UNREGISTERED|INVALID_ARGUMENT|registration-token-not-registered/i.test(err)) {
        invalid.add(device.hash);
      }
    }

    if (invalid.size) {
      db.pushDevices = db.pushDevices.filter(x => !invalid.has(x.hash));
    }

    return { sent, failed, removed: invalid.size };
  } catch (error) {
    console.error("DEVICE PUSH ERROR:", error);
    return { sent: 0, failed: devices.length, removed: 0, error: error.message };
  }
}

module.exports = { sendPushToUser };
