# Yamzz Market Android App

Project ini membungkus website Yamzz Market menjadi aplikasi Android dengan desain website yang sama.

## Fitur
- Tampilan menggunakan website Yamzz Market yang sudah ada.
- Fullscreen/standalone Android app.
- Push notification Android untuk promo & diskon.
- Saat admin mengubah promo aktif, backend dapat mengirim notifikasi ke perangkat yang sudah terdaftar.
- Font Awesome dan tema blue-neon tetap berasal dari website.

## Build
1. Masuk folder `mobile-app`.
2. Jalankan `npm install`.
3. Jalankan `npx cap add android`.
4. Letakkan `google-services.json` Firebase ke `android/app/google-services.json`.
5. Jalankan `npx cap sync android`.
6. Buka `android` di Android Studio, lalu Build APK/AAB.

## Catatan
`server.url` sengaja diarahkan ke website online agar semua API, login, pembayaran, dan database yang sudah berjalan tetap digunakan oleh aplikasi.
Jika domain website berubah, ubah `server.url` di `capacitor.config.ts`.

Push notification memerlukan konfigurasi Firebase Cloud Messaging dan environment backend yang dijelaskan di `PUSH-NOTIFICATION-SETUP.md`.
