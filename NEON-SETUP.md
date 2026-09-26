# Yamzz Market — Neon Database Setup

Project ini menggunakan Neon Postgres.

## 1. Buat project Neon

Buat database di Neon dan salin connection string PostgreSQL.

Contoh format:

```text
postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

## 2. Vercel Environment Variables

Tambahkan:

```text
DATABASE_URL=connection-string-Neon-kamu

YAMZZ_AUTH_SECRET=rahasia-panjang-minimal-32-karakter
YAMZZ_ADMIN_USERNAME=username-admin
YAMZZ_ADMIN_PASSWORD=password-admin

YAMZZ_PAYMENT_API_KEY=...
YAMZZ_PAYMENT_URL / YAMZZ_PAYMENT_API_KEY=...
YAMZZ_PAYMENT_WEBHOOK_SECRET=...

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

`DATABASE_URL` hanya boleh berada di server/Vercel Environment Variables.

## 3. Deploy

Setelah `DATABASE_URL` ditambahkan, deploy ulang Vercel.

API akan membuat tabel berikut secara otomatis:

- `yamzz_store`
- `yamzz_private`

Tidak perlu membuat tabel manual.

## 4. Memasukkan data lama

Kode aplikasi sudah memakai Neon, tetapi **data Neon lama tidak bisa saya salin otomatis dari project ini karena akses Neon kamu sedang terkena `Requests exhausted`**.

Untuk migrasi data lama, siapkan dua file JSON:

### `store.json`

Berisi record toko lama:

```json
{
  "site": {},
  "categories": [],
  "products": [],
  "orders": [],
  "testimonials": [],
  "ratings": []
}
```

### `private.json`

Berisi record private:

```json
{
  "users": [],
  "notifications": [],
  "messages": [],
  "resellerPayments": [],
  "walletLedger": [],
  "topups": [],
  "withdrawals": [],
  "walletSettings": {}
}
```

Lalu jalankan:

```bash
npm install
node scripts/import-neon.js store.json private.json
```

Script hanya menulis data ke Neon.

## 5. Yang sudah tidak diperlukan

Setelah migrasi selesai, project tidak lagi membutuhkan:

```text
LEGACY_DATA_ID
LEGACY_MASTER_KEY
YAMZZ_PRIVATE_BIN_ID
YAMZZ_PRIVATE_MASTER_KEY
```

Hapus variable tersebut dari Vercel setelah memastikan data Neon sudah benar.

## 6. Endpoint yang berubah

Frontend tidak lagi membaca Neon langsung.

- `/api/store` — data publik toko
- `/api/transaction/check` — cek transaksi berdasarkan ID + WhatsApp
- `/api/admin/store` — baca/simpan database toko khusus admin

Semua akses database dilakukan dari backend.

## Fitur Wallet/Auth tambahan

Tambahkan environment variable berikut di Vercel untuk fitur lupa password:

```text
APP_URL=https://domain-kamu.com
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=Yamzz Market <noreply@domain-kamu.com>
```

`TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` digunakan untuk notifikasi:
- Top up baru
- Top up berhasil/approved
- Penarikan baru
- Penarikan dibayar

Wallet sekarang mendukung metode top up dan metode penarikan yang dapat ditambah/hapus dari Admin Panel.

Akun `customer` dan `reseller` sama-sama dapat melakukan penarikan. Pembelian produk dan upgrade reseller dapat menggunakan saldo akun.
