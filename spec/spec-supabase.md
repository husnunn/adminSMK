# Panduan CRUD Supabase JS - Robithotul Hikmah Dashboard

**Persiapan Wajib di setiap file Vue:**

```javascript
import { supabase } from "../supabase"; // Sesuaikan path file supabase.js lu

// 1. Modul Manajemen Pengguna (profiles)

// Ambil semua data siswa
const { data, error } = await supabase
  .from("profiles")
  .select("*")
  .eq("role", "siswa"); // Filter khusus siswa

// tambah data
const { data, error } = await supabase
  .from("profiles")
  .insert([
    { role: "siswa", nomor_induk: "siswa-002", nama_lengkap: "Budi Darmawan" },
  ]);

// update data
// Contoh kasus: Menghapus lock HP siswa (Device Unbind)
const { data, error } = await supabase
  .from("profiles")
  .update({ device_id: null })
  .eq("id", "UUID_SISWA_DISINI");

// delete data
const { data, error } = await supabase
  .from("profiles")
  .delete()
  .eq("id", "UUID_SISWA_DISINI");

// <!-- 2. Modul Master Akademik (master_kelas & master_mapel) -->
// Ambil semua data
const { data, error } = await supabase
  .from("master_kelas")
  .select("*")
  .order("nama_kelas", { ascending: true }); // Urutkan sesuai abjad
//   tambah data
const { data, error } = await supabase.from("master_kelas").insert([
  { nama_kelas: "XI MIPA 1" },
  { nama_kelas: "XI MIPA 2" }, // Bisa insert banyak sekaligus (Batch)
]);
//   update data
const { data, error } = await supabase
  .from("master_kelas")
  .update({ nama_kelas: "X IPA 1" })
  .eq("id", 1); // Cari berdasarkan ID Kelas
// delete data
const { data, error } = await supabase
  .from("master_kelas")
  .delete()
  .eq("id", 1);

//   3 Modul Jadwal Pelajaran (jadwal_pelajaran)

// get
const { data, error } = await supabase
  .from("jadwal_pelajaran")
  .select(
    `
    id, hari, jam_mulai, jam_selesai,
    master_kelas (nama_kelas),
    master_mapel (nama_pelajaran),
    profiles (nama_lengkap)
  `,
  )
  .eq("hari", 1); // Filter khusus hari Senin

//   post
const { data, error } = await supabase.from("jadwal_pelajaran").insert([
  {
    hari: 1,
    jam_mulai: "07:00:00",
    jam_selesai: "08:30:00",
    kelas_id: 1,
    mapel_id: 1,
    guru_id: "UUID_GURU_DISINI",
  },
]);

//   update
const { data, error } = await supabase
  .from("jadwal_pelajaran")
  .update({ jam_mulai: "07:30:00" }) // Misal jam masuk diundur
  .eq("id", "UUID_JADWAL_DISINI");

//   delete
const { data, error } = await supabase
  .from("jadwal_pelajaran")
  .delete()
  .eq("id", "UUID_JADWAL_DISINI");

//   4. Modul Geofencing Wi-Fi (master_bssid)

// get
const { data, error } = await supabase.from("master_bssid").select("*");

// post
const { data, error } = await supabase
  .from("master_bssid")
  .insert([
    { nama_lokasi: "Router Lab Komputer", mac_address: "AA:BB:CC:DD:EE:FF" },
  ]);

// update
const { data, error } = await supabase
  .from("master_bssid")
  .update({ mac_address: "11:22:33:44:55:66" }) // Jika router diganti
  .eq("id", 1);

// delete
const { data, error } = await supabase
  .from("master_bssid")
  .delete()
  .eq("id", 1);

//   5. Modul Absensi (riwayat_absen)

// Ambil absen beserta nama siswa dan jadwalnya
const { data, error } = await supabase
  .from("riwayat_absen")
  .select(
    `
    *,
    profiles (nama_lengkap, nomor_induk),
    jadwal_pelajaran (master_mapel(nama_pelajaran))
  `,
  )
  .order("waktu_absen", { ascending: false }); // Urutkan dari yang terbaru

// patch
// Misal siswa awalnya Alfa, terus bawa surat dokter
const { data, error } = await supabase
  .from("riwayat_absen")
  .update({ status_absen: "Sakit" })
  .eq("id", "UUID_ABSEN_DISINI");

//   Fitur Spesial: Real-time Listener (Opsional)
const channel = supabase
  .channel("custom-all-channel")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "riwayat_absen" },
    (payload) => {
      console.log("Ada siswa yang baru saja absen!", payload.new);
      // Tambahkan payload.new ke state array Vue lu
    },
  )
  .subscribe();
```
