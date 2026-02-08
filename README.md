# IBRA - Industri Bioskop Romansa Asia

<p align="center">
  <img src="/frontend/public/logo.png" alt="IBRA Logo" width="200">
</p>

<p align="center">
  <strong>Platform Streaming Drama Asia Terbaik dan Gratis</strong>
</p>

<p align="center">
  <a href="#fitur-utama">Fitur</a> •
  <a href="#teknologi">Teknologi</a> •
  <a href="#instalasi">Instalasi</a> •
  <a href="#penggunaan">Penggunaan</a> •
  <a href="#struktur-proyek">Struktur</a> •
  <a href="#api-dokumentasi">API</a> •
  <a href="#seo-optimization">SEO</a> •
  <a href="#lisensi">Lisensi</a>
</p>

---

## 📱 IBRA - Platform Streaming Drama Asia

IBRA (Industri Bioskop Romansa Asia) adalah platform streaming drama Asia terbaik dan gratis di Indonesia. Menyediakan koleksi lengkap drama dari Korea, China, Thailand, dan Indonesia dengan subtitle berkualitas tinggi.

### 🎯 Visi

Memberikan akses streaming drama Asia berkualitas tinggi secara gratis untuk semua orang, tanpa hambatan login atau biaya tersembunyi.

### 🎮 Demo

- **Production**: https://ibra.biz.id
- **API**: https://api.ibra.biz.id

---

## ✨ Fitur Utama

### 🔓 Tanpa Login
- Identitas perangkat menggantikan akun pengguna
- Session token otomatis dibuat saat aplikasi dibuka
- Privasi terjaga - tidak ada data pribadi yang disimpan

### 🎬 Gratis 100%
- Tidak ada biaya tersembunyi
- Tidak ada iklan yang mengganggu
- Tidak ada langganan
- Selamanya gratis

### 📺 Koleksi Lengkap
- **Drama Korea** - K-drama terbaru dan klasik
- **Drama China** - C-drama dengan subtitle Indonesia
- **Drama Thailand** - Thai drama BL, GL, dan romance
- **Drama Indonesia** - Local drama berkualitas

### 🎨 Kualitas Tinggi
- Multiple quality: 360p, 480p, 720p, 1080p
- Auto-detect koneksi untuk kualitas optimal
- HEIC to WebP conversion
- CDN加速 untuk loading cepat

### 🎮 Fitur Player
- **Touch Gestures**:
  - Double tap: Play/Pause
  - Double tap kiri/kanan: Seek ±10 detik
  - Hold zone kanan: 2x speed
  - Swipe atas/bawah: Volume/Brightness
  - Swipe kiri/kanan: Episode next/prev
- **Auto-play** episode berikutnya
- **Progress tracking** otomatis
- **Bookmark** favorit
- **Speed control** (0.5x - 2x)
- **Chromecast** & **AirPlay** support
- **Picture in Picture**

### 📱 Mobile Friendly
- Fully responsive design
- PWA support
- Dark mode
- Touch-optimized UI
- Fast loading

### 🔍 Pencarian Cerdas
- Real-time search dengan debounce
- Filter by country, genre, category
- Trending searches
- Search history lokal

### 📊 Rekomendasi Personal
- Algoritma based on watch history
- "For You" section
- Similar drama suggestions
- Continue watching

### 🔒 Keamanan
- Silent device handshake
- Temporary stream URLs (45s TTL)
- Anti-suspicious device detection
- Session-based authentication

### 🌍 SEO Optimized
- Complete meta tags (1000+ keywords)
- Structured data (15+ schema types)
- Open Graph & Twitter Cards
- Video & News sitemaps
- Multi-language support

---

## 🛠 Teknologi

### Frontend
- **React 18** - UI library
- **Vite 5** - Build tool
- **React Router 6** - Routing
- **CSS-in-JS** - Styling
- **PWA** - Progressive Web App

### Backend
- **Node.js** - Runtime
- **Express 4** - Web framework
- **Better-SQLite3** - Database
- **UUID** - Unique identifiers
- **CORS** - Cross-origin resources

### DevOps
- **NPM** - Package manager
- **Concurrently** - Parallel execution
- **Git** - Version control
- **Cloudflare** - CDN & SSL

