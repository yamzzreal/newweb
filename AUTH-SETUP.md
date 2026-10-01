# Yamzz Market — User Account / Reseller Setup

Fitur baru:
- Login user dan Create Akun.
- Jenis akun Customer / Reseller.
- Upgrade Customer -> Reseller menggunakan QRIS Yamzz Payment.
- Profil user, notifikasi transaksi, notifikasi admin, dan chat admin.
- Admin > Akun untuk melihat transaksi, blokir/buka blokir, atur sandi, dan chat.
- Harga upgrade reseller dapat diatur dari Admin > Pengaturan.

## Vercel Environment Variables

Tambahkan:
- `DATABASE_URL` = connection string Neon Postgres.
- `YAMZZ_AUTH_SECRET` = string rahasia panjang, minimal 32 karakter.
- `YAMZZ_ADMIN_USERNAME` = username admin.
- `YAMZZ_ADMIN_PASSWORD` = password admin.

Variable Yamzz Payment yang sudah dipakai project tetap:
- `YAMZZ_PAYMENT_API_KEY`
- `YAMZZ_PAYMENT_URL / YAMZZ_PAYMENT_API_KEY`

## Database Neon

Project sekarang menyimpan data toko dan data akun di Neon Postgres. Driver Neon berjalan di backend Vercel; connection string hanya disimpan sebagai `DATABASE_URL` di Environment Variables.

Tabel yang dibuat otomatis saat API pertama kali dipanggil:
- `yamzz_store` — site, kategori, produk, transaksi, testimoni/rating.
- `yamzz_private` — user, notifikasi, chat, reseller payment, wallet, top up, withdrawal.

Jangan menaruh `DATABASE_URL` di HTML/JS.

## Setelah deploy

1. Login admin melalui `login.html`.
2. Buka Admin > Pengaturan.
3. Isi `Harga Upgrade Reseller (Rp)`.
4. Simpan.
5. Pelanggan buka `akun.html`, buat akun, login, lalu pilih Upgrade ke Reseller.
6. Setelah pembayaran Yamzz Payment terdeteksi PAID, status akun otomatis berubah menjadi Reseller dan notifikasi dikirim.

Catatan: akun yang melakukan checkout saat sudah login akan ditautkan ke transaksi melalui `userId`. Transaksi lama tanpa `userId` tetap dapat dicocokkan admin berdasarkan nomor WhatsApp.

## WALLET RESELLER + TOP UP

Sistem wallet menggunakan private data Neon yang sama dengan akun.

Field otomatis yang digunakan:
- `users[].balance`
- `walletLedger[]`
- `topups[]`
- `withdrawals[]`
- `walletSettings`

### Sumber saldo
1. Komisi reseller dari produk yang memiliki `commission` > 0. Komisi masuk satu kali ketika order reseller menjadi `paid`.
2. Top up saldo melalui DANA, SeaBank, atau QRIS otomatis.
3. Admin dapat melakukan penyesuaian saldo dari Admin > Wallet.

### Metode top up
- **DANA**: transfer manual ke nomor DANA yang diatur admin, lalu pelanggan mengirim bukti. Admin menyetujui secara manual.
- **SeaBank**: transfer manual ke rekening SeaBank yang diatur admin, lalu pelanggan mengirim bukti. Admin menyetujui secara manual.
- **QRIS**: QRIS dinamis dibuat otomatis oleh Yamzz Payment. Status dapat dikonfirmasi melalui polling dan webhook.

### Penarikan
Hanya akun `reseller` yang dapat menarik saldo. Saldo ditahan ketika request dibuat. Jika admin menolak, saldo + biaya penarikan dikembalikan. Jika admin menandai dibayar, saldo tidak dikembalikan.

### Pengaturan admin
Admin > Wallet dapat mengatur:
- Minimal top up
- Minimal penarikan
- Biaya penarikan
- Nomor & nama DANA
- Nomor rekening & nama SeaBank
- Aktif/nonaktif DANA, SeaBank, QRIS

### Komisi produk
Di Admin > Produk > Tambah/Edit Produk terdapat **Komisi Reseller (Rp)**. Contoh `2000` berarti setiap transaksi produk tersebut yang dibayar oleh reseller memberikan Rp2.000 ke saldo reseller.
