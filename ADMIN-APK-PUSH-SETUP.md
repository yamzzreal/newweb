# Admin APK + Push Notification

## File backend
Deploy perubahan:
- `lib/push.js`
- `lib/api/admin/push-register.js`
- `lib/api/yamzz-payment/create.js`
- `lib/api/yamzz-payment/status.js`
- `lib/api/yamzz-payment/webhook.js`
- `admin.html`
- `js/admin-push.js`

## Environment
Vercel:
`FIREBASE_SERVICE_ACCOUNT_JSON=<service account JSON Firebase>`

## Notifikasi
1. QRIS/gateway: saat transaksi dibuat -> `Transaksi baru masuk`.
2. Saat pembayaran menjadi PAID -> `Pembayaran berhasil`.
3. Pembelian dengan saldo -> `Transaksi baru` status paid.
4. Webhook/status yang dipanggil ulang tidak mengirim PAID berulang karena `wasPaid`.

## Firebase
Tambahkan Android App baru:
`id.myid.yamzzmarket.admin`

Masukkan `google-services.json` hasil download ke:
`admin-app/android/app/google-services.json`
