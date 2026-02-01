# IBRA - Industri Bioskop Romansa Asia

Platform streaming drama pendek Asia tanpa login, tanpa iklan, dengan fokus pada pengalaman menonton yang cepat dan aman.

## Fitur Utama

- **Tanpa Login**: Identitas pengguna digantikan dengan identitas perangkat
- **Tanpa Iklan**: Pengalaman menonton tanpa gangguan
- **Quick Watch**: Mode scrolling untuk konsumsi cepat
- **Smart Resume**: Otomatis melanjutkan dari episode terakhir
- **Bookmark Lokal**: Simpan favorit tanpa akun
- **Mode Hemat Data**: Otomatis menyesuaikan kualitas jaringan
- **Keamanan Terjamin**: Server-side authority dengan enkripsi stream

## Arsitektur

```
[ Frontend IBRA (Port 8123) ]
         |
         v
[ Backend IBRA (Port 8124) ]
         |
         v
[ Provider Drama (Private) ]
```

## Persyaratan Sistem

- Node.js 18+
- npm atau yarn
- Browser modern dengan dukungan ES2020

## Instalasi

```bash
# Clone repositori
git clone https://github.com/your-repo/ibra.git
cd ibra

# Install semua dependensi
npm run install:all

# Atau install secara terpisah
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Menjalankan Aplikasi

### Mode Development

```bash
# Jalankan frontend dan backend secara bersamaan
npm run dev
```

- **Frontend**: http://ibra.biz.id:8123
- **Backend API**: http://api.ibra.biz.id:8124

### Mode Production (Domain dengan Cloudflare SSL)

```bash
# Build frontend
npm run build

# Jalankan backend dengan HTTP (Cloudflare SSL di luar)
cd backend && npm start
```

- **Frontend**: https://ibra.biz.id (Cloudflare SSL terminates SSL)
- **Backend API**: https://api.ibra.biz.id (Cloudflare SSL terminates SSL)

### Mode Production

```bash
# Build frontend
npm run build

# Jalankan backend
cd backend && npm start
```

## Struktur Proyek

```
ibra/
├── package.json              # Konfigurasi root untuk kedua app
├── README.md
├── backend/
│   ├── package.json
│   ├── server.js             # Entry point backend
│   ├── routes/
│   │   ├── client.js         # Autentikasi perangkat
│   │   ├── content.js        # Konten & API provider
│   │   ├── stream.js         # Video streaming
│   │   └── local.js          # Data lokal (SQLite)
│   ├── services/
│   │   └── database.js       # Konfigurasi SQLite
│   └── utils/
│       └── security.js       # Analisis perangkat
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── logo.png
│   │   └── favicon.jpg
│   └── src/
│       ├── main.jsx          # Entry point React
│       ├── App.jsx           # Router & Context
│       ├── index.css         # Global styles
│       ├── services/
│       │   └── api.js        # API client
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── SearchPage.jsx
│       │   ├── DetailPage.jsx
│       │   ├── PlayerPage.jsx
│       │   └── LibraryPage.jsx
│       └── components/
│           ├── LoadingSpinner.jsx
│           └── Icons.jsx
```

## Konfigurasi Backend

### Port
- **API Server**: 8124

### Database
- **Type**: SQLite (better-sqlite3)
- **Location**: `backend/data/ibra.db`

### API Endpoints

#### Client
- `POST /api/client/handshake` - Buat sesi perangkat
- `POST /api/client/validate` - Validasi sesi
- `POST /api/client/refresh` - Perbarui sesi

#### Content
- `GET /api/content/latest` - Konten terbaru
- `GET /api/content/trending` - Konten trending
- `GET /api/content/search` - Pencarian
- `GET /api/content/detail/:id` - Detail drama
- `GET /api/content/recommendations` - Rekomendasi

#### Stream
- `GET /api/stream/episode/:id` - Stream episode
- `POST /api/stream/report-progress` - Laporkan progres

#### Local
- `GET/POST /api/local/history` - Riwayat menonton
- `GET/POST /api/local/favorites` - Daftar favorit
- `GET/POST /api/local/preferences` - Preferensi pengguna

## Konfigurasi Frontend

### Port
- **Development**: 8123

### Fitur UI

#### Navigasi
- Bottom navigation dengan gesture support
- Home, Search, Library

#### Home
- Hero carousel auto-slide
- Section: Trending, Terbaru, Rekomendasi
- Infinite scroll dengan skeleton loading
- Pull to refresh

#### Search
- Real-time search dengan debounce
- Riwayat pencarian lokal
- Suggestion otomatis

#### Player
- Gesture controls:
  - Double tap: Play/Pause
  - Double tap kiri/kanan: -/+10 detik
  - Tahan: Ubah kecepatan (0.5x - 2x)
  - Swipe atas/bawah: Volume/Brightness
  - Swipe kiri/ kanan: Seek
- Auto-play episode berikutnya
- Speed selector
- Watermark IBRA

#### Library
- Tab: Lanjutkan, Favorit
- Hapus item
- Bersihkan semua data

## Keamanan

### Silent Handshake
Aplikasi melakukan autentikasi perangkat secara otomatis saat dibuka:
1. Mengirim device fingerprint & timestamp
2. Server memverifikasi keaslian aplikasi
3. Menghasilkan session token sementara (10 menit)

### Stream Aman
- Link stream bersifat sementara (TTL 45 detik)
- Tidak ada link permanen
- Device mencurigakan diblokir otomatis

### Privasi
- Tidak mengumpulkan data pribadi
- Penyimpanan lokal hanya untuk preferensi
- Analytics hanya untuk metrik agregat

## Optimasi Gambar

Backend secara otomatis mengkonversi gambar HEIC ke format web:

```javascript
// Sebelum
https://contoh.com/image.heic

// Sesudah
https://contoh.com/image.webp
```

## Mode Hemat Data

Aplikasi secara otomatis mendeteksi jaringan:
- **WiFi**: Kualitas tinggi, preload aktif
- **Mobile (4G)**: Kualitas sedang
- **Mobile (3G/Low)**: Kualitas rendah

## Pengembangan

### Menambah Provider Baru

1. Edit `backend/routes/content.js`
2. Tambahkan endpoint baru di switch statement
3. Update fungsi `normalizeDrama()`

### Menambah Halaman

1. Buat component di `frontend/src/pages/`
2. Tambah route di `frontend/src/App.jsx`

### Custom Theme

Edit `frontend/src/index.css` untuk mengubah warna:

```css
:root {
  --primary-color: #c9a227;  /* Emas */
  --bg-color: #0a0a0a;       /* Hitam */
  --card-bg: #1a1a1a;        /* Abu gelap */
}
```

## Lisensi

Hak Cipta © Ibra Decode. Semua hak dilindungi undang-undang.

Dilarang menyalin, mendistribusikan, atau memodifikasi tanpa izin tertulis.
