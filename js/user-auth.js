"use strict";

const AUTH_TOKEN_KEY = "yamzz_user_token";

const $ = s => document.querySelector(s);

let USER = null;
let WALLET = null;


/* =====================================================
   AUTH / API
   ===================================================== */

function token() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

async function api(path, opt = {}) {
  const headers = {
    ...(opt.headers || {}),
    Authorization: `Bearer ${token()}`
  };

  if (opt.body) {
    headers["Content-Type"] = "application/json";
  }

  const r = await fetch(path, {
    ...opt,
    headers
  });

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(d.error || "Terjadi kesalahan.");
  }

  return d;
}


/* =====================================================
   HELPERS
   ===================================================== */

function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}

function rupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

function date(v) {
  const d = new Date(v);

  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short"
      });
}

function setError(id, msg) {
  const e = $(id);

  if (e) {
    e.textContent = msg || "";
  }
}


/* =====================================================
   LOGIN / REGISTER VIEW
   ===================================================== */

function showAuth(tab = "login") {

  const authView = $("#authView");
  const profileView = $("#profileView");

  if (authView) {
    authView.hidden = false;
  }

  if (profileView) {
    profileView.hidden = true;
  }

  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");
  const loginTab = $("#loginTab");
  const registerTab = $("#registerTab");

  if (loginForm) {
    loginForm.hidden = tab !== "login";
  }

  if (registerForm) {
    registerForm.hidden = tab !== "register";
  }

  if (loginTab) {
    loginTab.classList.toggle(
      "active",
      tab === "login"
    );
  }

  if (registerTab) {
    registerTab.classList.toggle(
      "active",
      tab === "register"
    );
  }
}


/* =====================================================
   LOAD USER
   ===================================================== */

async function loadMe() {

  try {

    const d = await api("/api/auth/me");

    USER = d.user;
    USER.upgradeSettings = d.upgrade || {};

    renderProfile();

    return true;

  } catch {

    return false;
  }
}


/* =====================================================
   RENDER PROFILE
   ===================================================== */

function renderProfile() {

  const authView = $("#authView");
  const profileView = $("#profileView");

  if (authView) {
    authView.hidden = true;
  }

  if (profileView) {
    profileView.hidden = false;
  }

  const profileName = $("#profileName");
  const profileMeta = $("#profileMeta");
  const profileType = $("#profileType");

  if (profileName) {
    profileName.textContent =
      USER.name || USER.username;
  }

  if (profileMeta) {
    profileMeta.textContent =
      `@${USER.username} • ${USER.whatsapp}`;
  }

  if (profileType) {

    profileType.textContent =
      USER.type === "reseller"
        ? "RESELLER"
        : "CUSTOMER";

    profileType.style.color =
      USER.type === "reseller"
        ? "#7cf7b1"
        : "#ffc107";
  }

  const resellerBox = $("#resellerBox");

  if (resellerBox) {
    if (USER.type === "reseller") {
      const expires = USER.resellerExpiresAt ? date(USER.resellerExpiresAt) : "Permanen";
      resellerBox.innerHTML = `
        <strong><i class="fa-solid fa-crown"></i> Akun Reseller aktif</strong>
        <p style="color:#91a7bf;font-size:12px;margin:7px 0 0">Mulai ${date(USER.resellerAt)} • Masa aktif: ${esc(USER.resellerPlan || "Reseller")}</p>
        <p style="color:#7cf7b1;font-size:12px;margin:5px 0 0"><i class="fa-solid fa-clock"></i> Berlaku sampai: ${esc(expires)}</p>
      `;
    } else {
      const up = USER.upgradeSettings || {};
      const mode = up.mode === "permanent" ? "Permanen" : `${Number(up.value)||30} ${{days:"hari",months:"bulan",years:"tahun"}[up.mode]||"hari"}`;
      resellerBox.innerHTML = `
        <strong><i class="fa-solid fa-user"></i> Akun Customer</strong>
        <p style="color:#91a7bf;font-size:12px;margin:7px 0 0">Upgrade Reseller: ${rupiah(up.price || 0)} • Masa aktif ${esc(mode)}.</p>
      `;
    }
  }

  const upgradeDescription = $("#upgradeDescription");
  if (upgradeDescription) {
    const up = USER.upgradeSettings || {};
    const mode = up.mode === "permanent" ? "Permanen" : `${Number(up.value)||30} ${{days:"hari",months:"bulan",years:"tahun"}[up.mode]||"hari"}`;
    upgradeDescription.textContent = `Harga upgrade ${rupiah(up.price || 0)} • Masa aktif ${mode}. Gunakan saldo jika cukup; jika tidak, tersedia pembayaran QRIS.`;
  }

  const upgradeBox = $("#upgradeBox");

  if (upgradeBox) {
    upgradeBox.hidden =
      USER.type === "reseller";
  }

  const settingName = $("#settingName");
  const settingUsername = $("#settingUsername");
  const settingWhatsapp = $("#settingWhatsapp");
  const settingEmail = $("#settingEmail");

  if (settingName) {
    settingName.textContent =
      USER.name || USER.username;
  }

  if (settingUsername) {
    settingUsername.textContent =
      "@" + (USER.username || "-");
  }

  if (settingWhatsapp) {
    settingWhatsapp.textContent =
      USER.whatsapp || "-";
  }

  if (settingEmail) {
    settingEmail.textContent =
      USER.email || "Belum diisi";
  }

  loadNotifications();
  loadChat();
  loadWallet();
  loadTransactions();
}


