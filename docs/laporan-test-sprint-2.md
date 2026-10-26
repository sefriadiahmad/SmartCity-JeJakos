# Laporan Test Sprint 2

Tanggal: 26 Oktober 2026

## Hasil

| Area | Status | Cakupan |
|---|---|---|
| Chatbot | Lulus | Intent preferensi, multi-turn, fasilitas, cache, fallback, guardrail anti-halusinasi, kartu kos, greeting, RAG, API route, masking PII, rate limit, riwayat, dan log admin. |
| Booking flow | Lulus | Autentikasi, RBAC, validasi, buat booking, duplikasi, daftar/detail, terima/tolak/batal, status terminal, penghuni aktif, dan sinkronisasi ketersediaan kamar. |
| Payment sandbox | Lulus | Pembuatan transaksi Snap mock, otorisasi invoice, verifikasi signature, callback settlement, invoice paid, aktivasi booking, dan kamar menjadi tidak tersedia. |
| Chat real-time | Lulus | Socket JWT, join/leave conversation, kirim/broadcast pesan, tandai dibaca, dan blokir pengguna bukan peserta. |

## Perintah Test

```sh
node tests/chatbot.test.js && node tests/chatbot-route.test.js && node tests/booking.test.js && node tests/payment.test.js && node tests/socket.test.js
```

Semua suite lulus. Tidak ada bug ditemukan atau perubahan source diperlukan.

## Batasan

`MIDTRANS_SERVER_KEY` tidak diset, sehingga payment suite memakai sandbox mock. Integrasi Midtrans sandbox nyata perlu diuji setelah credential sandbox tersedia.
