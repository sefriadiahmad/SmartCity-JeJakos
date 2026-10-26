# Laporan UAT T-103

Tanggal persiapan: 26 Oktober 2026

Status: Menunggu pelaksanaan oleh 3-5 pengguna nyata. Tidak ada feedback yang direkayasa dalam laporan ini.

## Tujuan

Memvalidasi alur utama pencari kos dan pemilik kos dari sudut pandang pengguna akhir. Penguji menjalankan skenario mandiri lalu memberi nilai dan catatan.

## Prasyarat

1. Jalankan API pada `http://localhost:5000` dan client pada `http://localhost:5173`.
2. Buka aplikasi dari browser desktop atau mobile.
3. Gunakan data demo berikut hanya pada lingkungan lokal.

| Peran | Email | Kata sandi | Peruntukan |
|---|---|---|---|
| Pencari 1 | `ari.pencari@gmail.com` | `admin123` | Alur pencari |
| Pencari 2 | `dina.pencari@gmail.com` | `admin123` | Alur pencari |
| Pemilik 1 | `budi.pemilik@gmail.com` | `admin123` | Alur pemilik |
| Pemilik 2 | `siti.pemilik@gmail.com` | `admin123` | Alur pemilik |
| Pemilik 3 | `hendra.pemilik@gmail.com` | `admin123` | Alur pemilik |

## Skenario Pencari

| ID | Langkah | Hasil harapan | Lulus |
|---|---|---|---|
| P-01 | Buka beranda, cari kos putra dekat UNJA dengan budget Rp600.000 dan WiFi. | Hasil pencarian sesuai filter dan kartu kos dapat dibuka. | [ ] |
| P-02 | Buka detail kos, lihat foto, kamar, fasilitas, lokasi, dan ulasan. | Informasi mudah dibaca, tanpa halaman/error kosong. | [ ] |
| P-03 | Gunakan chatbot untuk mencari kos putra UNJA budget Rp600.000 dengan WiFi. | Chatbot hanya memberi kos database dan tautan detail valid. | [ ] |
| P-04 | Mulai chat dengan pemilik dari detail kos. | Percakapan terbuka dan pesan dapat dikirim. | [ ] |
| P-05 | Buat pemesanan kamar tersedia, lalu lihat status di menu pemesanan. | Pemesanan tercatat dengan status dan detail benar. | [ ] |

## Skenario Pemilik

| ID | Langkah | Hasil harapan | Lulus |
|---|---|---|---|
| O-01 | Masuk sebagai pemilik dan buka Dashboard Pemilik. | Kos milik sendiri tampil; kos pemilik lain tidak tampil. | [ ] |
| O-02 | Tambah atau edit kos dan simpan. | Validasi form jelas, perubahan tersimpan. | [ ] |
| O-03 | Kelola kamar: tambah/edit detail dan fasilitas kamar. | Data kamar berubah dan terlihat pada detail kos. | [ ] |
| O-04 | Buka Pesanan Masuk, terima atau tolak pesanan uji. | Status pesanan berubah dan terlihat bagi pencari. | [ ] |
| O-05 | Buka Tagihan Penghuni, cek status tagihan dan tindakan manual. | Informasi penghuni/tagihan benar dan tindakan punya umpan balik. | [ ] |

## Form Feedback

Skala: 1 sangat sulit, 2 sulit, 3 cukup, 4 mudah, 5 sangat mudah.

| Peserta | Peran | Perangkat/browser | Skenario selesai | Kemudahan | Kejelasan UI | Kecepatan | Bug/kendala | Saran |
|---|---|---|---|---:|---:|---:|---|---|
| UAT-01 | Pencari |  |  / 5 |  |  |  |  |  |
| UAT-02 | Pencari |  |  / 5 |  |  |  |  |  |
| UAT-03 | Pemilik |  |  / 5 |  |  |  |  |  |
| UAT-04 | Pemilik |  |  / 5 |  |  |  |  |  |
| UAT-05 | Pencari/Pemilik |  |  / 5 |  |  |  |  |  |

## Rekap Hasil

Belum tersedia. Isi setelah minimal 3 peserta menyelesaikan UAT.

| Metrik | Hasil |
|---|---|
| Jumlah peserta | Belum ada |
| Alur pencari selesai | Belum ada |
| Alur pemilik selesai | Belum ada |
| Rata-rata kemudahan | Belum ada |
| Rata-rata kejelasan UI | Belum ada |
| Rata-rata kecepatan | Belum ada |
| Bug kritis | Belum ada |

## Batasan

UAT memerlukan respons pengguna nyata. Automated test dan walkthrough developer tidak menggantikan UAT. Gunakan database lokal/seed dan jangan pakai kredensial demo pada deployment publik.
