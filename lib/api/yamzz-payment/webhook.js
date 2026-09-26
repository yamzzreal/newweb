const crypto = require('crypto');
const { storeDb, save } = require('./_common');
const { privateDb, savePrivateDb, addNotification, calculateResellerExpiry, upgradeLabel } = require('../auth/_common');
const { creditCommission } = require('../wallet/_common');
const { sendPushToUser } = require('../../push');

function validSignature(raw, sig, secret) {
  if (!sig || !secret || !raw) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(String(sig), 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' })
  }).catch(err => console.error('Telegram error:', err.message));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Vercel bodyParser dimatikan lewat config di bawah agar signature memakai RAW BODY.
    const rawBuffer = await readRawBody(req);
    const raw = rawBuffer.toString('utf8');
    const sig = req.headers['x-yamzz-payment-signature'];

    if (!validSignature(rawBuffer, sig, process.env.YAMZZ_PAYMENT_WEBHOOK_SECRET)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(raw);
    if (payload.status !== 'paid') return res.status(200).json({ ok: true });
    if (!payload.transactionId) return res.status(400).json({ error: 'transactionId missing' });

    // Upgrade reseller juga memakai transaksi yang sama.
    const privateDbRecord = await privateDb();
    privateDbRecord.resellerPayments = Array.isArray(privateDbRecord.resellerPayments) ? privateDbRecord.resellerPayments : [];
    const resellerPay = privateDbRecord.resellerPayments.find(x => String(x.transactionId) === String(payload.transactionId));
    if (resellerPay) {
      if (resellerPay.status === 'paid') return res.status(200).json({ ok: true, reseller: true, alreadyPaid: true });
      const u = privateDbRecord.users.find(x => String(x.id) === String(resellerPay.userId));
      if (u) {
        resellerPay.status = 'paid';
        resellerPay.paidAt = payload.paidAt || new Date().toISOString();
        const settings = resellerPay.upgradeSettings && typeof resellerPay.upgradeSettings === 'object' ? resellerPay.upgradeSettings : (privateDbRecord.upgradeSettings || {});
        u.type = 'reseller';
        u.resellerAt = u.resellerAt || resellerPay.paidAt;
        u.resellerExpiresAt = calculateResellerExpiry(resellerPay.paidAt, settings);
        u.resellerPlan = upgradeLabel(settings);
        addNotification(privateDbRecord, u.id, 'Akun Reseller aktif', `Pembayaran upgrade berhasil. Masa aktif: ${u.resellerPlan}.`, 'success');
        await savePrivateDb(privateDbRecord);
        await sendPushToUser(privateDbRecord, u.id, { title: 'Akun Reseller aktif', body: `Pembayaran upgrade berhasil. Masa aktif: ${u.resellerPlan}.`, data: { type: 'reseller_upgrade', link: 'akun.html' } });
      }
      return res.status(200).json({ ok: true, reseller: true });
    }

    const db = await storeDb();
    db.orders = Array.isArray(db.orders) ? db.orders : [];
    const order = db.orders.find(x => String(x.paymentTransactionId) === String(payload.transactionId));

    // QRIS otomatis juga dipakai untuk top up saldo. Kredit saldo hanya sekali.
    privateDbRecord.topups = Array.isArray(privateDbRecord.topups) ? privateDbRecord.topups : [];
    const topup = privateDbRecord.topups.find(x => String(x.transactionId) === String(payload.transactionId));
    if (topup) {
      if (topup.status === 'processing') return res.status(200).json({ ok: true, topup: true, processing: true });
      if (topup.status !== 'paid') {
        const u = privateDbRecord.users.find(x => String(x.id) === String(topup.userId));
        if (u) {
          topup.status = 'processing';
          await savePrivateDb(privateDbRecord);
          const amount = Number(topup.amount) || Number(payload.amount) || 0;
          u.balance = Math.max(0, Number(u.balance || 0)) + amount;
          privateDbRecord.walletLedger = Array.isArray(privateDbRecord.walletLedger) ? privateDbRecord.walletLedger : [];
          privateDbRecord.walletLedger.unshift({id:`wl_${Date.now().toString(36)}`,userId:u.id,type:'topup',amount,note:'Top up saldo via QRIS',ref:topup.id,createdAt:new Date().toISOString(),meta:{method:'qris',transactionId:payload.transactionId}});
          topup.status = 'paid';
          topup.paidAt = payload.paidAt || new Date().toISOString();
          addNotification(privateDbRecord,u.id,'Saldo bertambah',`Top up Rp${amount.toLocaleString('id-ID')} berhasil masuk ke saldo.`,'success');
          await savePrivateDb(privateDbRecord);
          await sendPushToUser(privateDbRecord, u.id, { title: 'Top up berhasil', body: `Top up Rp${amount.toLocaleString('id-ID')} berhasil masuk ke saldo.`, data: { type: 'topup', link: 'akun.html#wallet' } });
        }
      }
      return res.status(200).json({ ok: true, topup: true });
    }

    // Selalu balas 2xx untuk payload yang sah agar Yamzz Payment tidak retry tanpa perlu.
    if (!order) return res.status(200).json({ ok: true, unmatched: true });

    const wasPaid = order.status === 'paid';

    // Backfill link produk untuk order lama yang belum memilikinya.
    const productForDelivery = (Array.isArray(db.products) ? db.products : []).find(
      p => String(p.id) === String(order.productId)
    );
    if (!String(order.deliveryLink || '').trim() && productForDelivery) {
      order.deliveryLink = String(
        productForDelivery.deliveryLink ||
        productForDelivery.productLink ||
        productForDelivery.link ||
        ''
      ).trim();
    }

    // Kurangi stok tepat satu kali saat transaksi menjadi PAID.
    if (!wasPaid && order.stockDeducted !== true) {
      const product = (Array.isArray(db.products) ? db.products : []).find(
        p => String(p.id) === String(order.productId)
      );
      if (product) {
        const current = Number(product.stock ?? product.stok ?? product.quantity ?? 0);
        const next = Math.max(0, current - Number(order.quantity || 1));
        product.stock = next;
        if ('stok' in product) product.stok = next;
        if ('quantity' in product) product.quantity = next;
        order.stockDeducted = true;
      }
    }

    order.status = 'paid';
    order.paidAt = payload.paidAt || new Date().toISOString();
    order.gatewayAmount = Number(payload.amount) || order.price;
    await save(db);

    if (!order.commissionCredited && order.userId) {
      try {
        if (await creditCommission(order, productForDelivery)) {
          order.commissionCredited = true;
          order.commissionCreditedAt = new Date().toISOString();
          await save(db);
        }
      } catch (commissionError) {
        console.error('COMMISSION ERROR', commissionError);
      }
    }

    if (!wasPaid && order.userId) {
      await sendPushToUser(privateDbRecord, order.userId, { title: 'Pembayaran berhasil', body: `Transaksi ${order.id} untuk ${order.product} sudah PAID.`, data: { type: 'payment_paid', orderId: order.id, transactionId: payload.transactionId, link: `cek-transaksi.html?order=${encodeURIComponent(order.id)}` } });
    }

    if (!wasPaid) {
      await telegram(
        `💰 <b>PEMBAYARAN MASUK</b>\n\n` +
        `🧾 ${order.id}\n` +
        `📦 ${order.product}\n` +
        `💵 Rp${Number(order.price).toLocaleString('id-ID')}\n` +
        `👤 ${order.name}\n` +
        `📱 https://wa.me/${order.whatsapp}\n` +
        `💌 ${order.email}\n\n` +
        `✅ <b>PAID</b> via Yamzz Payment`
      );
    }

    return res.status(200).json({ ok: true, paid: true, orderId: order.id });
  } catch (e) {
    console.error('Yamzz Payment webhook error:', e);
    return res.status(500).json({ error: e.message || 'Webhook error' });
  }
};

// Penting: Yamzz Payment menandatangani RAW JSON body, bukan hasil JSON.parse().
module.exports.config = {
  api: { bodyParser: false }
};
