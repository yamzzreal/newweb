# Update Wallet + Auth Yamzz Market

## Yang berubah

1. Notifikasi Telegram untuk top up dan penarikan.
2. Admin Panel > Wallet dapat menambah/menghapus metode top up.
3. Admin Panel > Wallet dapat menambah/menghapus metode penarikan.
4. Akun Customer dan Reseller dapat menarik saldo.
5. Pembelian produk dapat menggunakan saldo.
6. Upgrade Customer -> Reseller dapat menggunakan saldo atau QRIS.
7. Lupa password memakai link sekali pakai 15 menit melalui email.
8. Riwayat saldo mencatat pembelian, upgrade, top up, penarikan, dan refund.

## Environment Vercel

Wajib untuk Telegram:

```text
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Wajib untuk forgot password:

```text
APP_URL=https://domain-kamu.com
RESEND_API_KEY=re_...
RESEND_FROM=Yamzz Market <noreply@domain-kamu.com>
```

## Cara pakai Admin Panel

Buka Admin Panel -> Wallet.

- Isi minimal top up.
- Isi minimal penarikan.
- Isi biaya penarikan.
- Pada Metode Top Up klik `+ Tambah Metode Top Up`.
- Pada Metode Penarikan klik `+ Tambah Metode Penarikan`.
- Isi ID, nama metode, nomor/rekening, nama pemilik, lalu aktifkan.
- Klik `Simpan Wallet`.

Data metode lama DANA/SeaBank otomatis dikonversi ke format baru saat wallet pertama kali dibaca.

## Catatan pembayaran saldo

Pembelian dengan saldo langsung menjadi `paid`, stok berkurang satu, dan jika produk memiliki `deliveryLink/productLink/link`, link tersebut dikirim ke popup pembayaran.

Harga yang dipotong adalah harga produk + admin fee acak yang sudah digunakan project.

## File utama yang berubah

- `lib/telegram.js`
- `lib/api/wallet/_common.js`
- `lib/api/wallet/topup.js`
- `lib/api/wallet/topup-status.js`
- `lib/api/wallet/withdraw.js`
- `lib/api/wallet/me.js`
- `lib/api/admin/wallet.js`
- `lib/api/auth/_common.js`
- `lib/api/auth/forgot-password.js`
- `lib/api/auth/reset-password.js`
- `lib/api/yamzz-payment/create.js`
- `lib/api/reseller/create.js`
- `api/index.js`
- `js/user-auth.js`
- `js/payment.js`
- `js/admin.js`
- `akun.html`
- `forgot-password.html`
- `reset-password.html`
- `css/admin.css`
- `NEON-SETUP.md`
