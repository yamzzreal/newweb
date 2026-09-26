"use strict";

const { storeDb } = require("./yamzz-payment/_common");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await storeDb();
    return res.status(200).json({
      success: true,
      record: {
        site: db.site || {},
        categories: Array.isArray(db.categories) ? db.categories : [],
        products: Array.isArray(db.products) ? db.products : [],
        orders: Array.isArray(db.orders)
          ? db.orders.map(order => ({
              id: order.id || "",
              name: order.name || order.customer?.name || "Pelanggan",
              product: order.product || "",
              status: order.status || "",
              price: Number(order.price) || 0,
              createdAt: order.createdAt || null,
              paidAt: order.paidAt || null
            }))
          : []
      }
    });
  } catch (error) {
    console.error("STORE GET ERROR", error);
    return res.status(500).json({
      error: error.message || "Gagal mengambil database toko."
    });
  }
};
