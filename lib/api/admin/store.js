"use strict";

const { requireAdmin } = require("./_common");
const { readStore, writeStore } = require("../../db");

module.exports = async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: "Admin session tidak valid." });
  }

  try {
    if (req.method === "GET") {
      const record = await readStore();
      return res.status(200).json({ success: true, record });
    }

    if (req.method === "PUT") {
      const record = req.body || {};
      await writeStore(record);
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
