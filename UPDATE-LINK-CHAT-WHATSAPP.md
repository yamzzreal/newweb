# Yamzz Market — Update Link Produk, Chat Admin & WhatsApp Admin

## 1. Email link produk
Produk yang memiliki `deliveryLink`, `productLink`, atau `link` akan mengirim email otomatis setelah order berstatus `PAID`, selama customer memiliki email.

Environment Vercel yang dipakai:
```text
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=Yamzz Market <noreply@domain-kamu.com>
```

Email dikirim dari backend menggunakan Resend. Order diberi `productEmailSentAt` setelah berhasil dikirim.

## 2. Notifikasi chat customer ke admin
Saat customer mengirim pesan melalui Chat Admin:
- pesan tersimpan seperti biasa;
- APK admin menerima push notification melalui FCM;
- APK juga memiliki polling chat sebagai fallback ketika push bermasalah;
- notifikasi membuka `admin.html`.

## 3. Kontrol WhatsApp Admin
Admin Panel sekarang memiliki halaman **WhatsApp Admin**.

Admin dapat:
- mengaktifkan WhatsApp Admin;
- menonaktifkan WhatsApp Admin saat nomor/layanan sedang bermasalah.

Saat dinonaktifkan:
- tombol WhatsApp customer tidak diarahkan ke nomor admin;
- customer melihat pemberitahuan bahwa WhatsApp Admin sedang bermasalah;
- customer diarahkan menggunakan Chat Admin atau mencoba kembali nanti.

Status disimpan pada:
```json
{
  "site": {
    "whatsappEnabled": true
  }
}
```

Default-nya `true`, jadi data lama tetap menggunakan WhatsApp aktif.

## 4. APK
Source Admin APK sudah diperbarui pada:
- `admin-app/www/js/admin.js`
- `admin-app/www/js/admin-push.js`
- `admin-app/www/admin.html`

Setelah source diperbarui, build ulang APK dengan Android SDK yang sudah dikonfigurasi:
```bash
cd admin-app
npx cap copy android
cd android
./gradlew assembleDebug
```

Jika Android SDK/Build Tools belum terpasang, Gradle belum dapat menghasilkan APK sampai SDK dan lisensinya tersedia.
