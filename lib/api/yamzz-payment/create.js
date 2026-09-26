const {
  YAMZZ_PAYMENT_API,
  YAMZZ_PAYMENT_API_KEY,
  gatewayHeaders,
  gatewayConfigured,
  storeDb,
  save,
  clean
} = require('./_common');
const { requireUser, privateDb, savePrivateDb, addNotification, id } = require('../auth/_common');
const { sendPushToUser } = require('../../push');
const { balance } = require('../wallet/_common');

/*
 * ==============================
 * HELPER
 * ==============================
 */

function positiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  return 0;
}

/**
 * Biaya admin acak berdasarkan harga produk.
 *
 * Di bawah Rp10.000:
 * Rp10 - Rp90, kelipatan Rp10.
 *
 * Rp10.000 atau lebih:
 * Rp100 - Rp900, kelipatan Rp100.
 */
function randomAdminFee(baseAmount) {
  if (baseAmount < 10000) {
    return (
      Math.floor(Math.random() * 9) + 1
    ) * 10;
  }

  return (
    Math.floor(Math.random() * 9) + 1
  ) * 100;
}

/**
 * Mencari object/data transaksi secara recursive.
 * Ini dibuat agar tetap kompatibel apabila response
 * Yamzz Payment dibungkus dalam data/result/response/etc.
 */
