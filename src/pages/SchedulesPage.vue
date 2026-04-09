<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { toast } from 'vue3-toastify'
import { supabase } from '../supabase'
import AdminLayout from '../components/layout/AdminLayout.vue'

// =====================================================
// STATE
// =====================================================

// --- Master Kelas ---
const kelasList       = ref([])
const isLoadingKelas  = ref(false)
const modalKelas      = reactive({ open: false, mode: 'add', data: { id: null, nama_kelas: '', jurusan: '' } })
const isSavingKelas   = ref(false)
const isDeletingKelas = ref(false)

// --- Master Mapel ---
const mapelList         = ref([])
const isLoadingMapel    = ref(false)
const modalMapel        = reactive({ open: false, mode: 'add', data: { id: null, nama_pelajaran: '', kategori: '' } })
const isSavingMapel     = ref(false)
const isDeletingMapel   = ref(false)

// --- Jadwal Pelajaran ---
const jadwalList         = ref([])
const guruList           = ref([])
const isLoadingJadwal    = ref(false)
const jadwalPage         = ref(1)
const jadwalPageSize     = 8
const jadwalTotalCount   = ref(0)
const modalJadwal        = reactive({
  open: false,
  mode: 'add',
  data: { id: null, hari: 1, jam_mulai: '07:00', jam_selesai: '08:30', kelas_id: null, mapel_id: null, guru_id: null }
})
const isSavingJadwal     = ref(false)
const isDeletingJadwal   = ref(false)

// Delete confirmation modal
const deleteConfirm = reactive({ open: false, type: '', id: null, label: '' })
const isDeleting    = ref(false)

// =====================================================
// COMPUTED
// =====================================================
const jadwalTotalPages = computed(() => Math.max(1, Math.ceil(jadwalTotalCount.value / jadwalPageSize)))

const hariLabel = (h) => ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'][h] ?? '-'

const jurusanBadgeClass = (j) => {
  const map = {
    MIPA: 'badge-secondary',
    IPS:  'badge-tertiary',
    Bahasa: 'badge-surface',
  }
  return map[j] ?? 'badge-surface'
}

const kategoriBadgeClass = (k) => {
  const map = {
    STEM:       'badge-primary',
    Humanities: 'badge-surface',
    Arts:       'badge-tertiary',
    General:    'badge-secondary',
  }
  return map[k] ?? 'badge-surface'
}

// =====================================================
// FETCH FUNCTIONS
// =====================================================

async function fetchKelas() {
  isLoadingKelas.value = true
  const { data, error } = await supabase
    .from('master_kelas')
    .select('*')
    .order('nama_kelas', { ascending: true })
  isLoadingKelas.value = false
  if (error) { toast.error('Gagal memuat data kelas.'); return }
  kelasList.value = data ?? []
}

async function fetchMapel() {
  isLoadingMapel.value = true
  const { data, error } = await supabase
    .from('master_mapel')
    .select('*')
    .order('nama_pelajaran', { ascending: true })
  isLoadingMapel.value = false
  if (error) { toast.error('Gagal memuat data mapel.'); return }
  mapelList.value = data ?? []
}

async function fetchGuru() {
  const { data } = await supabase
    .from('profiles')
    .select('id, nama_lengkap')
    .eq('role', 'guru')
    .order('nama_lengkap', { ascending: true })
  guruList.value = data ?? []
}

async function fetchJadwal() {
  isLoadingJadwal.value = true
  const from = (jadwalPage.value - 1) * jadwalPageSize
  const to   = from + jadwalPageSize - 1

  const { data, error, count } = await supabase
    .from('jadwal_pelajaran')
    .select(
      `id, hari, jam_mulai, jam_selesai,
       master_kelas (id, nama_kelas),
       master_mapel (id, nama_pelajaran),
       profiles (id, nama_lengkap)`,
      { count: 'exact' }
    )
    .order('hari', { ascending: true })
    .order('jam_mulai', { ascending: true })
    .range(from, to)

  isLoadingJadwal.value = false
  if (error) { toast.error('Gagal memuat jadwal.'); return }
  jadwalList.value     = data ?? []
  jadwalTotalCount.value = count ?? 0
}