/* =====================================================
   LOGIN
   ===================================================== */

async function doLogin(e) {

  e.preventDefault();

  setError("#loginError", "");

  const b = e.submitter;

  if (b) {
    b.disabled = true;
  }

  try {

    const d = await fetch(
      "/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identity:
            $("#loginIdentity")?.value.trim(),

          password:
            $("#loginPassword")?.value
        })
      }
    );

    const j = await d.json();

    if (!d.ok) {
      throw new Error(
        j.error || "Login gagal."
      );
    }

    localStorage.setItem(
      AUTH_TOKEN_KEY,
      j.token
    );

    USER = j.user;

    renderProfile();

  } catch (x) {

    setError(
      "#loginError",
      x.message
    );

  } finally {

    if (b) {
      b.disabled = false;
    }
  }
}


/* =====================================================
   REGISTER
   ===================================================== */

async function doRegister(e) {

  e.preventDefault();

  setError("#regError", "");

  const b = e.submitter;

  if (b) {
    b.disabled = true;
  }

  try {

    const r = await fetch(
      "/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name:
            $("#regName")?.value.trim(),

          username:
            $("#regUsername")?.value.trim(),

          whatsapp:
            $("#regWhatsapp")?.value.trim(),

          email:
            $("#regEmail")?.value.trim(),

          password:
            $("#regPassword")?.value
        })
      }
    );

    const d = await r.json();

    if (!r.ok) {
      throw new Error(
        d.error || "Gagal membuat akun."
      );
    }

    localStorage.setItem(
      AUTH_TOKEN_KEY,
      d.token
    );

    USER = d.user;
    USER.upgradeSettings = d.upgrade || {};

    renderProfile();

  } catch (x) {

    setError(
      "#regError",
      x.message
    );

  } finally {

    if (b) {
      b.disabled = false;
    }
  }
}


/* =====================================================
   NOTIFICATIONS
   ===================================================== */

async function loadNotifications() {

  const c = $("#notificationList");

  if (!c) {
    return;
  }

  try {

    const d = await api(
      "/api/auth/notifications"
    );

    const a = d.notifications || [];

    c.innerHTML = a.length
      ? a.map(n =>
          `
          <div class="notif ${n.read ? "" : "unread"}">

            <b>
              ${esc(n.title)}
            </b>

            <span>
              ${esc(n.message)}
            </span>

            <time>
              ${date(n.createdAt)}
            </time>

          </div>
          `
        ).join("")
      : `
        <div class="empty">
          Belum ada notifikasi.
        </div>
        `;

  } catch (e) {

    c.innerHTML =
      `
      <div class="empty">
        ${esc(e.message)}
      </div>
      `;
  }
}