### APIs
- **MeloLo API** - Drama content provider
- **Fizzopic CDN** - Image hosting

---

## 📦 Instalasi

### Persyaratan
- Node.js 18+
- npm atau yarn
- Git
- Browser modern (Chrome, Firefox, Safari, Edge)

### Clone Repository

```bash
# Clone repository
git clone https://github.com/ibradecode/ibra.git
cd ibra
```

### Install Dependencies

```bash
# Install semua dependensi (root, backend, frontend)
npm run install:all

# Atau install secara terpisah
npm install                    # Root
cd backend && npm install      # Backend
cd ../frontend && npm install  # Frontend
```

### Environment Configuration

```bash
# Development (.env.local di frontend)
VITE_API_URL=http://localhost:8124/api

# Production (.env.production di frontend)
VITE_API_URL=https://api.ibra.biz.id/api
```

---

## 🚀 Penggunaan

### Development Mode

```bash
# Jalankan frontend dan backend bersamaan
npm run dev

# Frontend: http://localhost:8123
# Backend:  http://localhost:8124
```

### Production Mode

```bash
# Build frontend
npm run build

# Jalankan production (backend + frontend)
npm run production

# Atau individual
npm run production:backend   # Backend only
npm run production:frontend  # Frontend only

# Frontend: https://ibra.biz.id (via vite preview)
# Backend:  https://api.ibra.biz.id
```

### Other Commands

```bash
npm run stop        # Stop semua processes
npm run restart     # Restart production
npm run status      # Cek running processes
```

---

## 📁 Struktur Proyek

```
ibra/
├── package.json                    # Root config (scripts untuk full-stack)
├── README.md                       # Dokumentasi lengkap
├── LICENSE                         # Lisensi
├── .gitignore
│
├── backend/                        # Backend API Server
│   ├── package.json
│   ├── server.js                  # Entry point (Port 8124)
│   ├── routes/
│   │   ├── client.js             # Device authentication
│   │   ├── content.js             # Content & drama APIs
│   │   ├── stream.js              # Video streaming
│   │   └── local.js              # Local data (SQLite)
│   ├── services/
│   │   └── database.js            # SQLite configuration
│   ├── utils/
│   │   └── security.js            # Device analysis
│   └── data/
│       └── ibra.db               # SQLite database
│
├── frontend/                       # React Frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html                # Complete SEO (800+ lines)
│   ├── .env.local                # Development env
│   ├── .env.production           # Production env
│   │
│   ├── public/                   # Static files
│   │   ├── logo.png
│   │   ├── banner.png
│   │   ├── favicon/
│   │   │   ├── favicon.ico
│   │   │   ├── apple-icon-*.png
│   │   │   └── android-chrome-*.png
│   │   ├── sitemap.xml           # XML sitemap
│   │   ├── robots.txt            # Search engine rules
│   │   ├── humans.txt            # Team credits
│   │   ├── ads.txt               # Advertising transparency
│   │   ├── security.txt          # Security policy
│   │   ├── browserconfig.xml    # IE/Edge config
│   │   ├── privacy-policy.txt    # Privacy info
│   │   └── .well-known/
│   │       └── site.json         # Site metadata
│   │
│   └── src/
│       ├── main.jsx              # Entry point
│       ├── App.jsx               # Router & Context
│       ├── index.css             # Global styles
│       │
│       ├── services/
│       │   └── api.js            # API client & functions
│       │
│       ├── components/
│       │   ├── LoadingSpinner.jsx
│       │   ├── OptimizedImage.jsx
│       │   ├── BottomNavigation.jsx
│       │   └── PageHeader.jsx
│       │
│       └── pages/
│           ├── HomePage.jsx      # Home dengan sections
│           ├── ForYouPage.jsx    # For you recommendations
│           ├── SearchPage.jsx   # Search dengan filters
│           ├── DetailPage.jsx    # Drama detail & episodes
│           ├── PlayerPage.jsx    # Video player (complex)
│           └── LibraryPage.jsx   # History & favorites
│
└── node_modules/
```

---

## 🔌 API Dokumentasi

### Base URL
- **Development**: `http://localhost:8124/api`
- **Production**: `https://api.ibra.biz.id/api`

