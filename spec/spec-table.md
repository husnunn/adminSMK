1. Tabel profiles
   Menyimpan data identitas pengguna (Siswa, Guru, Admin).
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | id | UUID | Primary Key (Relasi ke auth.users) |
   | nama_lengkap | TEXT | Nama asli pengguna |
   | nomor_induk | TEXT | NIS untuk siswa atau NIP untuk guru |
   | role | TEXT | 'siswa', 'guru', atau 'admin' |
   | device_id | TEXT | ID Hardware HP (Bisa NULL jika Unbind) |
   | kelas_id | INT | FK ke master_kelas.id (Khusus Siswa) |
   | is_on_leave | BOOLEAN | Status cuti (Khusus Guru) |
   | created_at | TIMESTAMPTZ | Waktu data dibuat |

2. Tabel master_kelas
   Daftar kelas yang tersedia di sekolah.
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | id | SERIAL | Primary Key |
   | nama_kelas | TEXT | Contoh: "X MIPA 1", "XII IPS 2" |
   | jurusan | TEXT | Contoh: "MIPA", "IPS", "Bahasa" |

3. Tabel master_mapel
   Daftar mata pelajaran.
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | id | SERIAL | Primary Key |
   | nama_pelajaran | TEXT | Contoh: "Matematika", "Fisika" |
   | kategori | TEXT | 'STEM', 'Humanities', 'Arts', atau 'General' |

4. Tabel jadwal_pelajaran
   Master jadwal mingguan (digunakan oleh mobile app & admin).
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | id | SERIAL | Primary Key |
   | hari | INT | 1 (Senin) s/d 5 (Jumat) |
   | jam_mulai | TIME | Contoh: "07:00:00" |
   | jam_selesai | TIME | Contoh: "08:30:00" |
   | kelas_id | INT | FK ke master_kelas.id |
   | mapel_id | INT | FK ke master_mapel.id |
   | guru_id | UUID | FK ke profiles.id |

5. Tabel riwayat_absen
   Log absensi real-time dari siswa.
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | id | UUID | Primary Key |
   | siswa_id | UUID | FK ke profiles.id |
   | jadwal_id | INT | FK ke jadwal_pelajaran.id |
   | waktu_absen | TIMESTAMPTZ | Waktu saat klik absen di HP |
   | status_absen | TEXT | 'Hadir', 'Terlambat', 'Sakit', 'Izin' |
   | jarak_meter | INT | Jarak siswa ke router saat absen |

6. Tabel master_bssid
   Data router Wi-Fi untuk Geofencing.
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | id | SERIAL | Primary Key |
   | nama_lokasi | TEXT | Contoh: "Gedung A", "Lab Komputer" |
   | bssid | TEXT | Mac Address Router (Unique) |
   | ssid | TEXT | Nama Wi-Fi |

7. Tabel activity_logs
   Log aktivitas untuk timeline Dashboard.
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | id | UUID | Primary Key |
   | type | TEXT | 'info', 'success', 'warning', 'error' |
   | title | TEXT | Judul singkat aktivitas |
   | description | TEXT | Detail aktivitas |
   | created_at | TIMESTAMPTZ | Waktu log dibuat |

8. Tabel app_settings
   Konfigurasi global aplikasi.
   | Nama Kolom | Tipe Data | Keterangan |
   | :--- | :--- | :--- |
   | key | TEXT | Primary Key (Contoh: 'tahun_ajaran') |
   | value | TEXT | Nilai (Contoh: '2025/2026') |
