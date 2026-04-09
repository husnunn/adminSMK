-- 1. Bikin Tabel Master Kategori
CREATE TABLE master_kategori (
id SERIAL PRIMARY KEY,
nama_kategori TEXT NOT NULL UNIQUE
);

-- 2. Isi Data Awal (Biar kaga kosong)
INSERT INTO master_kategori (nama_kategori) VALUES
('STEM'),
('Humanities'),
('Arts'),
('General');

-- 3. Tambahin sambungan (Foreign Key) di master_mapel
-- Hapus dulu kolom 'kategori' teks yang lama (kalau lu sempet bikin)
ALTER TABLE master_mapel DROP COLUMN IF EXISTS kategori;

-- Tambahin kolom baru yang nyambung ke tabel master_kategori
ALTER TABLE master_mapel
ADD COLUMN kategori_id INT REFERENCES master_kategori(id);