### Client API (Autentikasi)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/client/handshake` | Buat sesi perangkat baru |
| POST | `/api/client/validate` | Validasi sesi |
| POST | `/api/client/refresh` | Perbarui sesi |

**Request (handshake):**
```json
{
  "device_fingerprint": "abc123...",
  "timestamp": 1707400000000,
  "app_version": "2.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "session_token": "uuid-v4",
  "expires_in": 600
}
```

### Content API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content/latest` | Drama terbaru |
| GET | `/api/content/trending` | Drama trending |
| GET | `/api/content/search?q=` | Pencarian |
| GET | `/api/content/detail/:id` | Detail drama |
| GET | `/api/content/recommendations` | Rekomendasi |

**Response (latest):**
```json
{
  "success": true,
  "data": [
    {
      "id": "7595931008260639749",
      "title": "Cinta di Luar Dugaan",
      "cover": "https://...",
      "total_episodes": 85,
      "play_count": 1500000,
      "digg_count": 85000
    }
  ]
}
```

### Stream API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stream/episode/:id` | Stream URL |
| POST | `/api/stream/report-progress` | Laporkan progres |

**Headers Required:**
```
X-Session-Token: <session_token>
X-Device-Id: <device_id>
```

### Local API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/local/history` | Riwayat menonton |
| GET/POST | `/api/local/favorites` | Daftar favorit |
| GET/POST | `/api/local/preferences` | Preferensi |

---

## 🎨 SEO Optimization

### Meta Tags (index.html)
- **Description**: 200+ karakter dengan keywords
- **Keywords**: 1000+ keywords
- **Open Graph**: Facebook, WhatsApp, Telegram, LinkedIn, Pinterest
- **Twitter Cards**: Summary large image
- **Dublin Core**: DC.title, DC.creator, DC.description

### Structured Data (JSON-LD)
1. **Organization** - Company info + contactPoint
2. **WebSite** - Site with search action
3. **WebApplication** - App features
4. **VideoObject** - Video metadata
5. **SoftwareApplication** - App ratings
6. **BreadcrumbList** - Navigation
7. **FAQPage** - 12 Q&A
8. **LocalBusiness** - Business info
9. **CollectionPage** - Drama collection
10. **QAPage** - Questions page
11. **ProfilePage** - Profile
12. **AboutPage** - About page

### Sitemaps
- `sitemap.xml` - Main sitemap with pages
- `sitemap-video.xml` - Video content
- `sitemap-images.xml` - Image sitemap

### Robots.txt
- All search engine bots
- Social media crawlers
- Security exclusions

---

## 📱 Halaman

### Home
- Hero carousel
- Sections: Trending, Terbaru, Rekomendasi
- Infinite scroll
- Skeleton loading
- Pull to refresh

### For You
- TikTok-style vertical scroll
- Auto-play preview
- Personal recommendations

### Search
- Real-time search
- Search history
- Filters: Country, Genre, Category
- Trending searches

### Detail
- Drama info & description
- Episode list with thumbnails
- Related dramas
- Play button

### Player
- Full video player
- Gesture controls
- Speed selector
- Episode navigation
- Watermark overlay
- Toast notifications

### Library
- Continue watching
- Favorites
- Clear history

---

## 🔧 Pengembangan

### Menambah Provider Baru

1. Edit `backend/routes/content.js`
2. Tambahkan endpoint di switch statement
3. Update `normalizeDrama()` function

### Menambah Halaman

1. Buat component di `frontend/src/pages/`
2. Tambah route di `frontend/src/App.jsx`
3. Import & render di router

### Custom Theme

Edit `frontend/src/index.css`:

```css
:root {
  --primary-color: #e50914;  /* Merah */
  --bg-color: #0a0a0a;       /* Hitam */
  --card-bg: #1a1a1a;        /* Abu gelap */
  --text-color: #ffffff;
  --text-secondary: #888888;
}
```

### Environment Variables

| Variable | Development | Production |
|----------|--------------|------------|
| VITE_API_URL | http://localhost:8124/api | https://api.ibra.biz.id/api |
| NODE_ENV | development | production |

---

## 🚀 Deployment

