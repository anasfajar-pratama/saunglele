# Saung Lele CRM

Implementasi CRM untuk usaha ternak dan jual beli lele, dibangun dari `design.md` dan prototype HTML di `prototype/`.

**Stack:** Laravel 12 · Inertia.js · React 18 · TypeScript · Tailwind · MySQL (MariaDB XAMPP)

---

## Fitur MVP

- **Dashboard**: follow-up hari ini, health pelanggan, pipeline, PO berjalan, performa segmen.
- **Pelanggan**: profil, kontak PIC, preferensi segmen, health score, filter, pencarian.
- **Detail pelanggan**: timeline interaksi, catatan + follow-up, quotation, PO, buyback, dokumen.
- **Pipeline lead**: kanban 5 tahap, next action, update tahap, konversi lead menang menjadi pelanggan.
- **Template pesan**: kategori, variabel, pratinjau WhatsApp, salin pesan, tambah template.
- **Quotation**: katalog produk per segmen, baris item dinamis, ongkir/PPN, riwayat, halaman cetak.
- **PO**: terima PO, item, status 7 tahap, riwayat progres, jadwal pengiriman, surat jalan (print).
- **Buyback**: siklus mitra kolam, sampling, grafik ABW, jadwal buyback, estimasi biomassa.
- **Laporan**: retensi, compliance follow-up, sumber lead, alasan kalah, on-time delivery, buyback, pelanggan berisiko.
- **WhatsApp**: mode klik-untuk-chat (`wa.me`) dan pencatatan pesan ke timeline. Belum memakai WhatsApp Cloud API.

---

## Struktur Proyek

```
saungLele/
├─ backend/                 # Laravel 12 + Inertia + React
│  ├─ app/Http/Controllers/ # Dashboard, Customer, Lead, Quotation, PO, Buyback, Report
│  ├─ database/migrations/  # Skema CRM
│  ├─ database/seeders/     # Data demo
│  └─ resources/js/Pages/   # Halaman React
├─ prototype/               # Mockup HTML statis
├─ dokumen/                 # Surat penawaran & panduan penggunaan
│  ├─ penawaran-saung-lele.html
│  ├─ panduan-penggunaan.html
│  └─ screenshots/          # Screenshot aplikasi
├─ design.md                # Dokumen desain
└─ README.md
```

---

## Menjalankan Aplikasi

### 1. Prasyarat

- PHP 8.2+ (XAMPP)
- Composer 2
- Node.js 20.19+ atau 22.12+
- MySQL/MariaDB (XAMPP)

### 2. Buat database

```bash
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS saung_lele_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3. Siapkan backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
```

Sesuaikan `.env` bila kredensial MySQL berbeda:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=saung_lele_crm
DB_USERNAME=root
DB_PASSWORD=
```

### 4. Install dependency frontend

> Catatan: di environment ini npm global memakai `omit=dev`, jadi gunakan `--include=dev`.

```bash
npm install --include=dev
```

### 5. Migrasi dan data demo

```bash
php artisan migrate:fresh --seed
```

Perintah ini akan **menghapus seluruh data** dan mengisi data demo.

### 6. Build dan jalankan

```bash
npm run build
php artisan serve --host=127.0.0.1 --port=8000
```

Buka: **http://127.0.0.1:8000**

### Mode pengembangan

```bash
# terminal 1
php artisan serve --host=127.0.0.1 --port=8000

