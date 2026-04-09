# Spesifikasi Sistem Web Dashboard (SuperAdmin) - Edisi Cloud

## 1. Deskripsi Umum

Sistem berbasis web (Dashboard) tanpa server fisik (Serverless) yang digunakan oleh admin sekolah untuk mengelola _master data_, penjadwalan, dan memantau pelaporan absensi. Sistem ini terintegrasi langsung dengan Supabase sebagai pusat data utama.

## 2. Modul Utama & Fitur (Fase 1 / MVP)

### A. Modul Manajemen Pengguna (Siswa & Guru)

- **Kelola Data Akun:** Pendaftaran akun siswa dan guru secara manual atau _batch_. Akun ini akan otomatis terdaftar di sistem **Supabase Auth**.
- **Reset Perangkat (Device Unbinding):** Tombol darurat untuk menghapus identitas HP siswa dari database jika siswa kehilangan HP atau ganti perangkat baru.

### B. Modul Akademik & Penjadwalan

- **Manajemen Master Kelas & Mapel:** Mengatur daftar kelas (misal: XA, XB) dan daftar mata pelajaran.
- **Master Jadwal Pelajaran (Core):** Antarmuka input jadwal harian (hari, jam mulai, jam selesai, kelas, mapel, guru pengampu). Data ini yang akan ditarik oleh aplikasi Android ke _Room Database_ lokal.

### C. Modul Monitoring Absensi

- **Live Dashboard:** Menampilkan data siswa yang berhasil absen menggunakan Wi-Fi sekolah secara _real-time_ (memanfaatkan fitur _Realtime Subscriptions_ dari Supabase).
- **Rekapitulasi & Export:** Fitur untuk menarik laporan absensi bulanan per kelas atau per siswa ke format Excel/CSV.
- **Manual Override:** Fitur bagi admin untuk mengubah status absen (misal: dari Alfa menjadi Izin/Sakit berdasarkan surat keterangan manual).

### D. Modul Pengaturan Geofencing

- **Manajemen Titik Wi-Fi (BSSID):** Antarmuka untuk mendaftarkan dan memperbarui _MAC Address_ (BSSID) dari _router_ Wi-Fi sekolah. Jika _router_ diganti, admin cukup _update_ di sini tanpa perlu _update_ aplikasi Android.
- **Konfigurasi Jam Global:** Mengatur batas waktu masuk pelajaran pertama dan rentang waktu sah untuk sholat Dhuha.

## 3. Spesifikasi Teknis (Frontend & BaaS)

Karena menggunakan arsitektur modern (_Backend as a Service_), sistem ini **tidak membutuhkan cPanel atau server PHP**.

- **Backend & Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Email/Password atau NISN)
- **Keamanan Data:** RLS (Row Level Security) - _Hanya SuperAdmin yang bisa menambah/mengubah data jadwal dan router, siswa hanya diberi akses Read-Only._
- **Frontend Framework:** React.js (menggunakan Vite) atau Vue.js. (Sangat disarankan menggunakan _template_ dashboard seperti Material-UI atau Tailwind/Shadcn untuk mempercepat pembuatan UI).
- **Hosting (Gratis 100%):** Vercel atau Netlify.