/* =====================================================
   CHAT
   ===================================================== */

async function loadChat() {

  const c = $("#chatList");

  if (!c) {
    return;
  }

  try {

    const d = await api(
      "/api/auth/chat"
    );

    const a = d.messages || [];

    c.innerHTML = a.length
      ? a.map(m =>
          `
          <div class="bubble ${m.sender === "user" ? "user" : ""}">

            ${esc(m.message)}

            <small>
              ${m.sender === "user" ? "Kamu" : "Admin"}
              • ${date(m.createdAt)}
            </small>

          </div>
          `
        ).join("")
      : `
        <div class="empty">
          Belum ada pesan.
          Kirim pesan jika perlu bantuan admin.
        </div>
        `;

    c.scrollTop = c.scrollHeight;

  } catch (e) {

    c.innerHTML =
      `
      <div class="empty">
        ${esc(e.message)}
      </div>
      `;
  }
}


/* =====================================================
   TRANSACTIONS
   ===================================================== */

async function loadTransactions() {

  const c = $("#transactionList");

  if (!c) {
    return;
  }

  try {

    const d = await api(
      "/api/auth/transactions"
    );

    const a = d.transactions || [];

    c.innerHTML = a.length
      ? a.map(x => {

          const status =
            String(x.status || "")
              .toLowerCase();

          const label =
            status === "paid"
              ? "BERHASIL"
              : status === "cancelled" ||
                status === "rejected"
                ? "DITOLAK"
                : status.toUpperCase();

          return `
            <div class="notif">

              <b>
                ${esc(x.product)}
              </b>

              <span>
                ${esc(x.id)}
                •
                ${esc(x.paymentMethod)}
              </span>

              <strong>
                ${rupiah(x.price)}
              </strong>

              <span>
                Status: ${esc(label)}
              </span>

              <time>
                ${date(x.createdAt)}
              </time>

              ${
                x.deliveryLink
                  ? `
                    <a
                      class="setting-link"
                      style="margin-top:9px"
                      href="${esc(x.deliveryLink)}"
                      target="_blank"
                      rel="noopener"
                    >
                      <i class="fa-solid fa-link"></i>
                      Buka produk
                    </a>
                  `
                  : ""
              }

            </div>
          `;

        }).join("")
      : `
        <div class="empty">
          Belum ada transaksi pembelian.
        </div>
        `;

  } catch (e) {

    c.innerHTML =
      `
      <div class="empty">
        ${esc(e.message)}
      </div>
      `;
  }
}


/* =====================================================
   WALLET
   ===================================================== */

async function loadWallet() {

  const balanceEl =
    $("#walletBalance");

  const info =
    $("#walletInfo");

  const hist =
    $("#walletHistory");

  if (!balanceEl) {
    return;
  }

  try {

    const d = await api(
      "/api/wallet/me"
    );

    WALLET = d;

    balanceEl.textContent =
      rupiah(d.user.balance);

    if (info) {

      info.textContent =
        `Minimal top up ${rupiah(d.settings.minTopup)}` +
        ` • Minimal penarikan ${rupiah(d.settings.minWithdraw)}` +
        `${
          Number(d.settings.feeWithdraw)
            ? ` • Biaya penarikan ${rupiah(d.settings.feeWithdraw)}`
            : ""
        }`;
    }

    const tm =
      (d.settings.topupMethods || [])
        .filter(
          x => x.enabled !== false
        );

    const wm =
      (d.settings.withdrawMethods || [])
        .filter(
          x => x.enabled !== false
        );

    const ts =
      $("#topupMethod");

    const ws =
      $("#withdrawMethod");

    if (ts) {

      ts.innerHTML =
        tm.map(x =>
          `
          <option value="${esc(x.id)}">
            ${esc(x.name)}
          </option>
          `
        ).join("");
    }

    if (ws) {

      ws.innerHTML =
        wm.map(x =>
          `
          <option value="${esc(x.id)}">
            ${esc(x.name)}
          </option>
          `
        ).join("");
    }

    renderManualPayment();

    const entries =
      [...(d.ledger || [])]
        .slice(0, 30);

    if (hist) {

      hist.innerHTML =
        entries.length
          ? entries.map(x =>
              `
              <div class="notif">

                <b>
                  ${esc(x.type)}
                </b>

                <span>
                  ${esc(x.note)}
                </span>

                <strong
                  style="color:${
                    Number(x.amount) >= 0
                      ? "#7cf7b1"
                      : "#ff9b9b"
                  }"
                >

                  ${
                    Number(x.amount) >= 0
                      ? "+"
                      : ""
                  }

                  ${rupiah(x.amount)}

                </strong>

                <time>
                  ${date(x.createdAt)}
                </time>

              </div>
              `
            ).join("")
          : `
            <div class="empty">
              Belum ada riwayat wallet.
            </div>
            `;
    }

  } catch (e) {

    balanceEl.textContent =
      "Rp0";

    if (info) {
      info.textContent =
        e.message;
    }
  }
}


