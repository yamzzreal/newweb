"use strict";

const { storeDb } = require("./yamzz-payment/_common");

function normalizePhone(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .replace(/^62/, "0")
    .replace(/^0+/, "0");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const id = String(req.body?.id || "").trim().toUpperCase();
    const whatsapp = normalizePhone(req.body?.whatsapp);

    const db = await storeDb();
    const site = db.site || {};
    const orders = Array.isArray(db.orders) ? db.orders : [];

    const order = orders.find(item =>
      String(item.id || "").toUpperCase() === id &&
      normalizePhone(item.whatsapp) === whatsapp
    );

    return res.status(200).json({
      success: true,
      found: Boolean(order),
      site,
      order: order || null
    });
  } catch (error) {
    console.error("TRANSACTION CHECK ERROR", error);
    return res.status(500).json({
      error: error.message || "Gagal mengecek transaksi."
    });
  }
};
