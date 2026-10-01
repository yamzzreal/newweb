# Push Notification Promo & Diskon

## 1. Firebase
Buat project Firebase, tambahkan Android app dengan package:
`id.myid.yamzzmarket`

Download `google-services.json` dan simpan sebagai:
`mobile-app/android/app/google-services.json`

## 2. Backend Vercel
Environment variable:
`FIREBASE_SERVICE_ACCOUNT_JSON`
Isi dengan JSON service account Firebase (satu baris juga boleh).

Jangan masukkan service account JSON ke GitHub atau frontend.

## 3. Alur
- Aplikasi meminta izin notifikasi.
- FCM memberikan device token.
- Token dikirim ke `/api/push/register`.
- Admin menyimpan promo melalui menu Informasi.
- Jika isi promo berubah dan popup aktif, backend mem-broadcast push ke device yang terdaftar.
- Tap notifikasi membuka halaman promo.

## 4. Android
Pastikan permission POST_NOTIFICATIONS tersedia pada Android 13+.
Plugin Capacitor Push Notifications menangani permission dan token registration.