/* =====================================================
   MANUAL PAYMENT
   ===================================================== */

function renderManualPayment() {

  if (!WALLET) {
    return;
  }

  const method =
    $("#topupMethod")?.value;

  const box =
    $("#manualPaymentInfo");

  const proof =
    $("#topupProof");

  const file =
    $("#topupProofFile");

  if (!box) {
    return;
  }

  if (method === "qris") {

    box.hidden = true;

    if (proof) {
      proof.hidden = true;
    }

    if (file) {
      file.hidden = true;
    }

    return;
  }

  const m =
    (WALLET.settings.topupMethods || [])
      .find(
        x =>
          String(x.id) ===
          String(method)
      ) || {};

  box.hidden = false;

  box.innerHTML =
    `
    <b>
      ${esc(
        m.name ||
        String(method || "").toUpperCase()
      )}
    </b>

    <br>

    Nomor:
    <strong>
      ${esc(
        m.number ||
        "Belum diatur admin"
      )}
    </strong>

    <br>

    Atas nama:
    ${esc(m.holder || "-")}

    <br>

    <small>
      Transfer sesuai nominal,
      lalu kirim bukti pembayaran.
    </small>
    `;

  if (proof) {
    proof.hidden = false;
  }

  if (file) {
    file.hidden = false;
  }
}


/* =====================================================
   UPLOAD BUKTI WALLET
   ===================================================== */

async function uploadWalletProof(file) {

  if (!file) {
    return "";
  }

  const c =
    WALLET?.cloudinary;

  if (
    !c?.cloudName ||
    !c?.uploadPreset
  ) {

    throw new Error(
      "Cloudinary upload belum dikonfigurasi admin. " +
      "Masukkan URL bukti pembayaran secara manual."
    );
  }

  if (
    file.size >
    5 * 1024 * 1024
  ) {

    throw new Error(
      "Bukti maksimal 5 MB."
    );
  }

  const form =
    new FormData();

  form.append(
    "file",
    file
  );

  form.append(
    "upload_preset",
    c.uploadPreset
  );

  const r =
    await fetch(
      `https://api.cloudinary.com/v1_1/${
        encodeURIComponent(
          c.cloudName
        )
      }/image/upload`,
      {
        method: "POST",
        body: form
      }
    );

  const d =
    await r.json()
      .catch(() => ({}));

  if (!r.ok) {

    throw new Error(
      d?.error?.message ||
      "Upload bukti gagal."
    );
  }

  return d.secure_url || "";
}


/* =====================================================
   CREATE TOPUP
   ===================================================== */