// =====================================================
// KELAS CRUD
// =====================================================

function openAddKelas() {
  modalKelas.mode = 'add'
  modalKelas.data = { id: null, nama_kelas: '', jurusan: '' }
  modalKelas.open = true
}

function openEditKelas(row) {
  modalKelas.mode = 'edit'
  modalKelas.data = { id: row.id, nama_kelas: row.nama_kelas, jurusan: row.jurusan }
  modalKelas.open = true
}

async function saveKelas() {
  if (!modalKelas.data.nama_kelas.trim()) { toast.warn('Nama kelas wajib diisi.'); return }
  isSavingKelas.value = true
  try {
    if (modalKelas.mode === 'add') {
      const { error } = await supabase
        .from('master_kelas')
        .insert([{ nama_kelas: modalKelas.data.nama_kelas, jurusan: modalKelas.data.jurusan }])
      if (error) throw error
      toast.success('Kelas berhasil ditambahkan.')
    } else {
      const { error } = await supabase
        .from('master_kelas')
        .update({ nama_kelas: modalKelas.data.nama_kelas, jurusan: modalKelas.data.jurusan })
        .eq('id', modalKelas.data.id)
      if (error) throw error
      toast.success('Kelas berhasil diperbarui.')
    }
    modalKelas.open = false
    await fetchKelas()
    await fetchJadwal()
  } catch (e) {
    toast.error(`Error: ${e.message}`)
  } finally {
    isSavingKelas.value = false
  }
}

async function deleteKelas(id) {
  isDeleting.value = true
  const { error } = await supabase.from('master_kelas').delete().eq('id', id)
  isDeleting.value = false
  deleteConfirm.open = false
  if (error) { toast.error(`Gagal hapus: ${error.message}`); return }
  toast.success('Kelas berhasil dihapus.')
  await fetchKelas()
  await fetchJadwal()
}

// =====================================================
// MAPEL CRUD
// =====================================================

function openAddMapel() {
  modalMapel.mode = 'add'
  modalMapel.data = { id: null, nama_pelajaran: '', kategori: '' }
  modalMapel.open = true
}

function openEditMapel(row) {
  modalMapel.mode = 'edit'
  modalMapel.data = { id: row.id, nama_pelajaran: row.nama_pelajaran, kategori: row.kategori }
  modalMapel.open = true
}

async function saveMapel() {
  if (!modalMapel.data.nama_pelajaran.trim()) { toast.warn('Nama pelajaran wajib diisi.'); return }
  isSavingMapel.value = true
  try {
    if (modalMapel.mode === 'add') {
      const { error } = await supabase
        .from('master_mapel')
        .insert([{ nama_pelajaran: modalMapel.data.nama_pelajaran, kategori: modalMapel.data.kategori }])
      if (error) throw error
      toast.success('Mapel berhasil ditambahkan.')
    } else {
      const { error } = await supabase
        .from('master_mapel')
        .update({ nama_pelajaran: modalMapel.data.nama_pelajaran, kategori: modalMapel.data.kategori })
        .eq('id', modalMapel.data.id)
      if (error) throw error
      toast.success('Mapel berhasil diperbarui.')
    }
    modalMapel.open = false
    await fetchMapel()
    await fetchJadwal()
  } catch (e) {
    toast.error(`Error: ${e.message}`)
  } finally {
    isSavingMapel.value = false
  }
}

async function deleteMapel(id) {
  isDeleting.value = true
  const { error } = await supabase.from('master_mapel').delete().eq('id', id)
  isDeleting.value = false
  deleteConfirm.open = false
  if (error) { toast.error(`Gagal hapus: ${error.message}`); return }
  toast.success('Mapel berhasil dihapus.')
  await fetchMapel()
  await fetchJadwal()
}

// =====================================================
// JADWAL CRUD
// =====================================================

function openAddJadwal() {
  modalJadwal.mode = 'add'
  modalJadwal.data = { id: null, hari: 1, jam_mulai: '07:00', jam_selesai: '08:30', kelas_id: null, mapel_id: null, guru_id: null }
  modalJadwal.open = true
}