function findValueDeep(input, keys, maxDepth = 6, depth = 0) {
  if (!input || typeof input !== 'object' || depth > maxDepth) {
    return undefined;
  }

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(input, key) &&
      input[key] !== undefined &&
      input[key] !== null &&
      input[key] !== ''
    ) {
      return input[key];
    }
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findValueDeep(
        item,
        keys,
        maxDepth,
        depth + 1
      );

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  for (const value of Object.values(input)) {
    if (value && typeof value === 'object') {
      const found = findValueDeep(
        value,
        keys,
        maxDepth,
        depth + 1
      );

      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

function getTransactionId(payload) {
  const value = findValueDeep(payload, [
    'transactionId',
    'transaction_id',
    'trxId',
    'trx_id'
  ]);

  return String(value || '').trim();
}

function getQrString(payload) {
  const value = findValueDeep(payload, [
    'qr_string',
    'qrString',
    'qrCode',
    'qr_code',
    'qr'
  ]);

  return String(value || '').trim();
}

function getAmount(payload) {
  const value = findValueDeep(payload, [
    'totalAmount',
    'total_amount',
    'amount',
    'total'
  ]);

  return positiveNumber(value);
}

function getExpiredAt(payload) {
  const value = findValueDeep(payload, [
    'expiredAt',
    'expired_at',
    'expiresAt',
    'expires_at'
  ]);

  if (value) {
    return String(value);
  }

  return new Date(
    Date.now() + 15 * 60 * 1000
  ).toISOString();
}

/*
 * ==============================
 * MAIN HANDLER
 * ==============================
 */

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    /*
     * ==============================
     * CEK KONFIGURASI
     * ==============================
     */

    /*
     * ==============================
     * DATA REQUEST
     * ==============================
     */

    const body = req.body || {};
    const paymentMethod = String(body.paymentMethod || "qris").toLowerCase();

    /*
     * ==============================
     * CEK KONFIGURASI
     * ==============================
     */

    if (paymentMethod !== "balance" && !gatewayConfigured()) {
      return res.status(500).json({
        error: 'Yamzz Payment belum dikonfigurasi. Isi YAMZZ_PAYMENT_URL dan YAMZZ_PAYMENT_API_KEY.'
      });
    }
    let authUser = null;
    try { authUser = (await requireUser(req))?.user || null; } catch {}

    const productId = clean(
      body.productId,
      100
    );

    if (!productId) {
      return res.status(400).json({
        error: 'productId wajib dikirim.'
      });
    }

    /*
     * ==============================
     * AMBIL PRODUK NEON
     * ==============================
     */

    const db = await storeDb();

    if (db.site?.maintenance === true) {
      return res.status(503).json({
        error: 'Website sedang maintenance.'
      });
    }

    if (db.site?.storeOffline === true) {
      return res.status(503).json({
        error: 'Store sedang offline.'
      });
    }

    const products = Array.isArray(db.products)
      ? db.products
      : [];

    const product = products.find(
      p => String(p.id) === productId
    );

    if (!product) {
      return res.status(404).json({
        error: 'Produk tidak ditemukan.'
      });
    }

    /*
     * ==============================
     * CEK STOK
     * ==============================
     */

    const currentStock = Number(
      product.stock ??
      product.stok ??
      product.quantity ??
      0
    );

    if (
      !Number.isFinite(currentStock) ||
      currentStock <= 0
    ) {
      return res.status(409).json({
        error: 'Stok produk habis.'
      });
    }

    /*
     * ==============================
     * HARGA PRODUK
     * ==============================
     */

    const baseAmount = Number(
      product.price
    );

    if (
      !Number.isFinite(baseAmount) ||
      baseAmount < 1
    ) {
      return res.status(400).json({
        error: 'Harga produk tidak valid.'
      });
    }

    /*
     * ==============================
     * BIAYA ADMIN ACAK
     * ==============================
     */

    const adminFee = randomAdminFee(
      baseAmount
    );

    const totalAmount =
      baseAmount + adminFee;

    console.log(
      'PAYMENT CALCULATION',
      {
        baseAmount,
        adminFee,
        totalAmount
      }
    );

    /*
     * ==============================
     * DATA CUSTOMER
     * ==============================
     */

    const customer = {
      name: clean(body.name, 80),
      whatsapp: clean(body.whatsapp, 25),
      email: clean(body.email, 120),
      note: clean(body.note, 300)
    };

    if (
      !customer.name ||
      !customer.whatsapp ||
      !customer.email
    ) {
      return res.status(400).json({
        error:
          'Nama, WhatsApp, dan email wajib diisi.'
      });
    }

    if(paymentMethod === "balance"){
      if(!authUser)return res.status(401).json({error:"Login diperlukan untuk menggunakan saldo."});
      const pdb=await privateDb(); const walletUser=pdb.users.find(x=>String(x.id)===String(authUser.id));
      if(!walletUser)return res.status(404).json({error:"Akun wallet tidak ditemukan."});
      if(balance(walletUser)<totalAmount)return res.status(400).json({error:`Saldo tidak cukup. Total pembelian Rp${totalAmount.toLocaleString("id-ID")}.`});
      walletUser.balance=balance(walletUser)-totalAmount;
      const order={id:`INV-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,productId:product.id,product:product.name||product.title||"Produk",category:product.category||"jasteb",deliveryLink:clean(product.deliveryLink||product.productLink||product.link||"",1000),ress:Number(product.ress||0),quantity:1,price:totalAmount,basePrice:baseAmount,adminFee,totalAmount,name:customer.name,whatsapp:customer.whatsapp,email:customer.email,note:customer.note,userId:walletUser.id,status:"paid",paymentGateway:"balance",paymentTransactionId:null,createdAt:new Date().toISOString(),expiredAt:null,paidAt:new Date().toISOString(),telegramNotifiedAt:null,paymentMethod:"balance",stockDeducted:true};
      db.orders=Array.isArray(db.orders)?db.orders:[]; const nextStock=Math.max(0,currentStock-1); product.stock=nextStock;if("stok" in product)product.stok=nextStock;if("quantity" in product)product.quantity=nextStock;db.orders.unshift(order);await save(db);
      pdb.walletLedger.unshift({id:id("wl"),userId:walletUser.id,type:"purchase",amount:-totalAmount,note:`Pembelian ${order.product} menggunakan saldo`,ref:order.id,createdAt:new Date().toISOString(),meta:{productId:product.id,baseAmount,adminFee}});addNotification(pdb,walletUser.id,"Pembelian berhasil",`Pesanan ${order.id} untuk ${order.product} dibayar menggunakan saldo Rp${totalAmount.toLocaleString("id-ID")}.`,"success");await savePrivateDb(pdb);await sendPushToUser(pdb,walletUser.id,{title:"Pembayaran berhasil",body:`Pesanan ${order.id} untuk ${order.product} dibayar menggunakan saldo Rp${totalAmount.toLocaleString("id-ID")}.`,data:{type:"payment_paid",orderId:order.id,link:`cek-transaksi.html?order=${encodeURIComponent(order.id)}`}});
      return res.json({success:true,paid:true,paymentMethod:"balance",orderId:order.id,transactionId:`BAL-${order.id}`,amount:totalAmount,baseAmount,adminFee,totalAmount,deliveryLink:order.deliveryLink,balance:walletUser.balance});
    }

    /*
     * ==============================
     * REQUEST KE YAMZZ PAYMENT
     * ==============================
     */

    if (!gatewayConfigured()) {
      return res.status(500).json({
        error: 'Yamzz Payment belum dikonfigurasi. Isi YAMZZ_PAYMENT_URL dan YAMZZ_PAYMENT_API_KEY di Vercel.'
      });
    }

    const orderId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const gatewayPayload = {
      order_id: orderId,
      amount: totalAmount,
      customer_name: customer.name,
      customer_email: customer.email,
      expired_minutes: 15,
      metadata: {
        source: 'yamzz-market',
        productId: String(product.id),
        product: String(product.name || product.title || 'Produk'),
        whatsapp: customer.whatsapp
      }
    };

    const gatewayResponse = await fetch(
      `${YAMZZ_PAYMENT_API}/api/index?route=payment-create`,
      {
        method: 'POST',
        headers: gatewayHeaders(),
        body: JSON.stringify(gatewayPayload)
      }
    );

    const rawText = await gatewayResponse.text();
    let gateway = {};
    try {
      gateway = rawText ? JSON.parse(rawText) : {};
    } catch {
      return res.status(502).json({
        error: 'Yamzz Payment mengembalikan response bukan JSON.',
        httpStatus: gatewayResponse.status
      });
    }

    if (!gatewayResponse.ok || gateway.success === false) {
      return res.status(gatewayResponse.status || 502).json({
        error: gateway.error || gateway.message || 'Yamzz Payment gagal membuat pembayaran.',
        gatewayStatus: gatewayResponse.status
      });
    }

    const transactionId = String(
      gateway.transaction_id || gateway.transactionId || ''
    ).trim();

    const qrString = String(
      gateway.qr_string || gateway.qrString || ''
    ).trim();

    const gatewayAmount = positiveNumber(
      gateway.amount,
      gateway.totalAmount,
      totalAmount
    );

    const expiredAt = String(
      gateway.expires_at ||
      gateway.expired_at ||
      gateway.expiresAt ||
      getExpiredAt(gateway)
    );

    if (!transactionId || !qrString || !gatewayAmount) {
      return res.status(502).json({
        error: 'Yamzz Payment berhasil merespons tetapi data transaksi/QRIS tidak lengkap.',
        received: {
          transactionId: Boolean(transactionId),
          qrString: Boolean(qrString),
          amount: gatewayAmount,
          responseKeys: Object.keys(gateway || {})
        }
      });
    }

    /*
     * ==============================
     * BUAT ORDER
     * ==============================
     */

    const order = {
      id:
        `INV-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)
          .toUpperCase()}`,

      productId:
        product.id,

      product:
        product.name ||
        product.title ||
        'Produk',

      category:
        product.category ||
        'jasteb',

      // Link pengiriman otomatis; kosong = diproses admin.
      deliveryLink:
        clean(product.deliveryLink || product.productLink || product.link || '', 1000),

      ress:
        Number(product.ress || 0),

      quantity:
        1,

      /*
       * Nominal yang benar-benar
       * dikembalikan Yamzz Payment.
       */
      price:
        gatewayAmount,

      /*
       * Harga asli produk.
       */
      basePrice:
        baseAmount,

      /*
       * Biaya admin acak.
       */
      adminFee:
        adminFee,

      /*
       * Total pembayaran.
       */
      totalAmount:
        gatewayAmount,

      name:
        customer.name,

      whatsapp:
        customer.whatsapp,

      email:
        customer.email,

      userId:
        authUser?.id || null,

      note:
        customer.note,

      status:
        'pending',

      paymentGateway:
        'yamzz-payment',

      paymentTransactionId:
        transactionId,

      paymentTransactionId:
        transactionId,

      createdAt:
        new Date().toISOString(),

      expiredAt,

      paidAt:
        null,

      telegramNotifiedAt:
        null
    };

    /*
     * ==============================
     * SIMPAN KE NEON
     * ==============================
     */

    db.orders =
      Array.isArray(db.orders)
        ? db.orders
        : [];

    db.orders.unshift(order);

    await save(db);
    if (authUser?.id) {
      try {
        const pdb = await privateDb();
        addNotification(pdb, authUser.id, 'Transaksi dibuat', `Pembayaran ${order.id} untuk ${order.product} menunggu pembayaran.`, 'info');
        await savePrivateDb(pdb);
      } catch (notifyError) {
        console.error('USER NOTIFICATION CREATE ERROR', notifyError);
      }
    }

    /*
     * ==============================
     * RESPONSE KE FRONTEND
     * ==============================
     */

    return res.status(200).json({
      success: true,

      orderId:
        order.id,

      transactionId,

      amount:
        gatewayAmount,

      baseAmount,

      adminFee,

      totalAmount:
        gatewayAmount,

      qrString,

      expiredAt
    });

  } catch (error) {

    console.error(
      'YAMZZ PAYMENT CREATE ERROR',
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        'Server error saat membuat pembayaran.'
    });
  }
};