async function createTopup() {

  const btn =
    $("#topupBtn");

  const amount =
    Math.floor(
      Number(
        $("#topupAmount")?.value
      )
    );

  const method =
    $("#topupMethod")?.value;

  if (!btn) {
    return;
  }

  btn.disabled = true;

  try {

    let proofUrl =
      $("#topupProof")?.value.trim() || "";

    if (
      method !== "qris" &&
      !proofUrl
    ) {

      const f =
        $("#topupProofFile")
          ?.files?.[0];

      if (f) {

        proofUrl =
          await uploadWalletProof(f);
      }
    }

    if (
      method !== "qris" &&
      !proofUrl
    ) {

      throw new Error(
        "Bukti pembayaran wajib untuk DANA/SeaBank."
      );
    }

    const d =
      await api(
        "/api/wallet/topup",
        {
          method: "POST",

          body:
            JSON.stringify({
              amount,
              method,
              proofUrl
            })
        }
      );

    const r =
      $("#topupResult");

    if (!r) {
      return;
    }

    if (method === "qris") {

      r.innerHTML =
        `
        <div class="pay-info">

          Bayar
          ${rupiah(d.payment.amount)}

          sebelum
          ${date(d.payment.expiredAt)}.

        </div>

        <img
          class="qr"
          src="https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(d.payment.qrString)}"
          alt="QRIS Top Up"
        >

        <button
          id="checkTopup"
          class="primary"
          style="width:100%;margin-top:10px"
        >
          Cek Pembayaran
        </button>
        `;

      const check =
        $("#checkTopup");

      if (check) {

        check.onclick =
          () =>
            checkTopup(
              d.payment.transactionId
            );
      }

    } else {

      r.innerHTML =
        `
        <div class="pay-info">

          Top up manual dibuat.
          Admin akan memverifikasi
          bukti pembayaran.

        </div>
        `;
    }

    const amountInput =
      $("#topupAmount");

    if (amountInput) {
      amountInput.value = "";
    }

    await loadWallet();

  } catch (e) {

    const result =
      $("#topupResult");

    if (result) {

      result.innerHTML =
        `
        <div class="empty">
          ${esc(e.message)}
        </div>
        `;
    }

  } finally {

    btn.disabled = false;
  }
}


/* =====================================================
   CHECK TOPUP
   ===================================================== */

async function checkTopup(tid) {

  try {

    const d =
      await api(
        "/api/wallet/topup-status",
        {
          method: "POST",

          body:
            JSON.stringify({
              transactionId: tid
            })
        }
      );

    alert(
      d.credited
        ? "Top up berhasil masuk ke saldo."
        : `Status: ${
            d.status ||
            "pending"
          }`
    );

    await loadWallet();

  } catch (e) {

    alert(e.message);
  }
}


/* =====================================================
   WITHDRAW
   ===================================================== */

async function createWithdrawal() {

  const btn =
    $("#withdrawBtn");

  const amount =
    Math.floor(
      Number(
        $("#withdrawAmount")?.value
      )
    );

  const method =
    $("#withdrawMethod")?.value;

  const destination =
    $("#withdrawDestination")
      ?.value
      .trim();

  const holder =
    $("#withdrawHolder")
      ?.value
      .trim();

  if (!btn) {
    return;
  }

  btn.disabled = true;

  try {

    const d =
      await api(
        "/api/wallet/withdraw",
      {
          method: "POST",

          body:
            JSON.stringify({
              amount,
              method,
              destination,
              holder
            })
        }
      );

    const result =
      $("#withdrawResult");

    if (result) {

      result.innerHTML =
        `
        <div class="pay-info">

          Penarikan
          ${rupiah(d.withdrawal.amount)}
          diajukan dan menunggu admin.

        </div>
        `;
    }

    const amountInput =
      $("#withdrawAmount");

    if (amountInput) {
      amountInput.value = "";
    }

    await loadWallet();

  } catch (e) {

    const result =
      $("#withdrawResult");

    if (result) {

      result.innerHTML =
        `
        <div class="empty">
          ${esc(e.message)}
        </div>
        `;
    }

  } finally {

    btn.disabled = false;
  }
}


/* =====================================================
   UPGRADE RESELLER
   ===================================================== */