# terminal 2
npm run dev
```

---

## Akun Demo

| Role | Email | Password |
|---|---|---|
| Pemilik | `owner@saunglele.test` | `password` |
| Sales | `rizky@saunglele.test` | `password` |
| Sales | `dina@saunglele.test` | `password` |
| Admin | `admin@saunglele.test` | `password` |
| Produksi | `wati@saunglele.test` | `password` |
| Keuangan | `finance@saunglele.test` | `password` |

---

## Dokumen

- **Surat penawaran sewa sistem:** `dokumen/penawaran-saung-lele.html`
- **Panduan penggunaan interaktif:** `dokumen/panduan-penggunaan.html`
- Kedua dokumen memakai logo `kebunkode.jpg`, screenshot aplikasi di `dokumen/screenshots/`, dan bisa dicetak ke PDF dari browser.
- Salinan publik tersedia di `backend/public/dokumen/` agar bisa dibuka dari halaman login. Jika dokumen diubah, salin ulang folder `dokumen/` ke `backend/public/dokumen/`.

---

## Sebelum Publish Demo

Demo publik harus dianggap sebagai lingkungan yang terekspos internet. Lakukan minimal:

1. **Patch PHP sekarang juga.** Lingkungan lokal memakai PHP 8.2.12; versi ini lebih lama dari patch keamanan kritis PHP 21 Oktober 2026 (CVE-2026-109618 dan CVE-2026-109619). Gunakan minimal **PHP 8.2.35**, dan lebih baik **PHP 8.3.36 atau 8.4.27**. PHP 8.2 juga mencapai EOL pada 31 Desember 2026.
2. Set `APP_ENV=production`, `APP_DEBUG=false`, dan `APP_URL` sesuai domain HTTPS.
3. Gunakan database khusus demo dan user MySQL non-root dengan password kuat. Jangan memakai database produksi.
4. Disable registrasi publik bila tidak diperlukan; gunakan akun demo yang sudah disiapkan.
5. Reset database demo secara berkala dan jangan pernah memasukkan data pelanggan asli.
6. Aktifkan HTTPS, backup, rate limiting, dan bila perlu WAF.
7. Jalankan `php artisan config:cache`, `php artisan route:cache`, `php artisan view:cache`, dan `npm run build` di server.

---

## Deploy ke Hostinger

### Dokumen root

Arahkan domain/subdomain ke folder:

```text
domains/saunglele.kebunkode.com/saunglele/backend/public
```

Jangan arahkan ke folder `backend/` saja.

### Build Vite

Laravel `.gitignore` mengabaikan `/public/build`, jadi folder build **tidak ikut** jika deploy lewat Git. Pilih salah satu:

**Opsi A — upload hasil build dari lokal (paling mudah)**

```bash
cd backend
npm install --include=dev
npm run build
```

Upload folder `backend/public/build` ke server:

```text
domains/saunglele.kebunkode.com/saunglele/backend/public/build
```

Pastikan file berikut ada:

```text
backend/public/build/manifest.json
backend/public/build/assets/
```

Zip siap upload juga tersedia di root proyek: `build-hostinger.zip`. Ekstrak isinya ke `backend/public/` sehingga terbentuk `backend/public/build/`.

**Opsi B — build di server via SSH**

```bash
cd ~/domains/saunglele.kebunkode.com/saunglele/backend
npm ci --include=dev
npm run build
php artisan optimize:clear
```

### Setelah upload

```bash
cd ~/domains/saunglele.kebunkode.com/saunglele/backend
rm -f public/hot
php artisan optimize:clear
```

Pastikan permission:

```text
public/build       755 (file 644)
storage            775
bootstrap/cache    775
```

Jika memakai Git, build folder harus di-force add atau di-upload manual:

```bash
git add -f public/build
git commit -m "Add production build assets"
```

### PHP di Hostinger

Pilih **PHP 8.3.36+** atau **PHP 8.4.27+** di hPanel. Jangan publish dengan PHP 8.2.12 karena belum memiliki patch keamanan kritis Oktober 2026. Set juga:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://saunglele.kebunkode.com
```

---

### Jika manifest 200 tetapi CSS/JS 404

Cek:

```text
https://saunglele.kebunkode.com/build/manifest.json
```

- **404** → document root domain belum mengarah ke `backend/public`, atau folder build belum ada.
- **200** → manifest terbaca. Berarti folder `assets` belum terunggah, terlipat di `build/build/assets`, atau permission-nya salah.

Gunakan `build-hostinger-flat.zip` dari root proyek. Ekstrak isinya **langsung ke**:

```text
backend/public/build/
```

Sehingga isinya menjadi:

```text
backend/public/build/manifest.json
backend/public/build/assets/app-C_GbbeKu.css
```

Jangan sampai menjadi `backend/public/build/build/assets/...`.

Cek juga permission:

```bash
chmod 755 public/build public/build/assets
chmod 644 public/build/manifest.json public/build/assets/*
```

---

## Catatan Implementasi

- **WhatsApp** memakai `wa.me` (klik-untuk-chat). Pesan dicatat ke tabel `messages` setelah dikirim.
- **Timezone aplikasi** memakai `Asia/Jakarta` (`APP_TIMEZONE`). Jika mengubah timezone, jalankan `php artisan config:clear`.
- **Dashboard follow-up** menampilkan tugas hari ini/terlambat, plus panel **Akan datang** untuk jadwal beberapa hari ke depan.
- **PDF** quotation/surat jalan menggunakan print browser (`window.print()`), belum library PDF server-side.
- **PO & delivery** dikelola manual; belum ada integrasi kurir atau inventory.
- **Health score** dan repeat rate dihitung dari data transaksi yang ada.
- Data demo mencakup 11 pelanggan, 17 lead, 100 follow-up (10 terbuka + 90 selesai), 6 siklus buyback, dan PO historis untuk laporan.
- Semua nominal memakai Rupiah dan format tanggal Indonesia.

---

## Perintah Berguna

```bash
# reset data demo
php artisan migrate:fresh --seed

# cek route
php artisan route:list --except-vendor

# build frontend
npm run build

# cek tipe TypeScript
npx tsc --noEmit
```
