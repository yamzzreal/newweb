"use strict";

function clean(v, max = 1000) {
  return String(v ?? "").trim().slice(0, max);
}

function escHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}

async function sendProductDeliveryEmail({ to, name, product, orderId, deliveryLink, amount }) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESEND_FROM || "").trim();

  if (!to || !deliveryLink) {
    return { ok: false, skipped: true, reason: "Email atau link produk kosong." };
  }
  try {
    const parsed = new URL(String(deliveryLink));
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, error: "Link produk harus menggunakan http/https." };
    }
  } catch {
    return { ok: false, error: "Link produk tidak valid." };
  }
  if (!key || !from) {
    return { ok: false, error: "ENV RESEND_API_KEY atau RESEND_FROM kosong." };
  }

  const safeName = escHtml(name || "Pelanggan");
  const safeProduct = escHtml(product || "Produk");
  const safeOrder = escHtml(orderId || "-");
  const safeLink = escHtml(deliveryLink);
  const safeAmount = Number(amount || 0).toLocaleString("id-ID");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        from,
        to: [String(to).trim()],
        subject: `Produk ${product || "Yamzz Market"} • ${orderId || "Pesanan"}`,
        html: `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#020617;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;padding:28px 12px">
  <div style="max-width:600px;margin:auto;background:#07111f;border:1px solid rgba(56,189,248,.28);border-radius:20px;overflow:hidden">
    <div style="padding:28px;text-align:center;background:linear-gradient(135deg,#071a35,#020617);border-bottom:1px solid rgba(56,189,248,.2)">
      <div style="font-size:13px;letter-spacing:3px;color:#38bdf8;font-weight:800">✦ YAMZZ MARKET ✦</div>
      <h1 style="margin:12px 0 0;color:#fff;font-size:25px">Produk Siap Diterima</h1>
    </div>
    <div style="padding:28px">
      <p style="font-size:16px">Halo <strong style="color:#38bdf8">${safeName}</strong>,</p>
      <p style="color:#94a3b8;line-height:1.7">Pembayaran kamu sudah berhasil. Berikut link produk yang dapat kamu akses:</p>
      <div style="padding:16px;border-radius:14px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.16);margin:20px 0">
        <div style="color:#94a3b8;font-size:12px">PRODUK</div>
        <strong style="font-size:17px;color:#fff">${safeProduct}</strong>
        <div style="color:#94a3b8;font-size:12px;margin-top:8px">Pesanan: ${safeOrder} • Rp${safeAmount}</div>
      </div>
      <div style="text-align:center;margin:26px 0">
        <a href="${safeLink}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 25px;border-radius:12px;background:linear-gradient(135deg,#00bfff,#2563eb);color:#fff;text-decoration:none;font-weight:800">BUKA LINK PRODUK</a>
      </div>
      <p style="font-size:12px;color:#64748b;line-height:1.7">Jika tombol tidak dapat dibuka, salin link produk dari email ini ke browser. Simpan email ini sebagai bukti pengiriman.</p>
    </div>
    <div style="padding:20px;text-align:center;background:#030a16;border-top:1px solid rgba(56,189,248,.12);color:#64748b;font-size:12px">Yamzz Market • Cepat • Aman • Terpercaya</div>
  </div>
</body></html>`
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.message || data.error || `Resend HTTP ${response.status}` };
    }
    return { ok: true, id: data.id || null };
  } catch (error) {
    return { ok: false, error: error.message || "Gagal mengirim email." };
  }
}

async function sendTransactionPaidEmail({ to, name, product, orderId, amount, deliveryLink }) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESEND_FROM || "").trim();
  if (!to) return { ok:false, skipped:true, reason:"Email customer kosong." };
  if (!key || !from) return { ok:false, error:"ENV RESEND_API_KEY atau RESEND_FROM kosong." };
  const safeName=escHtml(name||"Pelanggan"), safeProduct=escHtml(product||"Produk"), safeOrder=escHtml(orderId||"-"), safeAmount=Number(amount||0).toLocaleString("id-ID");
  let safeLink="";
  if (deliveryLink) { try { const u=new URL(String(deliveryLink)); if(["http:","https:"].includes(u.protocol)) safeLink=escHtml(deliveryLink); } catch {} }
  const linkHtml=safeLink ? `<div style="text-align:center;margin:24px 0"><a href="${safeLink}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 22px;border-radius:12px;background:linear-gradient(135deg,#00bfff,#2563eb);color:#fff;text-decoration:none;font-weight:800">BUKA LINK PRODUK</a></div>` : `<div style="padding:14px;border-radius:12px;background:rgba(250,204,21,.07);border:1px solid rgba(250,204,21,.18);color:#f8d66d">Produk akan diproses/dikirim oleh admin sesuai pesanan kamu.</div>`;
  try {
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({from,to:[String(to).trim()],subject:`Pembayaran berhasil • ${product||"Yamzz Market"} • ${orderId||"Pesanan"}`,html:`<!doctype html><html lang="id"><body style="margin:0;background:#020617;color:#e2e8f0;font-family:Arial;padding:28px 12px"><div style="max-width:600px;margin:auto;background:#07111f;border:1px solid rgba(56,189,248,.25);border-radius:20px;overflow:hidden"><div style="padding:28px;text-align:center;background:linear-gradient(135deg,#071a35,#020617)"><div style="font-size:13px;letter-spacing:3px;color:#38bdf8;font-weight:800">✦ YAMZZ MARKET ✦</div><h1 style="margin:12px 0 0;color:#fff;font-size:24px">Pembayaran Berhasil</h1></div><div style="padding:28px"><p>Halo <strong style="color:#38bdf8">${safeName}</strong>,</p><p style="color:#94a3b8;line-height:1.7">Pembayaran pesanan kamu telah berhasil dan transaksi sekarang berstatus <strong style="color:#4ade80">PAID</strong>.</p><div style="padding:16px;border-radius:14px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.16);margin:20px 0"><div style="color:#94a3b8;font-size:12px">PRODUK</div><strong style="font-size:17px;color:#fff">${safeProduct}</strong><div style="color:#94a3b8;font-size:12px;margin-top:8px">Pesanan: ${safeOrder} • Rp${safeAmount}</div></div>${linkHtml}<p style="font-size:12px;color:#64748b;line-height:1.7">Simpan email ini sebagai bukti transaksi. Jika ada kendala, hubungi Customer Service Yamzz Market.</p></div><div style="padding:20px;text-align:center;background:#030a16;color:#64748b;font-size:12px">Yamzz Market • Cepat • Aman • Terpercaya</div></div></body></html>`})});
    const data=await response.json().catch(()=>({})); if(!response.ok) return {ok:false,error:data.message||data.error||`Resend HTTP ${response.status}`}; return {ok:true,id:data.id||null};
  } catch(e){ return {ok:false,error:e.message||"Gagal mengirim email."}; }
}

module.exports = { sendProductDeliveryEmail, sendTransactionPaidEmail };