async function upgrade() {

  const btn =
    $("#upgradeBtn");

  if (!btn) {
    return;
  }

  btn.disabled = true;

  btn.innerHTML =
    `
    <i class="fa-solid fa-spinner fa-spin"></i>
    Memproses...
    `;

  try {

    const d =
      await api(
        "/api/reseller/create",
        {
          method: "POST",

          body:
            JSON.stringify({
              paymentMethod:
                "balance"
            })
        }
      );

    if (d.paid) {

      await loadMe();

      alert(
        "Upgrade berhasil. Saldo sudah dipotong dan akun kamu sekarang Reseller."
      );

      return;
    }

    const upgradePay =
      $("#upgradePay");

    if (!upgradePay) {
      return;
    }

    upgradePay.hidden = false;

    upgradePay.innerHTML =
      `
      <div class="pay-info">

        Bayar
        ${rupiah(d.amount)}

        sebelum
        ${date(d.expiredAt)}.

      </div>

      <img
        class="qr"
        src="https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(d.qrString)}"
        alt="QRIS Upgrade"
      >

      <div class="pay-info">

        Setelah membayar,
        tekan tombol cek pembayaran.

      </div>

      <button
        id="checkUpgrade"
        class="primary"
        style="width:100%;margin-top:10px"
      >
        <i class="fa-solid fa-rotate"></i>
        Cek Pembayaran
      </button>
      `;

    const check =
      $("#checkUpgrade");

    if (check) {

      check.onclick =
        () =>
          checkUpgrade(
            d.transactionId
          );
    }

  } catch (e) {

    alert(e.message);

  } finally {

    btn.disabled = false;

    btn.innerHTML =
      `
      <i class="fa-solid fa-wallet"></i>
      Upgrade dengan saldo / QRIS
      `;
  }
}


/* =====================================================
   CHECK UPGRADE
   ===================================================== */

async function checkUpgrade(tid) {

  const b =
    $("#checkUpgrade");

  if (b) {

    b.disabled = true;

    b.innerHTML =
      `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Mengecek...
      `;
  }

  try {

    const d =
      await api(
        "/api/reseller/status",
        {
          method: "POST",

          body:
            JSON.stringify({
              transactionId: tid
            })
        }
      );

    if (d.upgraded) {

      await loadMe();

      alert(
        "Pembayaran berhasil. Akun kamu sekarang Reseller."
      );

    } else {

      alert(
        `Status pembayaran: ${
          d.status ||
          "pending"
        }`
      );
    }

  } catch (e) {

    alert(e.message);

  } finally {

    const check =
      $("#checkUpgrade");

    if (check) {

      check.disabled = false;

      check.innerHTML =
        `
        <i class="fa-solid fa-rotate"></i>
        Cek Pembayaran
        `;
    }
  }
}


/* =====================================================
   ACCOUNT MENU
   PENTING:
   BAGIAN INI HANYA MEMBUKA / MENUTUP MENU.
   TIDAK ADA showAccountPage DI SINI.
   ===================================================== */

function showAccountPage(page="account", updateHash=true) {
  const allowed=["account","notifications","wallet","transactions","chat"];
  if(!allowed.includes(page))page="account";
  document.querySelectorAll(".account-page").forEach(el=>el.classList.remove("active"));
  const target=document.getElementById(page+"Page");
  if(target)target.classList.add("active");
  document.querySelectorAll("[data-account-page]").forEach(el=>el.classList.toggle("active",el.getAttribute("data-account-page")===page));
  if(updateHash)history.replaceState(null,"",`#${page}Page`);
  if(page==="notifications")loadNotifications();
  if(page==="wallet")loadWallet();
  if(page==="transactions")loadTransactions();
  if(page==="chat")loadChat();
  const menu=$("#accountMenu"),btn=$("#accountMenuBtn");
  if(menu){menu.hidden=true;} if(btn)btn.setAttribute("aria-expanded","false");
}

function initAccountMenu() {

  const menuBtn =
    $("#accountMenuBtn");

  const menu =
    $("#accountMenu");

  if (!menuBtn || !menu) {
    return;
  }

  menuBtn.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      menu.hidden =
        !menu.hidden;

      menuBtn.setAttribute(
        "aria-expanded",
        String(!menu.hidden)
      );
    }
  );

  menu.addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

  document.addEventListener(
    "click",
    event => {

      if (
        !menu.hidden &&
        !menu.contains(event.target) &&
        !menuBtn.contains(event.target)
      ) {

        menu.hidden = true;

        menuBtn.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }
  );
}


