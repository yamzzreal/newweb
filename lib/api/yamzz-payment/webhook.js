const crypto = require('crypto');
const { storeDb, save } = require('./_common');
const {
  privateDb,
  savePrivateDb,
  addNotification,
  calculateResellerExpiry,
  upgradeLabel
} = require('../auth/_common');
const { creditCommission } = require('../wallet/_common');
const { sendPushToUser } = require('../../push');

function validSignature(raw, sig, secret) {
  if (!sig || !secret || !raw) return false;

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');

    const a = Buffer.from(String(sig), 'hex');
    const b = Buffer.from(expected, 'hex');

    return (
      a.length === b.length &&
      a.length > 0 &&
      crypto.timingSafeEqual(a, b)
    );
  } catch {
    return false;
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk)
      );
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
}

/**
 * Telegram notification
 */
async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chat) {
    console.warn(
      'Telegram notification skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diset.'
    );
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chat,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        'Telegram HTTP error:',
        response.status,
        errorText
      );

      return false;
    }

    return true;
  } catch (err) {
    console.error(
      'Telegram notification error:',
      err.message
    );

    return false;
  }
}

/**
 * Format Rupiah
 */
function rupiah(amount) {
  return `Rp${Number(amount || 0).toLocaleString('id-ID')}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: 'Method not allowed' });
  }

  try {
    // =========================================================
    // RAW BODY
    // =========================================================

    const rawBuffer = await readRawBody(req);
    const raw = rawBuffer.toString('utf8');

    const sig =
      req.headers['x-yamzz-payment-signature'];

    // =========================================================
    // VERIFY SIGNATURE
    // =========================================================

    if (
      !validSignature(
        rawBuffer,
        sig,
        process.env.YAMZZ_PAYMENT_WEBHOOK_SECRET
      )
    ) {
      return res
        .status(401)
        .json({
          error: 'Invalid signature'
        });
    }

    // =========================================================
    // PARSE PAYLOAD
    // =========================================================

    const payload = JSON.parse(raw);

    if (payload.status !== 'paid') {
      return res.status(200).json({
        ok: true
      });
    }

    if (!payload.transactionId) {
      return res.status(400).json({
        error: 'transactionId missing'
      });
    }

    const paidAt =
      payload.paidAt ||
      new Date().toISOString();

    // =========================================================
    // LOAD PRIVATE DB
    // =========================================================

    const privateDbRecord = await privateDb();

    privateDbRecord.users =
      Array.isArray(privateDbRecord.users)
        ? privateDbRecord.users
        : [];

    // =========================================================
    // 1. RESELLER UPGRADE
    // =========================================================

    privateDbRecord.resellerPayments =
      Array.isArray(
        privateDbRecord.resellerPayments
      )
        ? privateDbRecord.resellerPayments
        : [];

    const resellerPay =
      privateDbRecord.resellerPayments.find(
        x =>
          String(x.transactionId) ===
          String(payload.transactionId)
      );

    if (resellerPay) {

      // Jangan kirim notif ulang
      if (resellerPay.status === 'paid') {
        return res.status(200).json({
          ok: true,
          reseller: true,
          alreadyPaid: true
        });
      }

      const u =
        privateDbRecord.users.find(
          x =>
            String(x.id) ===
            String(resellerPay.userId)
        );

      if (u) {

        resellerPay.status = 'paid';
        resellerPay.paidAt = paidAt;

        const settings =
          resellerPay.upgradeSettings &&
          typeof resellerPay.upgradeSettings === 'object'
            ? resellerPay.upgradeSettings
            : (
                privateDbRecord.upgradeSettings ||
                {}
              );

        u.type = 'reseller';

        u.resellerAt =
          u.resellerAt ||
          resellerPay.paidAt;

        u.resellerExpiresAt =
          calculateResellerExpiry(
            resellerPay.paidAt,
            settings
          );

        u.resellerPlan =
          upgradeLabel(settings);

        addNotification(
          privateDbRecord,
          u.id,
          'Akun Reseller aktif',
          `Pembayaran upgrade berhasil. Masa aktif: ${u.resellerPlan}.`,
          'success'
        );

        await savePrivateDb(
          privateDbRecord
        );

        // Push notification
        await sendPushToUser(
          privateDbRecord,
          u.id,
          {
            title: 'Akun Reseller aktif',
            body: `Pembayaran upgrade berhasil. Masa aktif: ${u.resellerPlan}.`,
            data: {
              type: 'reseller_upgrade',
              link: 'akun.html'
            }
          }
        );

        // =====================================================
        // TELEGRAM RESELLER
        // =====================================================

        await telegram(
          `👑 <b>UPGRADE RESELLER BERHASIL</b>\n\n` +
          `🧾 <b>Transaction:</b> ${payload.transactionId}\n` +
          `👤 <b>User:</b> ${u.name || u.username || u.id}\n` +
          `🆔 <b>User ID:</b> ${u.id}\n` +
          `💵 <b>Nominal:</b> ${rupiah(payload.amount)}\n` +
          `📦 <b>Plan:</b> ${u.resellerPlan}\n` +
          `⏰ <b>Paid:</b> ${paidAt}\n\n` +
          `✅ <b>PAID via Yamzz Payment</b>`
        );
      }

      return res.status(200).json({
        ok: true,
        reseller: true
      });
    }

    // =========================================================
    // 2. STORE DB
    // =========================================================

    const db = await storeDb();

    db.orders =
      Array.isArray(db.orders)
        ? db.orders
        : [];

    const order =
      db.orders.find(
        x =>
          String(x.paymentTransactionId) ===
          String(payload.transactionId)
      );

    // =========================================================
    // 3. TOP UP SALDO
    // =========================================================

    privateDbRecord.topups =
      Array.isArray(privateDbRecord.topups)
        ? privateDbRecord.topups
        : [];

    const topup =
      privateDbRecord.topups.find(
        x =>
          String(x.transactionId) ===
          String(payload.transactionId)
      );

    if (topup) {

      // Sudah selesai
      if (topup.status === 'paid') {
        return res.status(200).json({
          ok: true,
          topup: true,
          alreadyPaid: true
        });
      }

      if (topup.status === 'processing') {
        return res.status(200).json({
          ok: true,
          topup: true,
          processing: true
        });
      }

      const u =
        privateDbRecord.users.find(
          x =>
            String(x.id) ===
            String(topup.userId)
        );

      if (u) {

        // Tandai processing terlebih dahulu
        topup.status = 'processing';

        await savePrivateDb(
          privateDbRecord
        );

        const amount =
          Number(topup.amount) ||
          Number(payload.amount) ||
          0;

        // Tambahkan saldo
        u.balance =
          Math.max(
            0,
            Number(u.balance || 0)
          ) + amount;

        // Wallet ledger
        privateDbRecord.walletLedger =
          Array.isArray(
            privateDbRecord.walletLedger
          )
            ? privateDbRecord.walletLedger
            : [];

        privateDbRecord.walletLedger.unshift({
          id:
            `wl_${Date.now().toString(36)}`,

          userId: u.id,

          type: 'topup',

          amount,

          note:
            'Top up saldo via QRIS',

          ref: topup.id,

          createdAt:
            new Date().toISOString(),

          meta: {
            method: 'qris',
            transactionId:
              payload.transactionId
          }
        });

        topup.status = 'paid';
        topup.paidAt = paidAt;

        addNotification(
          privateDbRecord,
          u.id,
          'Saldo bertambah',
          `Top up ${rupiah(amount)} berhasil masuk ke saldo.`,
          'success'
        );

        await savePrivateDb(
          privateDbRecord
        );

        // Push notification
        await sendPushToUser(
          privateDbRecord,
          u.id,
          {
            title: 'Top up berhasil',
            body: `Top up ${rupiah(amount)} berhasil masuk ke saldo.`,
            data: {
              type: 'topup',
              link: 'akun.html#wallet'
            }
          }
        );

        // =====================================================
        // TELEGRAM TOP UP
        // =====================================================

        await telegram(
          `💳 <b>TOP UP SALDO BERHASIL</b>\n\n` +
          `🧾 <b>Transaction:</b> ${payload.transactionId}\n` +
          `👤 <b>User:</b> ${u.name || u.username || u.id}\n` +
          `🆔 <b>User ID:</b> ${u.id}\n` +
          `💰 <b>Nominal:</b> ${rupiah(amount)}\n` +
          `⏰ <b>Paid:</b> ${paidAt}\n\n` +
          `✅ <b>PAID via Yamzz Payment</b>`
        );
      }

      return res.status(200).json({
        ok: true,
        topup: true
      });
    }

    // =========================================================
    // 4. ORDER PRODUK
    // =========================================================

    // Payload valid tetapi transaksi tidak ditemukan
    if (!order) {
      return res.status(200).json({
        ok: true,
        unmatched: true
      });
    }

    const wasPaid =
      order.status === 'paid';

    // =========================================================
    // BACKFILL DELIVERY LINK
    // =========================================================

    const productForDelivery =
      (
        Array.isArray(db.products)
          ? db.products
          : []
      ).find(
        p =>
          String(p.id) ===
          String(order.productId)
      );

    if (
      !String(
        order.deliveryLink || ''
      ).trim() &&
      productForDelivery
    ) {
      order.deliveryLink =
        String(
          productForDelivery.deliveryLink ||
          productForDelivery.productLink ||
          productForDelivery.link ||
          ''
        ).trim();
    }

    // =========================================================
    // KURANGI STOCK SEKALI
    // =========================================================

    if (
      !wasPaid &&
      order.stockDeducted !== true
    ) {

      const product =
        (
          Array.isArray(db.products)
            ? db.products
            : []
        ).find(
          p =>
            String(p.id) ===
            String(order.productId)
        );

      if (product) {

        const current =
          Number(
            product.stock ??
            product.stok ??
            product.quantity ??
            0
          );

        const next =
          Math.max(
            0,
            current -
              Number(
                order.quantity || 1
              )
          );

        product.stock = next;

        if ('stok' in product) {
          product.stok = next;
        }

        if ('quantity' in product) {
          product.quantity = next;
        }

        order.stockDeducted = true;
      }
    }

    // =========================================================
    // SET PAID
    // =========================================================

    order.status = 'paid';

    order.paidAt = paidAt;

    order.gatewayAmount =
      Number(payload.amount) ||
      order.price;

    await save(db);

    // =========================================================
    // COMMISSION
    // =========================================================

    if (
      !order.commissionCredited &&
      order.userId
    ) {
      try {

        if (
          await creditCommission(
            order,
            productForDelivery
          )
        ) {
          order.commissionCredited = true;

          order.commissionCreditedAt =
            new Date().toISOString();

          await save(db);
        }

      } catch (commissionError) {

        console.error(
          'COMMISSION ERROR',
          commissionError
        );
      }
    }

    // =========================================================
    // PUSH NOTIFICATION
    // =========================================================

    if (
      !wasPaid &&
      order.userId
    ) {

      await sendPushToUser(
        privateDbRecord,
        order.userId,
        {
          title: 'Pembayaran berhasil',
          body:
            `Transaksi ${order.id} untuk ${order.product} sudah PAID.`,

          data: {
            type: 'payment_paid',

            orderId:
              order.id,

            transactionId:
              payload.transactionId,

            link:
              `cek-transaksi.html?order=${encodeURIComponent(
                order.id
              )}`
          }
        }
      );
    }

    // =========================================================
    // TELEGRAM NOTIFICATION ORDER
    // HANYA SEKALI SAAT BERUBAH MENJADI PAID
    // =========================================================

    if (!wasPaid) {

      await telegram(
        `💰 <b>PEMBAYARAN BERHASIL</b>\n\n` +
        `🧾 <b>Order:</b> ${order.id}\n` +
        `🔑 <b>Transaction:</b> ${payload.transactionId}\n` +
        `📦 <b>Produk:</b> ${order.product}\n` +
        `🔢 <b>Qty:</b> ${order.quantity || 1}\n` +
        `💵 <b>Nominal:</b> ${rupiah(order.price)}\n` +
        `👤 <b>Nama:</b> ${order.name || '-'}\n` +
        `📱 <b>WhatsApp:</b> ${order.whatsapp || '-'}\n` +
        `💌 <b>Email:</b> ${order.email || '-'}\n` +
        `⏰ <b>Paid:</b> ${paidAt}\n\n` +
        `📊 <b>Status:</b> PAID\n` +
        `💳 <b>Payment:</b> Yamzz Payment\n\n` +
        `✅ <b>TRANSAKSI BERHASIL</b>`
      );
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(200).json({
      ok: true,
      paid: true,
      orderId: order.id
    });

  } catch (e) {

    console.error(
      'Yamzz Payment webhook error:',
      e
    );

    return res.status(500).json({
      error:
        e.message ||
        'Webhook error'
    });
  }
};

// =============================================================
// PENTING:
// Yamzz Payment menandatangani RAW JSON BODY.
// =============================================================

module.exports.config = {
  api: {
    bodyParser: false
  }
};
