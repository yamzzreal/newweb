# Yamzz Market × Yamzz Payment

Yamzz Market menggunakan Yamzz Payment sebagai gateway QRIS. Konfigurasi gateway hanya menggunakan environment Yamzz Payment.

## Environment Vercel

```env
YAMZZ_PAYMENT_URL=https://DOMAIN-YAMZZ-PAYMENT-KAMU
YAMZZ_PAYMENT_API_KEY=API_KEY_MERCHANT_KAMU
YAMZZ_PAYMENT_WEBHOOK_SECRET=SECRET_WEBHOOK_KAMU
```

API key hanya digunakan di backend. Jangan taruh di JavaScript frontend.

## Endpoint Market

Pembayaran produk:
- `POST /api/yamzz-payment/create`
- `POST /api/yamzz-payment/status`
- `POST /api/yamzz-payment/webhook`

Top up saldo dan upgrade reseller juga menggunakan endpoint `payment-create` dan `payment-status` milik Yamzz Payment melalui backend Market.

## Webhook

Jika gateway kamu mengirim webhook HMAC, URL callback Market adalah:

```text
https://DOMAIN-YAMZZ-MARKET-KAMU/api/yamzz-payment/webhook
```

Header signature yang diterima:
`X-Yamzz-Payment-Signature`

Secret harus sama dengan `YAMZZ_PAYMENT_WEBHOOK_SECRET`.

## Catatan penting

Pembuatan QRIS tidak otomatis berarti pembayaran sudah PAID. Status PAID harus berasal dari sumber verifikasi pembayaran yang sah. Market juga melakukan polling ke endpoint status Yamzz Payment untuk transaksi produk, top up, dan upgrade reseller.