/* =====================================================
   INIT
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const loginTab =
      $("#loginTab");

    const registerTab =
      $("#registerTab");

    const loginForm =
      $("#loginForm");

    const registerForm =
      $("#registerForm");

    const logoutBtn =
      $("#logoutBtn");

    const readAll =
      $("#readAll");

    const chatForm =
      $("#chatForm");

    const upgradeBtn =
      $("#upgradeBtn");

    const refreshTransactions =
      $("#refreshTransactions");

    const topupMethod =
      $("#topupMethod");

    const topupBtn =
      $("#topupBtn");

    const withdrawBtn =
      $("#withdrawBtn");


    /* =========================
       LOGIN TAB
       ========================= */

    if (loginTab) {

      loginTab.onclick =
        () =>
          showAuth("login");
    }


    /* =========================
       REGISTER TAB
       ========================= */

    if (registerTab) {

      registerTab.onclick =
        () =>
          showAuth("register");
    }


    /* =========================
       LOGIN FORM
       ========================= */

    if (loginForm) {

      loginForm.onsubmit =
        doLogin;
    }


    /* =========================
       REGISTER FORM
       ========================= */

    if (registerForm) {

      registerForm.onsubmit =
        doRegister;
    }


    /* =========================
       LOGOUT
       ========================= */

    if (logoutBtn) {

      logoutBtn.onclick =
        () => {

          localStorage.removeItem(
            AUTH_TOKEN_KEY
          );

          USER = null;

          showAuth("login");
        };
    }


    /* =========================
       READ ALL NOTIFICATIONS
       ========================= */

    if (readAll) {

      readAll.onclick =
        async () => {

          try {

            await api(
              "/api/auth/notifications",
              {
                method: "POST",
                body: "{}"
              }
            );

            loadNotifications();

          } catch (e) {

            alert(e.message);
          }
        };
    }


    /* =========================
       CHAT
       ========================= */

    if (chatForm) {

      chatForm.onsubmit =
        async e => {

          e.preventDefault();

          const input =
            $("#chatInput");

          if (!input) {
            return;
          }

          const msg =
            input.value.trim();

          if (!msg) {
            return;
          }

          try {

            await api(
              "/api/auth/chat",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    message: msg
                  })
              }
            );

            input.value = "";

            loadChat();

          } catch (x) {

            alert(x.message);
          }
        };
    }


    /* =========================
       UPGRADE RESELLER
       ========================= */

    if (upgradeBtn) {

      upgradeBtn.onclick =
        upgrade;
    }


    /* =========================
       REFRESH TRANSACTIONS
       ========================= */

    if (refreshTransactions) {

      refreshTransactions.onclick =
        loadTransactions;
    }


    /* =========================
       TOPUP METHOD
       ========================= */

    if (topupMethod) {

      topupMethod.onchange =
        renderManualPayment;
    }


    /* =========================
       TOPUP
       ========================= */

    if (topupBtn) {

      topupBtn.onclick =
        createTopup;
    }


    /* =========================
       WITHDRAW
       ========================= */

    if (withdrawBtn) {

      withdrawBtn.onclick =
        createWithdrawal;
    }


    /* =========================
       ACCOUNT MENU
       ========================= */

    initAccountMenu();

    document.querySelectorAll("[data-account-page]").forEach(el=>{
      el.addEventListener("click",event=>{
        event.preventDefault();
        showAccountPage(el.getAttribute("data-account-page"));
      });
    });
    const initialHash=String(location.hash||"").replace("#","");
    const initialPage=initialHash.endsWith("Page")?initialHash.slice(0,-4):"account";
    showAccountPage(initialPage,false);


    /* =========================
       CHECK LOGIN
       ========================= */

    if (
      token() &&
      await loadMe()
    ) {

      // Sudah login.

    } else {

      showAuth(
        location.hash === "#register"
          ? "register"
          : "login"
      );
    }

  }
);