### Production Checklist

1. **Build Frontend**
   ```bash
   npm run build
   ```

2. **Set Environment**
   ```bash
   # Set production API URL
   echo "VITE_API_URL=https://api.ibra.biz.id/api" > frontend/.env.production
   ```

3. **Run Production**
   ```bash
   npm run production
   ```

### Cloudflare Setup

1. **Domains**
   - ibra.biz.id → Frontend (Vite preview)
   - api.ibra.biz.id → Backend (Port 8124)

2. **SSL**
   - Cloudflare Universal SSL
   - Always use HTTPS

3. **Caching**
   - Static assets: 1 year
   - API responses: 1 hour

### Server Requirements

- **CPU**: 1 core minimum
- **RAM**: 512MB minimum
- **Storage**: 1GB minimum
- **Bandwidth**: Unlimited recommended

---

## 👥 Tim

### Developer
- **Founder & Lead Developer**: IBRA Decode
- **Contact**: contact@ibra.biz.id
- **WhatsApp**: +6285792820173

### Social Media
- Instagram: [@ibradecode](https://instagram.com/ibradecode)
- TikTok: [@ibradecode](https://tiktok.com/@ibradecode)
- YouTube: [@IBRADecode](https://youtube.com/@IBRADecode)
- Twitter: [@ibradecode](https://twitter.com/ibradecode)
- Facebook: [ibradecode](https://facebook.com/ibradecode)
- WhatsApp Channel: [IBRA Official](https://whatsapp.com/channel/0029VbCgDVm5a248NzdKq02s)

---

## 📄 Lisensi

**Hak Cipta © 2024 IBRA Decode. Semua hak dilindungi undang-undang.**

### Pendahuluan

IBRA adalah platform streaming drama Asia yang dikembangkan dan dikelola oleh IBRA Decode. Seluruh kode sumber, desain, konten, dan aset terkait dilindungi oleh hak cipta dan undang-undang kekayaan intelektual yang berlaku.

### Ketentuan Penggunaan

**Diizinkan:**
- ✅ Menggunakan platform IBRA untuk streaming drama secara gratis
- ✅ Fork repository untuk pengembangan pribadi
- ✅ Belajar dan memahami kode sumber
- ✅ Melaporkan bug atau vulnerability
- ✅ Berkontribusi dengan pull request (setelah disetujui)

**Dilarang:**
- ❌ Menyalin, mendistribusikan, atau menjual kode tanpa izin
- ❌ Menggunakan kode untuk tujuan komersial tanpa izin
- ❌ Menghapus atau memodifikasi atribusi dan lisensi
- ❌ Menggunakan nama IBRA untuk proyek lain tanpa izin
- ❌ Mengekstrak dan menggunakan database konten tanpa izin

### Konten Drama

- IBRA tidak menyimpan konten video di server sendiri
- Semua konten drama berasal dari provider eksternal
- IBRA hanya berfungsi sebagai agregator dan streamer
- Konten drama dilindungi oleh hak cipta masing-masing pemilik

### Penafian

IBRA disediakan "sebagaimana adanya" tanpa jaminan apa pun, baik tersurat maupun tersirat. IBRA Decode tidak bertanggung jawab atas:
- Ketersediaan layanan
- Keakuratan konten
- Kerusakan atau kehilangan data
- Penggunaan tidak sah

### Perubahan Lisensi

IBRA Decode berhak untuk mengubah ketentuan lisensi kapan saja tanpa pemberitahuan. Penggunaan berkelanjutan platform berarti penerimaan ketentuan yang berlaku.

---

## 📞 Kontak

| Kanal | Informasi |
|-------|-----------|
| **Email** | contact@ibra.biz.id |
| **WhatsApp** | +6285792820173 |
| **Business** | business@ibra.biz.id |
| **Support** | support@ibra.biz.id |
| **Security** | security@ibra.biz.id |

---

<p align="center">
  Dibuat dengan ❤️ oleh <strong>IBRA Decode</strong>
</p>

<p align="center">
  <strong>IBRA - Industri Bioskop Romansa Asia</strong>
</p>

<p align="center">
  "Nonton drama Asia terbaik, gratis, tanpa batas."
</p>
