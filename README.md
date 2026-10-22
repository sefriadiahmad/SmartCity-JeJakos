# JeJakos — Jejak Kos

Platform digitalisasi rekam jejak dan pemasaran hunian sewa di Provinsi Jambi.

> Dibangun untuk **Jambi Smart City Application Challenge 2026**

## Tentang

JeJakos menghubungkan pencari kos, pemilik kos, dan admin dalam satu platform web. Fitur utama:

- **Pencarian kos** dengan filter, peta interaktif, dan jarak ke titik acuan
- **Chatbot pintar** berbasis AI yang merekomendasikan kos dari database
- **Pemesanan & pembayaran** sewa via QRIS
- **Percakapan real-time** antara pencari dan pemilik kos
- **Pengelolaan penghuni**: tagihan otomatis, pengaduan, ulasan

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MySQL 8+ (InnoDB + Spatial) |
| Peta | Leaflet.js + OpenStreetMap |
| Chatbot | Google Gemini API (RAG) |
| Payment | Midtrans (QRIS) |
| Real-time | Socket.IO |

## Struktur Folder

```
jejakos/
├── client/          # React frontend
├── server/          # Express backend
├── database/        # Migrations & seeds
└── docs/            # Dokumentasi
```

## Setup

```bash
# Clone repo
git clone <repo-url>
cd SmartCity-JeJakos

# Setup server
cd server
npm install
cp .env.example .env  # isi variabel environment

# Setup client
cd ../client
npm install

# Jalankan
cd ../server && npm run dev    # backend di :5000
cd ../client && npm run dev    # frontend di :5173
```

## Environment Variables

Salin `.env.example` ke `.env` dan isi:
- `DB_*` — koneksi MySQL
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — secret token
- `GEMINI_API_KEY` — Google AI Studio
- `MIDTRANS_*` — Midtrans sandbox
- `SMTP_*` — email service

## Tim

| Nama | NIM | Peran |
|---|---|---|
| Ridwan Azhari | 25112038 | Ketua |
| Ahmad Sefriadi | 24111058 | Programmer |
| Ressa Salma Fatikah | 24112016 | Penyusun Proposal |

**Universitas Nurdin Hamzah — 2026**