function openEditJadwal(row) {
  modalJadwal.mode = 'edit'
  modalJadwal.data = {
    id:          row.id,
    hari:        row.hari,
    jam_mulai:   row.jam_mulai?.slice(0, 5) ?? '07:00',
    jam_selesai: row.jam_selesai?.slice(0, 5) ?? '08:30',
    kelas_id:    row.master_kelas?.id ?? null,
    mapel_id:    row.master_mapel?.id ?? null,
    guru_id:     row.profiles?.id ?? null,
  }
  modalJadwal.open = true
}

async function saveJadwal() {
  const d = modalJadwal.data
  if (!d.kelas_id || !d.mapel_id) { toast.warn('Kelas dan Mapel wajib dipilih.'); return }
  isSavingJadwal.value = true
  try {
    const payload = {
      hari:        Number(d.hari),
      jam_mulai:   d.jam_mulai + ':00',
      jam_selesai: d.jam_selesai + ':00',
      kelas_id:    d.kelas_id,
      mapel_id:    d.mapel_id,
      guru_id:     d.guru_id || null,
    }
    if (modalJadwal.mode === 'add') {
      const { error } = await supabase.from('jadwal_pelajaran').insert([payload])
      if (error) throw error
      toast.success('Jadwal berhasil ditambahkan.')
    } else {
      const { error } = await supabase.from('jadwal_pelajaran').update(payload).eq('id', d.id)
      if (error) throw error
      toast.success('Jadwal berhasil diperbarui.')
    }
    modalJadwal.open = false
    await fetchJadwal()
  } catch (e) {
    toast.error(`Error: ${e.message}`)
  } finally {
    isSavingJadwal.value = false
  }
}

async function deleteJadwal(id) {
  isDeleting.value = true
  const { error } = await supabase.from('jadwal_pelajaran').delete().eq('id', id)
  isDeleting.value = false
  deleteConfirm.open = false
  if (error) { toast.error(`Gagal hapus: ${error.message}`); return }
  toast.success('Jadwal berhasil dihapus.')
  if (jadwalList.value.length === 1 && jadwalPage.value > 1) jadwalPage.value--
  await fetchJadwal()
}

// =====================================================
// DELETE CONFIRM
// =====================================================

function confirmDelete(type, id, label) {
  deleteConfirm.type  = type
  deleteConfirm.id    = id
  deleteConfirm.label = label
  deleteConfirm.open  = true
}

async function executeDelete() {
  if (deleteConfirm.type === 'kelas')  await deleteKelas(deleteConfirm.id)
  if (deleteConfirm.type === 'mapel')  await deleteMapel(deleteConfirm.id)
  if (deleteConfirm.type === 'jadwal') await deleteJadwal(deleteConfirm.id)
}

// =====================================================
// PAGINATION
// =====================================================

async function goToPage(p) {
  if (p < 1 || p > jadwalTotalPages.value) return
  jadwalPage.value = p
  await fetchJadwal()
}

// =====================================================
// INIT
// =====================================================
onMounted(async () => {
  await Promise.all([fetchKelas(), fetchMapel(), fetchGuru()])
  await fetchJadwal()
})
</script>

