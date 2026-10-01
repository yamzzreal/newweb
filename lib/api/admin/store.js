"use strict";

const { requireAdmin, privateDb, savePrivateDb, addNotification } = require("./_common");
const { readStore, writeStore } = require("../../db");
const { sendTransactionPaidEmail } = require("../../email");
const { sendPushToUser } = require("../../push");

module.exports = async (req, res) => {
  if (!(await requireAdmin(req))) {
    return res.status(401).json({ error: "Admin session tidak valid." });
  }

  try {
    if (req.method === "GET") {
      const record = await readStore();
      return res.status(200).json({ success: true, record });
    }

    if (req.method === "PUT") {
      const record = req.body || {};
      const previous = await readStore();
      const previousOrders = Array.isArray(previous.orders) ? previous.orders : [];
      const nextOrders = Array.isArray(record.orders) ? record.orders : [];
      const previousById = new Map(previousOrders.map(o => [String(o.id), o]));

      // Simpan perubahan toko terlebih dahulu agar status PAID tidak hilang
      // meskipun layanan email/push sedang bermasalah.
      await writeStore(record);

      const newlyPaid = nextOrders.filter(order => {
        if (String(order.status || "").toLowerCase() !== "paid") return false;
        const old = previousById.get(String(order.id));
        return String(old?.status || "").toLowerCase() !== "paid" && !order.productEmailSentAt;
      }).slice(0, 10);

      // Admin bisa memverifikasi transaksi secara manual dari dashboard.
      // Jalur ini sebelumnya hanya mengubah JSON sehingga email PAID tidak pernah dikirim.
      for (const order of newlyPaid) {
        if (!String(order.email || "").trim()) continue;
        try {
          const result = await sendTransactionPaidEmail({
            to: order.email,
            name: order.name,
            product: order.product,
            orderId: order.id,
            amount: order.price || order.totalAmount,
            deliveryLink: order.deliveryLink || ""
          });
          if (result.ok) {
            const live = nextOrders.find(x => String(x.id) === String(order.id));
            if (live) {
              live.productEmailSentAt = new Date().toISOString();
              live.productEmailId = result.id || null;
            }
          } else {
            console.error("ADMIN PAID EMAIL FAILED", order.id, result.error || result.reason);
          }
        } catch (emailError) {
          console.error("ADMIN PAID EMAIL ERROR", order.id, emailError);
        }
      }

      // Simpan kembali hanya jika metadata email berubah.
      if (newlyPaid.length) await writeStore(record);

      // User notification juga dibuat untuk transaksi manual PAID.
      for (const order of newlyPaid) {
        if (!order.userId) continue;
        try {
          const pdb = await privateDb();
          addNotification(
            pdb,
            order.userId,
            "Pembayaran berhasil",
            `Transaksi ${order.id} untuk ${order.product || "Produk"} sudah PAID.`,
            "success"
          );
          await savePrivateDb(pdb);
          await sendPushToUser(pdb, order.userId, {
            title: "Pembayaran berhasil",
            body: `Transaksi ${order.id} untuk ${order.product || "Produk"} sudah PAID.`,
            data: { type: "payment_paid", orderId: order.id, link: `cek-transaksi.html?order=${encodeURIComponent(order.id)}` }
          });
        } catch (pushError) {
          console.error("ADMIN MANUAL PAID USER NOTIFICATION ERROR", order.id, pushError);
        }
      }

      return res.status(200).json({ success: true, record });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("ADMIN STORE ERROR", error);
    return res.status(500).json({
      error: error.message || "Gagal mengelola database toko."
    });
  }
};
