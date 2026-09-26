"use strict";

// All handlers are imported statically so Vercel can detect and bundle
// every dependency used by this single Serverless Function.
const handlers = {
  "/api/store": require("../lib/api/store"),
  "/api/transaction/check": require("../lib/api/transaction-check"),
  "/api/auth/login": require("../lib/api/auth/login"),
  "/api/auth/register": require("../lib/api/auth/register"),
  "/api/auth/forgot-password": require("../lib/api/auth/forgot-password"),
  "/api/auth/reset-password": require("../lib/api/auth/reset-password"),
  "/api/auth/me": require("../lib/api/auth/me"),
  "/api/auth/notifications": require("../lib/api/auth/notifications"),
  "/api/push/register": require("../lib/api/push/register"),
  "/api/auth/chat": require("../lib/api/auth/chat"),
  "/api/auth/transactions": require("../lib/api/auth/transactions"),

  "/api/admin/login": require("../lib/api/admin/login"),
  "/api/admin/accounts": require("../lib/api/admin/accounts"),
  "/api/admin/chat": require("../lib/api/admin/chat"),
  "/api/admin/account-transactions": require("../lib/api/admin/account-transactions"),
  "/api/admin/upgrade": require("../lib/api/admin/upgrade"),
  "/api/admin/wallet": require("../lib/api/admin/wallet"),
  "/api/admin/store": require("../lib/api/admin/store"),
  "/api/admin/push/broadcast": require("../lib/api/admin/push-broadcast"),

  "/api/wallet/me": require("../lib/api/wallet/me"),
  "/api/wallet/topup": require("../lib/api/wallet/topup"),
  "/api/wallet/topup-status": require("../lib/api/wallet/topup-status"),
  "/api/wallet/withdraw": require("../lib/api/wallet/withdraw"),

  "/api/reseller/create": require("../lib/api/reseller/create"),
  "/api/reseller/status": require("../lib/api/reseller/status"),

  "/api/yamzz-payment/create": require("../lib/api/yamzz-payment/create"),
  "/api/yamzz-payment/status": require("../lib/api/yamzz-payment/status"),
  "/api/yamzz-payment/webhook": require("../lib/api/yamzz-payment/webhook"),
  "/api/yamzz-payment/get-ratings": require("../lib/api/yamzz-payment/get-ratings"),
  "/api/yamzz-payment/get-testimonials": require("../lib/api/yamzz-payment/get-testimonials"),
  "/api/yamzz-payment/submit-rating": require("../lib/api/yamzz-payment/submit-rating")
};

module.exports = async (req, res) => {
  const pathname = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  ).pathname.replace(/\/$/, "") || "/";

  const handler = handlers[pathname];

  if (!handler) {
    return res.status(404).json({
      error: "API endpoint not found",
      path: pathname
    });
  }

  try {
    return await handler(req, res);
  } catch (error) {
    console.error("API router error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
};
