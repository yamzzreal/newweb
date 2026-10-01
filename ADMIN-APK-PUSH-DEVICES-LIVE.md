# Yamzz Admin APK — Push, Perangkat & Live Transaksi

## Yang sudah ditambahkan

- Login admin disimpan di `localStorage` dengan masa berlaku 30 hari.
- Sesi login dicatat server pada `adminSessions`.
- Menu **Perangkat** menampilkan:
  - nama perangkat
  - IP
  - lokasi berdasarkan metadata Vercel (kota/region/negara jika tersedia)
  - sejak kapan login
  - terakhir aktif
  - perangkat yang sedang dipakai
  - tombol keluarkan sesi perangkat lain
- Halaman **Transaksi** melakukan sinkronisasi otomatis setiap 10 detik.
- Tersedia tombol Refresh dan indikator LIVE.
- Webhook pembayaran yang berubah menjadi `paid` mengirim FCM ke seluruh perangkat admin yang terdaftar.
- Saat aplikasi sedang terbuka, push juga diteruskan ke notifikasi lokal Android.
- Token FCM tersimpan bersama sesi/perangkat admin.

## Firebase untuk APK Admin

APK admin memakai package:

`id.myid.yamzzmarket.admin`

Firebase harus memiliki Android App dengan package name tersebut. File:

`admin-app/android/app/google-services.json`

harus berasal dari Android App Firebase **Yamzz Admin**, bukan file customer `id.myid.yamzzmarket`.

Setelah file tersedia:

```bash
cd admin-app
npm install
npx cap sync android
cd android
./gradlew assembleDebug
```

## Backend environment

Push server menggunakan:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `YAMZZ_AUTH_SECRET`
- `YAMZZ_ADMIN_USERNAME`
- `YAMZZ_ADMIN_PASSWORD`

`FIREBASE_SERVICE_ACCOUNT_JSON` adalah service account Firebase/Google Cloud untuk project yang sama dengan Firebase Messaging APK admin.

## Catatan lokasi

Lokasi perangkat di halaman Perangkat bukan GPS. Backend menggunakan header geolokasi dari Vercel (kota/region/negara) bila tersedia, bersama IP publik request. Ini menghindari permintaan izin lokasi Android hanya untuk menampilkan sesi login.

## Push transaksi

Webhook sudah mengirim push hanya ketika order berubah menjadi `paid`, sehingga webhook yang sama tidak mengirim notifikasi transaksi berulang-ulang untuk order yang sudah paid.
