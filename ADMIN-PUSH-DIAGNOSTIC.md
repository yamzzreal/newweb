# Push Notification Admin

## Dua jalur notifikasi

1. **FCM**: bekerja saat aplikasi di background/ditutup. APK admin harus memiliki `android/app/google-services.json` yang dibuat di Firebase untuk package `id.myid.yamzzmarket.admin`.
2. **Local fallback**: aplikasi admin mengecek transaksi setiap 10 detik dan membuat notifikasi lokal ketika ada transaksi paid baru. Ini membantu saat FCM belum dikonfigurasi, tetapi hanya bekerja ketika aplikasi masih aktif.

## Firebase wajib untuk notif saat aplikasi ditutup

Buat Android App baru di Firebase dengan package:

`id.myid.yamzzmarket.admin`

Download `google-services.json` dan letakkan di:

`admin-app/android/app/google-services.json`

Pastikan Environment Vercel memiliki:

`FIREBASE_SERVICE_ACCOUNT_JSON`

Isinya service account JSON dari project Firebase yang sama.

## Verifikasi

1. Login ke APK admin.
2. Buka Logcat dan cari `[Yamzz Admin] Push token tersimpan.`
3. Di Vercel Logs, saat transaksi menjadi paid harus terlihat `ADMIN PAYMENT PUSH RESULT` dengan `sent: 1` atau lebih.
4. Jika `sent: 0`, cek `adminPushDevices` dan `FIREBASE_SERVICE_ACCOUNT_JSON`.
