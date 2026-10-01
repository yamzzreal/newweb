const YAMZZ_PAYMENT_API = String(process.env.YAMZZ_PAYMENT_URL || "").replace(/\/$/, "");
const YAMZZ_PAYMENT_API_KEY = String(process.env.YAMZZ_PAYMENT_API_KEY || "");
const YAMZZ_PAYMENT_WEBHOOK_SECRET = String(process.env.YAMZZ_PAYMENT_WEBHOOK_SECRET || "");

const { readStore, writeStore } = require("../../db");

async function storeDb() {
  return readStore();
}

async function save(db) {
  return writeStore(db);
}

function clean(s, max=200) {
  return String(s ?? "").trim().slice(0,max);
}

function gatewayHeaders(extra = {}) {
  return {
    "X-API-Key": YAMZZ_PAYMENT_API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...extra
  };
}

function gatewayConfigured() {
  return Boolean(YAMZZ_PAYMENT_API && YAMZZ_PAYMENT_API_KEY);
}

module.exports = {
  YAMZZ_PAYMENT_API,
  YAMZZ_PAYMENT_API_KEY,
  YAMZZ_PAYMENT_WEBHOOK_SECRET,
  gatewayHeaders,
  gatewayConfigured,
  storeDb,
  save,
  clean
};
