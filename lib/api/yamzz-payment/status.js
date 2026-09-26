const {
  YAMZZ_PAYMENT_API,
  gatewayHeaders,
  gatewayConfigured,
  storeDb,
  save
} = require('./_common');
const { privateDb, savePrivateDb, addNotification } = require('../auth/_common');
const { creditCommission } = require('../wallet/_common');
const { sendPushToUser } = require('../../push');

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  });

  return response.ok;
}

async function markPaidAndNotify(transactionId, gatewayAmount, paidAt) {
  const db = await storeDb();
  db.orders = Array.isArray(db.orders) ? db.orders : [];

  const order = db.orders.find(
    item => String(item.paymentTransactionId) === String(transactionId)
  );

  if (!order) return null;

  const wasPaid = order.status === 'paid';

  // Pastikan order lama juga mendapat link terbaru dari produk jika sebelumnya kosong.
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
  order.paidAt = order.paidAt || paidAt || new Date().toISOString();
  order.gatewayAmount = Number(gatewayAmount) || Number(order.price) || 0;

  // Simpan dulu status paid supaya refresh/poll berikutnya tidak mengirim ulang.
  if (!wasPaid && !order.telegramNotifiedAt) {
    const sent = await sendTelegram(
      `💰 <b>PEMBAYARAN MASUK</b>\n\n` +
      `🧾 ${order.id}\n` +
      `📦 ${order.product}\n` +
      `💵 Rp${Number(order.price).toLocaleString('id-ID')}\n` +
      `👤 ${order.name}\n` +
      `📱 ${order.whatsapp}\n\n` +
      `✅ <b>PAID</b> via Yamzz Payment`
    );

    if (sent) order.telegramNotifiedAt = new Date().toISOString();
  }

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
    try {
      const pdb = await privateDb();
      addNotification(
        pdb,
        order.userId,
        'Pembayaran berhasil',
        `Transaksi ${order.id} untuk ${order.product} sudah PAID.`,
        'success'
      );
      await savePrivateDb(pdb);
      await sendPushToUser(pdb, order.userId, {
        title: 'Pembayaran berhasil',
        body: `Transaksi ${order.id} untuk ${order.product} sudah PAID.`,
        data: { type: 'payment_paid', orderId: order.id, transactionId, link: `cek-transaksi.html?order=${encodeURIComponent(order.id)}` }
      });
      await savePrivateDb(pdb);
    } catch (notifyError) {
      console.error('USER NOTIFICATION ERROR', notifyError);
    }
  }
  return order;
}

async function updatePendingOrder(transactionId, status) {
  const db = await storeDb();
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  const order = db.orders.find(
    item => String(item.paymentTransactionId) === String(transactionId)
  );

  if (!order) return null;

  if (order.status !== 'paid') {
    if (status === 'expired' || status === 'cancel') {
      order.status = 'rejected';
    } else if (status === 'pending') {
      order.status = 'pending';
    }
  }

  await save(db);
  return order;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!gatewayConfigured()) {
      return res.status(500).json({
        error: 'Yamzz Payment belum dikonfigurasi. Isi YAMZZ_PAYMENT_URL dan YAMZZ_PAYMENT_API_KEY.'
      });
    }

    const transactionId = String(req.body?.transactionId || '').trim();
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId wajib.' });
    }

    const response = await fetch(
      `${YAMZZ_PAYMENT_API}/api/index?route=payment-status&transaction_id=${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: gatewayHeaders({ 'Content-Type': 'application/json' })
      }
    );

    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch {}

    if (!response.ok) {
      return res.status(response.status || 502).json({
        error: payload.error || payload.message || 'Gagal mengecek pembayaran di Yamzz Payment.',
        gatewayStatus: response.status
      });
    }

    const tx = payload.transaction || payload.data || {};
    const status = String(tx.status || payload.status || 'pending').toLowerCase();

    if (status === 'paid') {
      const order = await markPaidAndNotify(
        transactionId,
        Number(tx.amount || payload.amount || 0),
        tx.paid_at || tx.paidAt || new Date().toISOString()
      );
      return res.json({
        success: true,
        status: 'paid',
        paid: true,
        transaction: transactionId,
        order
      });
    }

    const order = await updatePendingOrder(transactionId, status);
    return res.json({
      success: true,
      status,
      paid: false,
      transaction: transactionId,
      order
    });
  } catch (error) {
    console.error('YAMZZ PAYMENT STATUS ERROR', error);
    return res.status(500).json({
      error: error.message || 'Gagal mengecek status pembayaran.'
    });
  }
};
