# 🗄️ Database Schema Specification (Update Terbaru)

**Project:** Robithotul Hikmah Admin  
**Stack:** Vue 3 & Supabase (PostgreSQL)

Dokumen ini adalah referensi struktur tabel _database_ yang digunakan untuk menyimpan, mengelola, dan menampilkan data pada Web Admin.

---

### 1. User Management

#### Tabel `profiles` (Data Induk User)

| Kolom          | Tipe Data   | Atribut         | Keterangan                                     |
| :------------- | :---------- | :-------------- | :--------------------------------------------- |
| `id`           | UUID        | Primary Key     | Berelasi otomatis dengan `auth.users`          |
| `nama_lengkap` | TEXT        | Not Null        | Nama asli pengguna                             |
| `nomor_induk`  | TEXT        | Not Null        | NIS (Siswa) atau NIP (Guru)                    |
| `role`         | TEXT        | Not Null        | Opsi: `'siswa'`, `'guru'`, `'admin'`           |
| `device_id`    | TEXT        | Nullable        | ID Hardware HP. Jika `NULL` = belum bind       |
| `kelas_id`     | INT         | Nullable        | FK ke `master_kelas.id`. Wajib isi untuk Siswa |
| `is_on_leave`  | BOOLEAN     | Default `false` | Status cuti (Khusus Guru)                      |
| `created_at`   | TIMESTAMPTZ | Default `now()` | Waktu akun dibuat                              |

---

### 2. Academic & Scheduling Master

#### Tabel `master_kelas`

| Kolom        | Tipe Data | Atribut     | Keterangan                      |
| :----------- | :-------- | :---------- | :------------------------------ |
| `id`         | SERIAL    | Primary Key |                                 |
| `nama_kelas` | TEXT      | Not Null    | Contoh: "X MIPA 1", "XII IPS 2" |
| `jurusan`    | TEXT      | Nullable    | Contoh: "MIPA", "IPS", "Bahasa" |

#### Tabel `master_kategori` (NEW)

| Kolom           | Tipe Data | Atribut     | Keterangan                                      |
| :-------------- | :-------- | :---------- | :---------------------------------------------- |
| `id`            | SERIAL    | Primary Key |                                                 |
| `nama_kategori` | TEXT      | Unique      | Contoh: "STEM", "Humanities", "Arts", "General" |

#### Tabel `master_mapel` (UPDATED)

| Kolom            | Tipe Data | Atribut     | Keterangan                     |
| :--------------- | :-------- | :---------- | :----------------------------- |
| `id`             | SERIAL    | Primary Key |                                |
| `nama_pelajaran` | TEXT      | Not Null    | Contoh: "Matematika", "Fisika" |
| `kategori_id`    | INT       | Nullable    | FK ke `master_kategori.id`     |

#### Tabel `jadwal_pelajaran` (UPDATED - Support Event/Libur)

| Kolom         | Tipe Data | Atribut           | Keterangan                                            |
| :------------ | :-------- | :---------------- | :---------------------------------------------------- |
| `id`          | SERIAL    | Primary Key       |                                                       |
| `hari`        | INT       | Nullable          | 1 (Senin) s/d 5 (Jumat). Diisi jika jadwal rutin.     |
| `tanggal`     | DATE      | Nullable          | Diisi jika ada event khusus / hari libur              |
| `tipe_jadwal` | TEXT      | Default `'Rutin'` | Opsi: `'Rutin'`, `'Event'`, `'Libur'`                 |
| `keterangan`  | TEXT      | Nullable          | Diisi jika tipe 'Event'/'Libur' (Misal: "HUT RI")     |
| `jam_mulai`   | TIME      | Nullable          | Contoh: "07:00:00"                                    |
| `jam_selesai` | TIME      | Nullable          | Contoh: "08:30:00"                                    |
| `kelas_id`    | INT       | Nullable          | FK ke `master_kelas.id`. `NULL` jika event sekolah    |
| `mapel_id`    | INT       | Nullable          | FK ke `master_mapel.id`. `NULL` jika tipe Libur/Event |
| `guru_id`     | UUID      | Nullable          | FK ke `profiles.id`. `NULL` jika tipe Libur/Event     |

---

### 3. Tracking & Operations

#### Tabel `riwayat_absen`

| Kolom          | Tipe Data   | Atribut     | Keterangan                                          |
| :------------- | :---------- | :---------- | :-------------------------------------------------- |
| `id`           | UUID        | Primary Key | Default `gen_random_uuid()`                         |
| `siswa_id`     | UUID        | Not Null    | FK ke `profiles.id`                                 |
| `jadwal_id`    | INT         | Not Null    | FK ke `jadwal_pelajaran.id`                         |
| `waktu_absen`  | TIMESTAMPTZ | Not Null    | Waktu saat tombol absen ditekan                     |
| `status_absen` | TEXT        | Not Null    | Opsi: `'Hadir'`, `'Terlambat'`, `'Sakit'`, `'Izin'` |
| `jarak_meter`  | INT         | Not Null    | Jarak device siswa ke router                        |

#### Tabel `master_bssid` (Geofencing)

| Kolom         | Tipe Data | Atribut     | Keterangan                         |
| :------------ | :-------- | :---------- | :--------------------------------- |
| `id`          | SERIAL    | Primary Key |                                    |
| `nama_lokasi` | TEXT      | Not Null    | Contoh: "Gedung A", "Lab Komputer" |
| `bssid`       | TEXT      | Unique      | Mac Address Router target          |
| `ssid`        | TEXT      | Nullable    | Nama jaringan Wi-Fi target         |

---

### 4. System Logs & Configuration

#### Tabel `activity_logs` (UPDATED)

| Kolom         | Tipe Data   | Atribut         | Keterangan                                                 |
| :------------ | :---------- | :-------------- | :--------------------------------------------------------- |
| `id`          | UUID        | Primary Key     | Default `gen_random_uuid()`                                |
| `type`        | TEXT        | Not Null        | Kategori UI: `'info'`, `'success'`, `'warning'`, `'error'` |
| `title`       | TEXT        | Not Null        | Judul singkat (Contoh: "Device Unbind")                    |
| `description` | TEXT        | Nullable        | Detail kejadian                                            |
| `created_at`  | TIMESTAMPTZ | Default `now()` | Waktu aktivitas tercatat                                   |

#### Tabel `app_settings`

| Kolom   | Tipe Data | Atribut     | Keterangan                              |
| :------ | :-------- | :---------- | :-------------------------------------- |
| `key`   | TEXT      | Primary Key | Contoh: `'tahun_ajaran'`, `'jam_masuk'` |
| `value` | TEXT      | Not Null    | Contoh: `'2025/2026'`, `'07:00'`        |

---

### 🔗 Supabase Join Cheatsheet (Buat Kodingan Vue)

Berikut referensi cara menarik data relasional menggunakan _Supabase JS Client_:

1. **Ambil Data Siswa Lengkap dengan Nama Kelasnya:**
   ```javascript
   .from('profiles')
   .select('*, master_kelas(nama_kelas)')
   .eq('role', 'siswa')
   ```