<template>
  <AdminLayout page-title="Akademik & Penjadwalan" search-placeholder="Cari jadwal...">
    <div class="schedules-content">

      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header-left">
          <h3 class="page-title">Akademik & Penjadwalan</h3>
          <p class="page-desc">Kelola kelas, mata pelajaran, dan jadwal pelajaran mingguan.</p>
        </div>
        <button class="export-btn" @click="toast.info('Fitur export segera hadir.')">
          <span class="material-symbols-outlined" style="font-size:18px;">download</span>
          Export Laporan
        </button>
      </div>

      <!-- Bento Grid: Master Kelas + Master Mapel -->
      <div class="bento-grid">

        <!-- ============= Master Kelas ============= -->
        <section class="card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="material-symbols-outlined card-icon">groups</span>
              <h4 class="card-title">Master Kelas</h4>
            </div>
            <button class="btn-primary-sm" @click="openAddKelas">
              <span class="material-symbols-outlined" style="font-size:16px;">add</span>
              Tambah Data
            </button>
          </div>

          <div class="table-wrap">
            <div v-if="isLoadingKelas" class="table-empty">
              <span class="material-symbols-outlined spin text-outline">progress_activity</span>
            </div>
            <div v-else-if="kelasList.length === 0" class="table-empty">
              <span class="material-symbols-outlined" style="font-size:40px; color:var(--color-outline-variant)">inbox</span>
              <p class="empty-text">Belum ada data kelas</p>
            </div>
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Kelas</th>
                  <th>Jurusan</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in kelasList" :key="row.id">
                  <td class="td-id">KLS-{{ String(row.id).padStart(2, '0') }}</td>
                  <td>{{ row.nama_kelas }}</td>
                  <td>
                    <span :class="['badge', jurusanBadgeClass(row.jurusan)]">{{ row.jurusan || '—' }}</span>
                  </td>
                  <td class="text-right">
                    <div class="action-btns">
                      <button class="icon-btn" title="Edit" @click="openEditKelas(row)">
                        <span class="material-symbols-outlined" style="font-size:18px;">edit_note</span>
                      </button>
                      <button class="icon-btn danger" title="Hapus" @click="confirmDelete('kelas', row.id, row.nama_kelas)">
                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ============= Master Mapel ============= -->
        <section class="card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="material-symbols-outlined card-icon">menu_book</span>
              <h4 class="card-title">Master Mapel</h4>
            </div>
            <button class="btn-primary-sm" @click="openAddMapel">
              <span class="material-symbols-outlined" style="font-size:16px;">add</span>
              Tambah Data
            </button>
          </div>

          <div class="table-wrap">
            <div v-if="isLoadingMapel" class="table-empty">
              <span class="material-symbols-outlined spin text-outline">progress_activity</span>
            </div>
            <div v-else-if="mapelList.length === 0" class="table-empty">
              <span class="material-symbols-outlined" style="font-size:40px; color:var(--color-outline-variant)">inbox</span>
              <p class="empty-text">Belum ada data mapel</p>
            </div>
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Pelajaran</th>
                  <th>Kategori</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in mapelList" :key="row.id">
                  <td class="td-id">MPL-{{ String(row.id).padStart(3, '0') }}</td>
                  <td>{{ row.nama_pelajaran }}</td>
                  <td>
                    <span :class="['badge', kategoriBadgeClass(row.kategori)]">{{ row.kategori || '—' }}</span>
                  </td>
                  <td class="text-right">
                    <div class="action-btns">
                      <button class="icon-btn" title="Edit" @click="openEditMapel(row)">
                        <span class="material-symbols-outlined" style="font-size:18px;">edit_note</span>
                      </button>
                      <button class="icon-btn danger" title="Hapus" @click="confirmDelete('mapel', row.id, row.nama_pelajaran)">
                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ============= Jadwal Pelajaran (Full Width) ============= -->
        <section class="card card-full">
          <div class="card-head">
            <div class="card-head-left">
              <div class="card-icon-wrap">
                <span class="material-symbols-outlined card-icon">calendar_month</span>
              </div>
              <div>
                <h4 class="card-title">Jadwal Pelajaran</h4>
                <p class="card-subtitle">Jadwal mingguan untuk semua kelas.</p>
              </div>
            </div>
            <div class="jadwal-head-right">
              <span class="badge-count">{{ jadwalTotalCount }} Jadwal</span>
              <button class="btn-primary-md" @click="openAddJadwal">
                <span class="material-symbols-outlined" style="font-size:18px;">add_task</span>
                Tambah Jadwal
              </button>
            </div>
          </div>

          <div class="table-wrap">
            <div v-if="isLoadingJadwal" class="table-empty" style="padding: 48px 0">
              <span class="material-symbols-outlined spin text-outline" style="font-size:36px">progress_activity</span>
            </div>
            <div v-else-if="jadwalList.length === 0" class="table-empty" style="padding: 48px 0">
              <span class="material-symbols-outlined" style="font-size:48px; color:var(--color-outline-variant)">event_busy</span>
              <p class="empty-text">Belum ada jadwal. Klik "Tambah Jadwal" untuk memulai.</p>
            </div>
            <table v-else class="data-table jadwal-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Hari</th>
                  <th>Waktu</th>
                  <th>Kelas</th>
                  <th>Mapel</th>
                  <th>Guru Pengampu</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in jadwalList" :key="row.id" class="jadwal-row">
                  <td class="td-id td-id-jadwal" :title="String(row.id)">SCH-{{ typeof row.id === 'number' ? String(row.id).padStart(3, '0') : String(row.id).slice(0, 8) }}</td>
                  <td>
                    <span class="hari-label">{{ hariLabel(row.hari) }}</span>
                  </td>
                  <td>
                    <div class="waktu-cell">
                      <span class="material-symbols-outlined" style="font-size:14px; color:var(--color-on-surface-variant)">schedule</span>
                      {{ row.jam_mulai?.slice(0,5) }} – {{ row.jam_selesai?.slice(0,5) }}
                    </div>
                  </td>
                  <td>{{ row.master_kelas?.nama_kelas ?? '—' }}</td>
                  <td class="td-mapel">{{ row.master_mapel?.nama_pelajaran ?? '—' }}</td>
                  <td>
                    <div class="guru-cell">
                      <div class="guru-avatar">
                        {{ (row.profiles?.nama_lengkap ?? '?')[0] }}
                      </div>
                      <span class="guru-name">{{ row.profiles?.nama_lengkap ?? 'Belum ditentukan' }}</span>
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="action-btns">
                      <button class="icon-btn" title="Edit" @click="openEditJadwal(row)">
                        <span class="material-symbols-outlined" style="font-size:18px;">edit_note</span>
                      </button>
                      <button class="icon-btn danger" title="Hapus" @click="confirmDelete('jadwal', row.id, `SCH-${typeof row.id === 'number' ? String(row.id).padStart(3,'0') : String(row.id).slice(0,8)}`)">
                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="jadwalTotalPages > 1 || jadwalList.length > 0" class="pagination">
            <p class="pagination-info">
              Menampilkan {{ jadwalList.length }} dari {{ jadwalTotalCount }} jadwal
            </p>
            <div class="pagination-btns">
              <button class="page-btn icon-only" :disabled="jadwalPage === 1" @click="goToPage(jadwalPage - 1)">
                <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
              </button>
              <button
                v-for="p in jadwalTotalPages"
                :key="p"
                :class="['page-btn', { active: p === jadwalPage }]"
                @click="goToPage(p)"
              >{{ p }}</button>
              <button class="page-btn icon-only" :disabled="jadwalPage === jadwalTotalPages" @click="goToPage(jadwalPage + 1)">
                <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- ================================================
         MODAL: Tambah / Edit Kelas
    ================================================ -->
    <Teleport to="body">
      <div v-if="modalKelas.open" class="modal-overlay" @click.self="modalKelas.open = false">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon">
                <span class="material-symbols-outlined" style="font-size:20px;">groups</span>
              </div>
              <h5 class="modal-title">{{ modalKelas.mode === 'add' ? 'Tambah Kelas' : 'Edit Kelas' }}</h5>
            </div>
            <button class="modal-close" @click="modalKelas.open = false">
              <span class="material-symbols-outlined" style="font-size:20px;">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Kelas <span class="required">*</span></label>
              <input
                v-model="modalKelas.data.nama_kelas"
                class="form-input"
                placeholder="Contoh: X MIPA 1"
                type="text"
                @keyup.enter="saveKelas"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Jurusan</label>
              <select v-model="modalKelas.data.jurusan" class="form-input">
                <option value="">— Pilih Jurusan —</option>
                <option value="MIPA">MIPA</option>
                <option value="IPS">IPS</option>
                <option value="Bahasa">Bahasa</option>
                <option value="Teknik">Teknik</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="modalKelas.open = false">Batal</button>
            <button class="btn-primary-md" :disabled="isSavingKelas" @click="saveKelas">
              <span v-if="isSavingKelas" class="material-symbols-outlined spin" style="font-size:16px">progress_activity</span>
              {{ isSavingKelas ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ================================================
         MODAL: Tambah / Edit Mapel
    ================================================ -->
    <Teleport to="body">
      <div v-if="modalMapel.open" class="modal-overlay" @click.self="modalMapel.open = false">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon">
                <span class="material-symbols-outlined" style="font-size:20px;">menu_book</span>
              </div>
              <h5 class="modal-title">{{ modalMapel.mode === 'add' ? 'Tambah Mapel' : 'Edit Mapel' }}</h5>
            </div>
            <button class="modal-close" @click="modalMapel.open = false">
              <span class="material-symbols-outlined" style="font-size:20px;">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Pelajaran <span class="required">*</span></label>
              <input
                v-model="modalMapel.data.nama_pelajaran"
                class="form-input"
                placeholder="Contoh: Matematika Wajib"
                type="text"
                @keyup.enter="saveMapel"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Kategori</label>
              <select v-model="modalMapel.data.kategori" class="form-input">
                <option value="">— Pilih Kategori —</option>
                <option value="STEM">STEM</option>
                <option value="Humanities">Humanities</option>
                <option value="Arts">Arts</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="modalMapel.open = false">Batal</button>
            <button class="btn-primary-md" :disabled="isSavingMapel" @click="saveMapel">
              <span v-if="isSavingMapel" class="material-symbols-outlined spin" style="font-size:16px">progress_activity</span>
              {{ isSavingMapel ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ================================================
         MODAL: Tambah / Edit Jadwal
    ================================================ -->
    <Teleport to="body">
      <div v-if="modalJadwal.open" class="modal-overlay" @click.self="modalJadwal.open = false">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon">
                <span class="material-symbols-outlined" style="font-size:20px;">calendar_month</span>
              </div>
              <h5 class="modal-title">{{ modalJadwal.mode === 'add' ? 'Tambah Jadwal' : 'Edit Jadwal' }}</h5>
            </div>
            <button class="modal-close" @click="modalJadwal.open = false">
              <span class="material-symbols-outlined" style="font-size:20px;">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Hari <span class="required">*</span></label>
                <select v-model.number="modalJadwal.data.hari" class="form-input">
                  <option :value="1">Senin</option>
                  <option :value="2">Selasa</option>
                  <option :value="3">Rabu</option>
                  <option :value="4">Kamis</option>
                  <option :value="5">Jumat</option>
                </select>
              </div>
              <div class="form-group">
                <!-- spacer -->
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Jam Mulai <span class="required">*</span></label>
                <input v-model="modalJadwal.data.jam_mulai" class="form-input" type="time" />
              </div>
              <div class="form-group">
                <label class="form-label">Jam Selesai <span class="required">*</span></label>
                <input v-model="modalJadwal.data.jam_selesai" class="form-input" type="time" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Kelas <span class="required">*</span></label>
              <select v-model.number="modalJadwal.data.kelas_id" class="form-input">
                <option :value="null">— Pilih Kelas —</option>
                <option v-for="k in kelasList" :key="k.id" :value="k.id">{{ k.nama_kelas }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Mata Pelajaran <span class="required">*</span></label>
              <select v-model.number="modalJadwal.data.mapel_id" class="form-input">
                <option :value="null">— Pilih Mapel —</option>
                <option v-for="m in mapelList" :key="m.id" :value="m.id">{{ m.nama_pelajaran }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Guru Pengampu</label>
              <select v-model="modalJadwal.data.guru_id" class="form-input">
                <option :value="null">— Pilih Guru (Opsional) —</option>
                <option v-for="g in guruList" :key="g.id" :value="g.id">{{ g.nama_lengkap }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="modalJadwal.open = false">Batal</button>
            <button class="btn-primary-md" :disabled="isSavingJadwal" @click="saveJadwal">
              <span v-if="isSavingJadwal" class="material-symbols-outlined spin" style="font-size:16px">progress_activity</span>
              {{ isSavingJadwal ? 'Menyimpan...' : 'Simpan Jadwal' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ================================================
         MODAL: Konfirmasi Hapus
    ================================================ -->
    <Teleport to="body">
      <div v-if="deleteConfirm.open" class="modal-overlay" @click.self="deleteConfirm.open = false">
        <div class="modal modal-sm">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon danger">
                <span class="material-symbols-outlined" style="font-size:20px;">warning</span>
              </div>
              <h5 class="modal-title">Konfirmasi Hapus</h5>
            </div>
            <button class="modal-close" @click="deleteConfirm.open = false">
              <span class="material-symbols-outlined" style="font-size:20px;">close</span>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-msg">
              Apakah Anda yakin ingin menghapus
              <strong>{{ deleteConfirm.label }}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="deleteConfirm.open = false">Batal</button>
            <button class="btn-danger" :disabled="isDeleting" @click="executeDelete">
              <span v-if="isDeleting" class="material-symbols-outlined spin" style="font-size:16px">progress_activity</span>
              {{ isDeleting ? 'Menghapus...' : 'Hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </AdminLayout>
</template>

<style scoped>
/* =====================================================
   LAYOUT
===================================================== */
.schedules-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-on-surface);
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.page-desc {
  font-size: 14px;
  color: var(--color-on-surface-variant);
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border: 1px solid rgba(194, 199, 209, 0.4);
  background-color: var(--color-surface-container-lowest);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-on-surface);
  cursor: pointer;
  transition: background-color 0.2s;
  font-family: var(--font-body);
}
.export-btn:hover { background-color: var(--color-surface-container); }

/* =====================================================
   BENTO GRID
===================================================== */
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* =====================================================
   CARD
===================================================== */
.card {
  background-color: var(--color-surface-container-lowest);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(194, 199, 209, 0.12);
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-full {
  grid-column: 1 / -1;
  padding: 28px 32px;
  gap: 24px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon {
  font-size: 22px;
  color: var(--color-primary);
}

.card-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: rgba(0, 53, 95, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-title {
  font-family: var(--font-headline);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-primary);
}

.card-subtitle {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  margin-top: 2px;
}

.jadwal-head-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge-count {
  padding: 4px 12px;
  background-color: var(--color-primary-fixed);
  color: var(--color-on-primary-fixed-variant);
  font-size: 11px;
  font-weight: 800;
  border-radius: 9999px;
  letter-spacing: 0.3px;
}

/* =====================================================
   TABLE
===================================================== */
.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead tr {
  border-bottom: 1px solid var(--color-surface-container);
}

.data-table th {
  padding-bottom: 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-on-surface-variant);
  white-space: nowrap;
}

.data-table tbody tr {
  border-bottom: 1px solid rgba(194, 199, 209, 0.08);
  transition: background-color 0.15s;
}

.data-table tbody tr:last-child {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background-color: var(--color-surface-container-low);
}

.data-table td {
  padding: 14px 0;
  vertical-align: middle;
  color: var(--color-on-surface);
}

.data-table td:not(:first-child) {
  padding-left: 12px;
}

/* Jadwal table spacing */
.jadwal-table th,
.jadwal-table td {
  padding-right: 16px;
}
.jadwal-table th:last-child,
.jadwal-table td:last-child {
  padding-right: 0;
}

.td-id {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 12px;
  white-space: nowrap;
}

.td-id-jadwal {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.td-mapel {
  font-weight: 600;
  color: var(--color-primary);
}

.text-right { text-align: right; }

.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
}

.empty-text {
  font-size: 13px;
  color: var(--color-on-surface-variant);
}

/* =====================================================
   BADGES
===================================================== */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-primary {
  background-color: var(--color-primary-fixed);
  color: var(--color-on-primary-fixed-variant);
}

.badge-secondary {
  background-color: var(--color-secondary-fixed);
  color: var(--color-on-secondary-fixed-variant);
}

.badge-tertiary {
  background-color: var(--color-tertiary-fixed);
  color: var(--color-on-tertiary-fixed-variant);
}

.badge-surface {
  background-color: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
}

/* =====================================================
   HARI & WAKTU & GURU CELLS
===================================================== */
.hari-label {
  font-weight: 600;
  color: var(--color-on-surface);
}

.waktu-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-on-surface-variant);
  font-size: 13px;
  white-space: nowrap;
}

.guru-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guru-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.guru-name {
  font-size: 13px;
  color: var(--color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

/* =====================================================
   ACTION BUTTONS
===================================================== */
.action-btns {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 8px;
  color: var(--color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background-color: var(--color-surface-container);
  color: var(--color-primary);
}

.icon-btn.danger:hover {
  background-color: var(--color-error-container);
  color: var(--color-error);
}

/* =====================================================
   BUTTON VARIANTS
===================================================== */
.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  font-family: var(--font-body);
  white-space: nowrap;
}
.btn-primary-sm:hover { opacity: 0.9; }
.btn-primary-sm:active { transform: scale(0.95); }

.btn-primary-md {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #00355f 0%, #0f4c81 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  box-shadow: 0 2px 8px rgba(0, 53, 95, 0.2);
  font-family: var(--font-body);
  white-space: nowrap;
}
.btn-primary-md:hover { opacity: 0.9; }
.btn-primary-md:active:not(:disabled) { transform: scale(0.96); }
.btn-primary-md:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid rgba(194, 199, 209, 0.4);
  color: var(--color-on-surface-variant);
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-body);
  transition: background-color 0.15s;
}
.btn-ghost:hover { background-color: var(--color-surface-container-low); }

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: var(--color-error);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: var(--font-body);
}
.btn-danger:hover { opacity: 0.9; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

/* =====================================================
   PAGINATION
===================================================== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(194, 199, 209, 0.1);
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  font-weight: 500;
}

.pagination-btns {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(194, 199, 209, 0.3);
  background: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-on-surface);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-body);
  padding: 0 4px;
}

.page-btn.icon-only {
  width: 32px;
  padding: 0;
}

.page-btn:hover:not(:disabled):not(.active) {
  background-color: var(--color-surface-container-low);
}

.page-btn.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* =====================================================
   MODAL
===================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(25, 28, 30, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 24px;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal {
  background-color: var(--color-surface-container-lowest);
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 24px 64px -8px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease;
  overflow: hidden;
}

.modal-lg { max-width: 560px; }
.modal-sm { max-width: 380px; }

@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(194, 199, 209, 0.12);
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: rgba(0, 53, 95, 0.08);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icon.danger {
  background-color: rgba(186, 26, 26, 0.08);
  color: var(--color-error);
}

.modal-title {
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 800;
  color: var(--color-on-surface);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 8px;
  color: var(--color-on-surface-variant);
  cursor: pointer;
  transition: background-color 0.15s;
}
.modal-close:hover { background-color: var(--color-surface-container); }

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(194, 199, 209, 0.12);
}

/* =====================================================
   FORM
===================================================== */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-on-surface-variant);
}

.required { color: var(--color-error); }

.form-input {
  width: 100%;
  background-color: var(--color-surface-container-low);
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
  appearance: none;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 53, 95, 0.08);
}

select.form-input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2342474f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  cursor: pointer;
}

/* Delete Confirm */
.delete-msg {
  font-size: 14px;
  color: var(--color-on-surface-variant);
  line-height: 1.6;
}
.delete-msg strong { color: var(--color-on-surface); }

/* =====================================================
   UTILITY
===================================================== */
.text-outline { color: var(--color-outline); font-size: 32px; }

.spin { animation: spin 0.8s linear infinite; display: inline-block; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* =====================================================
   RESPONSIVE
===================================================== */
@media (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .card-full { grid-column: 1; }
}

@media (max-width: 640px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .jadwal-head-right { flex-wrap: wrap; }
  .form-row-2 { grid-template-columns: 1fr; }
  .modal-body { padding: 16px; }
  .modal-footer { padding: 12px 16px; }
  .guru-name { max-width: 100px; }
}
</style>
