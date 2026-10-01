# Yamzz Admin Android App

APK khusus admin Jasteb Yamzz Market.

## Fitur
- Login memakai akun admin yang sama dengan `/admin.html`.
- Admin Panel berjalan di dalam APK.
- Push notification FCM khusus admin.
- Notifikasi saat transaksi baru dibuat.
- Notifikasi saat pembayaran berubah menjadi PAID.
- Tap notifikasi membuka Admin Panel.
- Token admin dipisahkan dari token push pelanggan.

## Build
1. Di Firebase project Yamzz Market, tambahkan Android app baru dengan package:
   `id.myid.yamzzmarket.admin`
2. Download `google-services.json`.
3. Simpan di `admin-app/android/app/google-services.json`.
4. Jalankan:
   `npm install`
   `npx cap sync android`
   `npx cap open android`
5. Build APK dari Android Studio.

## Backend
Vercel wajib memiliki:
`FIREBASE_SERVICE_ACCOUNT_JSON`

Aplikasi memakai:
`https://jasteb.yamzzmarket.my.id/admin.html`
