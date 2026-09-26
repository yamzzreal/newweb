"use strict";

const crypto = require("crypto");
const {
  privateDb,
  savePrivateDb,
  clean,
  id,
  hashPassword
} = require("./_common");
const { sendPushToUser } = require('../../push');

async function sendEmail(to, name, link) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESEND_FROM || "").trim();
  const app = String(process.env.APP_URL || "").trim();

  console.log("RESET EMAIL CONFIG:", {
    hasApiKey: Boolean(key),
    hasFrom: Boolean(from),
    hasAppUrl: Boolean(app),
    from,
    app
  });

  if (!key || !from || !app) {
    return {
      ok: false,
      error: "ENV RESEND_API_KEY, RESEND_FROM, atau APP_URL kosong."
    };
  }

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
body: JSON.stringify({
  from,
  to: [to],
  subject: "Reset Password • Yamzz Market",

  html: `
<!DOCTYPE html>
<html lang="id">

<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <!-- Font Awesome -->
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
  >
</head>

<body style="
  margin:0;
  padding:0;
  background:#020617;
  font-family:Arial,Helvetica,sans-serif;
  color:#e2e8f0;
">

  <!-- BACKGROUND -->
  <div style="
    width:100%;
    min-height:100vh;
    box-sizing:border-box;
    padding:40px 15px;

    background:
      radial-gradient(
        circle at 50% 0%,
        rgba(0,191,255,.22),
        transparent 38%
      ),
      radial-gradient(
        circle at 0% 50%,
        rgba(37,99,235,.12),
        transparent 35%
      ),
      linear-gradient(
        180deg,
        #020617 0%,
        #030712 100%
      );
  ">

    <!-- MAIN CARD -->
    <div style="
      width:100%;
      max-width:600px;
      margin:0 auto;

      background:#07101f;

      border:1px solid rgba(0,191,255,.35);

      border-radius:24px;

      overflow:hidden;

      box-shadow:
        0 0 15px rgba(0,191,255,.15),
        0 0 40px rgba(0,100,255,.10),
        inset 0 0 30px rgba(0,100,255,.03);
    ">

      <!-- ================================= -->
      <!-- HEADER -->
      <!-- ================================= -->

      <div style="
        padding:45px 25px;

        text-align:center;

        background:
          radial-gradient(
            circle at 50% 0%,
            rgba(0,191,255,.30),
            transparent 55%
          ),
          linear-gradient(
            135deg,
            #071a35,
            #020617
          );

        border-bottom:
          1px solid
          rgba(0,191,255,.25);
      ">

        <!-- LOGO ICON -->
<div style="
  width:70px;
  height:70px;
  margin:0 auto 20px;
  border-radius:20px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(0,191,255,.08);
  border:1px solid rgba(56,189,248,.40);
  box-shadow:
    0 0 15px rgba(0,191,255,.25),
    inset 0 0 15px rgba(0,191,255,.08);
">
  <i
    class="fa-solid fa-shield-halved"
    style="
      font-size:30px;
      color:#38bdf8;
    "
  ></i>
</div>

        <!-- BRAND -->

        <div style="
          font-size:13px;
          letter-spacing:4px;

          color:#38bdf8;

          font-weight:bold;

          margin-bottom:12px;

          text-shadow:
            0 0 10px
            rgba(56,189,248,.5);
        ">
          ✦ YAMZZ MARKET ✦
        </div>


        <!-- TITLE -->

        <div style="
          font-size:30px;

          font-weight:800;

          color:#ffffff;

          letter-spacing:1px;

          text-shadow:
            0 0 8px #00bfff,
            0 0 20px
            rgba(0,191,255,.65);
        ">
          RESET PASSWORD
        </div>


        <!-- LINE -->

        <div style="
          width:80px;
          height:3px;

          margin:20px auto 0;

          background:#00bfff;

          border-radius:10px;

          box-shadow:
            0 0 10px #00bfff,
            0 0 20px #00bfff;
        ">
        </div>

      </div>


      <!-- ================================= -->
      <!-- CONTENT -->
      <!-- ================================= -->

      <div style="
        padding:35px 28px;
      ">

        <!-- GREETING -->

        <p style="
          margin:0 0 18px;

          font-size:16px;

          color:#f1f5f9;
        ">

          Halo

          <strong style="
            color:#38bdf8;

            text-shadow:
              0 0 8px
              rgba(56,189,248,.4);
          ">
            ${String(name || "Pengguna").replace(/[<>]/g, "")}
          </strong>,

        </p>


        <!-- MESSAGE -->

        <p style="
          margin:0 0 25px;

          color:#94a3b8;

          font-size:15px;

          line-height:1.8;
        ">

          Kamu meminta untuk mengatur ulang
          password akun

          <strong style="
            color:#e0f2fe;
          ">
            Yamzz Market
          </strong>.

          Klik tombol di bawah untuk membuat
          password baru.

        </p>


        <!-- ================================= -->
        <!-- RESET BUTTON -->
        <!-- ================================= -->

        <div style="
          text-align:center;

          margin:32px 0;
        ">

          <a
            href="${link}"
            style="
              display:inline-block;

              padding:15px 32px;

              background:
                linear-gradient(
                  135deg,
                  #00bfff,
                  #2563eb
                );

              color:#ffffff;

              text-decoration:none;

              font-size:15px;

              font-weight:bold;

              border-radius:12px;

              letter-spacing:.5px;

              box-shadow:
                0 0 10px
                rgba(0,191,255,.55),

                0 0 30px
                rgba(37,99,235,.30);
            "
          >

            <i
              class="fa-solid fa-key"
              style="
                margin-right:7px;
              "
            ></i>

            RESET PASSWORD

          </a>

        </div>


        <!-- ================================= -->
        <!-- SECURITY INFO -->
        <!-- ================================= -->

        <div style="
          padding:18px;

          border-radius:14px;

          background:
            rgba(14,165,233,.07);

          border:
            1px solid
            rgba(56,189,248,.18);

          margin-top:25px;
        ">

          <div style="
            display:flex;
            align-items:flex-start;
          ">

            <i
              class="fa-solid fa-clock"
              style="
                color:#38bdf8;

                font-size:18px;

                margin-right:12px;

                margin-top:2px;

                text-shadow:
                  0 0 8px
                  rgba(56,189,248,.5);
              "
            ></i>


            <p style="
              margin:0;

              color:#94a3b8;

              font-size:13px;

              line-height:1.7;
            ">

              Link reset password ini berlaku selama

              <strong style="
                color:#38bdf8;
              ">
                15 menit
              </strong>

              dan hanya dapat digunakan satu kali.

            </p>

          </div>

        </div>


        <!-- ================================= -->
        <!-- WARNING -->
        <!-- ================================= -->

        <div style="
          margin-top:18px;

          padding:15px;

          border-radius:12px;

          background:
            rgba(15,23,42,.60);

          border:
            1px solid
            rgba(100,116,139,.15);
        ">

          <p style="
            margin:0;

            color:#64748b;

            font-size:12px;

            line-height:1.7;
          ">

            <i
              class="fa-solid fa-circle-info"
              style="
                color:#64748b;
                margin-right:5px;
              "
            ></i>

            Jika kamu tidak meminta reset password,
            abaikan email ini. Password akun kamu
            tidak akan berubah.

          </p>

        </div>

      </div>


      <!-- ================================= -->
      <!-- SOCIAL FOOTER -->
      <!-- ================================= -->

      <div style="
        padding:30px 20px;

        text-align:center;

        background:#030a16;

        border-top:
          1px solid
          rgba(0,174,255,.18);
      ">


        <!-- TITLE -->

        <div style="
          font-size:11px;

          letter-spacing:3px;

          color:#64748b;

          margin-bottom:18px;

          font-weight:bold;
        ">

          CONNECT WITH US

        </div>


        <!-- ================================= -->
        <!-- WHATSAPP -->
        <!-- ================================= -->

        <a
          href="https://whatsapp.com/channel/0029Vb8MeU77DAX6EcxG2c31"
          style="
            display:inline-block;

            margin:5px;

            padding:12px 17px;

            border:
              1px solid
              rgba(34,197,94,.45);

            border-radius:10px;

            background:
              rgba(34,197,94,.08);

            color:#4ade80;

            text-decoration:none;

            font-size:13px;

            font-weight:bold;

            box-shadow:
              0 0 12px
              rgba(34,197,94,.15);
          "
        >

          <i
            class="fa-brands fa-whatsapp"
            style="
              margin-right:6px;
              font-size:15px;
            "
          ></i>

          WhatsApp

        </a>


        <!-- ================================= -->
        <!-- YOUTUBE -->
        <!-- ================================= -->

        <a
          href="https://youtube.com/@yamzzmarket?si=IH_sc1iKHs0ZbofZ"
          style="
            display:inline-block;

            margin:5px;

            padding:12px 17px;

            border:
              1px solid
              rgba(239,68,68,.45);

            border-radius:10px;

            background:
              rgba(239,68,68,.08);

            color:#f87171;

            text-decoration:none;

            font-size:13px;

            font-weight:bold;

            box-shadow:
              0 0 12px
              rgba(239,68,68,.15);
          "
        >

          <i
            class="fa-brands fa-youtube"
            style="
              margin-right:6px;
              font-size:15px;
            "
          ></i>

          YouTube

        </a>


        <!-- ================================= -->
        <!-- INSTAGRAM -->
        <!-- ================================= -->

        <a
          href="https://www.instagram.com/_yannrmdn23?stkn=NG50bzExYzEyMHBx"
          style="
            display:inline-block;

            margin:5px;

            padding:12px 17px;

            border:
              1px solid
              rgba(168,85,247,.45);

            border-radius:10px;

            background:
              rgba(168,85,247,.08);

            color:#c084fc;

            text-decoration:none;

            font-size:13px;

            font-weight:bold;

            box-shadow:
              0 0 12px
              rgba(168,85,247,.15);
          "
        >

          <i
            class="fa-brands fa-instagram"
            style="
              margin-right:6px;
              font-size:15px;
            "
          ></i>

          Instagram

        </a>


        <!-- ================================= -->
        <!-- COPYRIGHT -->
        <!-- ================================= -->

        <div style="
          margin-top:25px;

          color:#334155;

          font-size:11px;
        ">

          <i
            class="fa-solid fa-shield-halved"
            style="
              margin-right:4px;
            "
          ></i>

          © ${new Date().getFullYear()}
          Yamzz Market

        </div>

      </div>

    </div>

  </div>

</body>

</html>
  `
})
      }
    );

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        raw: text
      };
    }

    console.log("RESEND RESPONSE:", {
      status: response.status,
      ok: response.ok,
      data
    });

    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.message ||
          data?.error ||
          data?.name ||
          `Resend API error (${response.status})`
      };
    }

    return {
      ok: true,
      id: data?.id || null
    };

  } catch (error) {
    console.error("RESEND REQUEST ERROR:", error);

    return {
      ok: false,
      error: error.message || "Gagal menghubungi Resend API."
    };
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const identity = String(
      req.body?.identity || ""
    ).trim().toLowerCase();

    if (!identity) {
      return res.status(400).json({
        error: "Username, WhatsApp, atau email wajib diisi."
      });
    }

    const db = await privateDb();

    const u = db.users.find(
      x =>
        String(x.username || "").toLowerCase() === identity ||
        String(x.whatsapp || "") === identity ||
        String(x.email || "").toLowerCase() === identity
    );

    if (u && u.email) {
      const raw = crypto
        .randomBytes(32)
        .toString("hex");

      db.passwordResets =
        Array.isArray(db.passwordResets)
          ? db.passwordResets
          : [];

      db.passwordResets = db.passwordResets.filter(
        x =>
          String(x.userId) !== String(u.id) &&
          new Date(x.expiresAt) > new Date()
      );

      db.passwordResets.push({
        id: id("pr"),
        userId: u.id,
        tokenHash: crypto
          .createHash("sha256")
          .update(raw)
          .digest("hex"),
        expiresAt: new Date(
          Date.now() + 15 * 60 * 1000
        ).toISOString(),
        used: false,
        createdAt: new Date().toISOString()
      });

      const app = String(
        process.env.APP_URL || ""
      ).trim().replace(/\/$/, "");

      const link =
        `${app}/reset-password.html?token=` +
        encodeURIComponent(raw);

      const sent = await sendEmail(
        u.email,
        u.name,
        link
      );

      if (!sent.ok) {
        console.error(
          "FORGOT PASSWORD EMAIL FAILED:",
          sent.error
        );

        return res.status(503).json({
          error: `Gagal mengirim email reset password: ${sent.error}`
        });
      }

      await savePrivateDb(db);
      await sendPushToUser(db, u.id, {
        title: "Permintaan reset password",
        body: "Link reset password telah dikirim ke email akun kamu.",
        data: { type: "password_reset_requested", link: "login.html" }
      });

      return res.json({
        success: true,
        message:
          "Link reset password telah dikirim ke email akun."
      });
    }

    return res.json({
      success: true,
      message:
        "Jika data cocok dan email tersedia, link reset password telah dikirim ke email akun."
    });

  } catch (e) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      e
    );

    return res.status(500).json({
      error:
        e.message ||
        "Gagal memproses reset password."
    });
  }
};
