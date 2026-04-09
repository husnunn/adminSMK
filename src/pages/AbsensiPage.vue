<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { toast } from 'vue3-toastify'
import { supabase } from '../supabase'
import AdminLayout from '../components/layout/AdminLayout.vue'

// ─── State ────────────────────────────────────────────────────────────────────
const absensiList   = ref([])
const kelasList     = ref([])
const isLoading     = ref(false)
const isSaving      = ref(false)

// Filters
const filterKelas   = ref('')
const filterStatus  = ref('')
const filterDateFrom = ref(new Date().toISOString().split('T')[0])
const filterDateTo   = ref(new Date().toISOString().split('T')[0])

// Pagination
const currentPage = ref(1)
const PAGE_SIZE   = 12
const totalCount  = ref(0)

// Summary stats
const stats = reactive({ hadir: 0, terlambat: 0, sakit: 0, izin: 0, alfa: 0 })

// Override modal
const modalOverride = reactive({
  open: false,
  id:   null,
  siswaName: '',
  currentStatus: '',
  newStatus: '',
  keterangan: '',
})

// ─── Computed ─────────────────────────────────────────────────────────────────
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))

const STATUS_OPTIONS = ['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa']

function statusBadgeClass(s) {
  return {
    Hadir:     'ab-badge-hadir',
    Terlambat: 'ab-badge-terlambat',
    Sakit:     'ab-badge-sakit',
    Izin:      'ab-badge-izin',
    Alfa:      'ab-badge-alfa',
  }[s] ?? 'ab-badge-default'
}

function statusIcon(s) {
  return {
    Hadir:     'check_circle',
    Terlambat: 'schedule',
    Sakit:     'healing',
    Izin:      'assignment_ind',
    Alfa:      'cancel',
  }[s] ?? 'help'
}

function formatDateId(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatTimeStr(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })
}

function formatDateTimeStr(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchKelas() {
  const { data } = await supabase.from('master_kelas').select('*').order('nama_kelas')
  kelasList.value = data ?? []
}

async function fetchAbsensi() {
  isLoading.value = true
  const from = (currentPage.value - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const dateFrom = filterDateFrom.value ? filterDateFrom.value + 'T00:00:00' : null
  const dateTo   = filterDateTo.value   ? filterDateTo.value + 'T23:59:59'  : null

  let q = supabase
    .from('riwayat_absen')
    .select(
      `id, waktu_absen, status_absen,
       profiles!siswa_id(id, nama_lengkap, nomor_induk, kelas_id, master_kelas(nama_kelas)),
       jadwal_pelajaran!jadwal_id(hari, tipe_jadwal, master_mapel(nama_pelajaran))`,
      { count: 'exact' }
    )
    .order('waktu_absen', { ascending: false })
    .range(from, to)

  if (filterStatus.value)  q = q.eq('status_absen', filterStatus.value)
  if (dateFrom)            q = q.gte('waktu_absen', dateFrom)
  if (dateTo)              q = q.lte('waktu_absen', dateTo)
  if (filterKelas.value) {
    // Filter by kelas via join — use rpc or filter on client after fetch
    // We'll filter profiles.kelas_id
    q = q.eq('profiles.kelas_id', Number(filterKelas.value))
  }

  const { data, error, count } = await q

  isLoading.value = false
  if (error) { toast.error('Gagal memuat data absensi: ' + error.message); return }

  absensiList.value  = data ?? []
  totalCount.value   = count ?? 0
}

async function fetchSummaryStats() {
  const dateFrom = filterDateFrom.value ? filterDateFrom.value + 'T00:00:00' : null
  const dateTo   = filterDateTo.value   ? filterDateTo.value + 'T23:59:59'  : null

  const statusList = ['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa']
  const results = await Promise.all(statusList.map(async (s) => {
    let q = supabase
      .from('riwayat_absen')
      .select('*', { count: 'exact', head: true })
      .eq('status_absen', s)
    if (dateFrom) q = q.gte('waktu_absen', dateFrom)
    if (dateTo)   q = q.lte('waktu_absen', dateTo)
    const { count } = await q
    return { s, count: count ?? 0 }
  }))

  results.forEach(({ s, count }) => { stats[s.toLowerCase()] = count })
}

function computeStats(data) {
  stats.hadir     = data.filter(r => r.status_absen === 'Hadir').length
  stats.terlambat = data.filter(r => r.status_absen === 'Terlambat').length
  stats.sakit     = data.filter(r => r.status_absen === 'Sakit').length
  stats.izin      = data.filter(r => r.status_absen === 'Izin').length
  stats.alfa      = data.filter(r => r.status_absen === 'Alfa').length
}

// ─── Override / Manual Edit ───────────────────────────────────────────────────
function openOverride(row) {
  modalOverride.id            = row.id
  modalOverride.siswaName     = row.profiles?.nama_lengkap ?? '-'
  modalOverride.currentStatus = row.status_absen
  modalOverride.newStatus     = row.status_absen
  modalOverride.keterangan    = ''
  modalOverride.open          = true
}

async function saveOverride() {
  if (!modalOverride.newStatus) { toast.warn('Pilih status baru.'); return }
  isSaving.value = true
  try {
    const { error } = await supabase
      .from('riwayat_absen')
      .update({ status_absen: modalOverride.newStatus })
      .eq('id', modalOverride.id)
    if (error) throw error

    // Log the override action
    await supabase.from('activity_logs').insert([{
      title: 'Override Absensi',
      description: `Status ${modalOverride.siswaName} diubah dari ${modalOverride.currentStatus} → ${modalOverride.newStatus}${modalOverride.keterangan ? ': ' + modalOverride.keterangan : ''}`,
      icon: 'edit_note',
      bg_color: 'var(--color-tertiary)',
      text_color: 'white'
    }])

    toast.success(`Status absen berhasil diubah ke "${modalOverride.newStatus}".`)
    modalOverride.open = false
    await fetchAbsensi()
  } catch (e) {
    toast.error('Gagal menyimpan: ' + e.message)
  } finally {
    isSaving.value = false
  }
}

// ─── Filter & Pagination ──────────────────────────────────────────────────────
async function applyFilter() {
  currentPage.value = 1
  await Promise.all([fetchAbsensi(), fetchSummaryStats()])
}

async function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  await fetchAbsensi()
}

function resetFilter() {
  const today = new Date().toISOString().split('T')[0]
  filterKelas.value    = ''
  filterStatus.value   = ''
  filterDateFrom.value = today
  filterDateTo.value   = today
  applyFilter()
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
async function exportCSV() {
  toast.info('Mengambil semua data…')

  const dateFrom = filterDateFrom.value ? filterDateFrom.value + 'T00:00:00' : null
  const dateTo   = filterDateTo.value   ? filterDateTo.value + 'T23:59:59'  : null

  let q = supabase
    .from('riwayat_absen')
    .select(`id, waktu_absen, status_absen,
       profiles!siswa_id(nama_lengkap, nomor_induk, master_kelas(nama_kelas)),
       jadwal_pelajaran!jadwal_id(tipe_jadwal, master_mapel(nama_pelajaran))`)
    .order('waktu_absen', { ascending: false })

  if (filterStatus.value)  q = q.eq('status_absen', filterStatus.value)
  if (dateFrom)            q = q.gte('waktu_absen', dateFrom)
  if (dateTo)              q = q.lte('waktu_absen', dateTo)

  const { data, error } = await q
  if (error) { toast.error('Gagal ekspor: ' + error.message); return }
  if (!data?.length) { toast.warn('Tidak ada data untuk diekspor.'); return }

  // Build CSV
  const headers = ['No', 'Nama Siswa', 'Nomor Induk', 'Kelas', 'Waktu Absen', 'Status', 'Mata Pelajaran']
  const rows = data.map((r, i) => [
    i + 1,
    r.profiles?.nama_lengkap ?? '-',
    r.profiles?.nomor_induk ?? '-',
    r.profiles?.master_kelas?.nama_kelas ?? '-',
    formatDateTimeStr(r.waktu_absen),
    r.status_absen,
    r.jadwal_pelajaran?.master_mapel?.nama_pelajaran ?? '-',
  ])

  const csvContent = [['No', 'Nama Siswa', 'Nomor Induk', 'Kelas', 'Waktu Absen', 'Status', 'Mata Pelajaran'], ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `rekap-absensi-${filterDateFrom.value}-sd-${filterDateTo.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`${data.length} data berhasil diekspor.`)
}

// ─── Export Excel (XLSX via simple HTML table method) ────────────────────────
async function exportExcel() {
  toast.info('Mengambil semua data…')

  const dateFrom = filterDateFrom.value ? filterDateFrom.value + 'T00:00:00' : null
  const dateTo   = filterDateTo.value   ? filterDateTo.value + 'T23:59:59'  : null

  let q = supabase
    .from('riwayat_absen')
    .select(`id, waktu_absen, status_absen,
       profiles!siswa_id(nama_lengkap, nomor_induk, master_kelas(nama_kelas)),
       jadwal_pelajaran!jadwal_id(tipe_jadwal, master_mapel(nama_pelajaran))`)
    .order('waktu_absen', { ascending: false })

  if (filterStatus.value)  q = q.eq('status_absen', filterStatus.value)
  if (dateFrom)            q = q.gte('waktu_absen', dateFrom)
  if (dateTo)              q = q.lte('waktu_absen', dateTo)

  const { data, error } = await q
  if (error) { toast.error('Gagal ekspor: ' + error.message); return }
  if (!data?.length) { toast.warn('Tidak ada data untuk diekspor.'); return }

  // Build HTML table (Excel can open it)
  const headers = ['No', 'Nama Siswa', 'Nomor Induk', 'Kelas', 'Waktu Absen', 'Status', 'Mata Pelajaran']
  let tableHtml = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`
  data.forEach((r, i) => {
    tableHtml += `<tr>
      <td>${i + 1}</td>
      <td>${r.profiles?.nama_lengkap ?? '-'}</td>
      <td>${r.profiles?.nomor_induk ?? '-'}</td>
      <td>${r.profiles?.master_kelas?.nama_kelas ?? '-'}</td>
      <td>${formatDateTimeStr(r.waktu_absen)}</td>
      <td>${r.status_absen}</td>
      <td>${r.jadwal_pelajaran?.master_mapel?.nama_pelajaran ?? '-'}</td>
    </tr>`
  })
  tableHtml += '</tbody></table>'

  const xlsContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${tableHtml}</body></html>`
  const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `rekap-absensi-${filterDateFrom.value}-sd-${filterDateTo.value}.xls`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`${data.length} data berhasil diekspor ke Excel.`)
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchKelas()
  await Promise.all([fetchAbsensi(), fetchSummaryStats()])
})
</script>

<template>
  <AdminLayout page-title="Rekap Absensi" search-placeholder="Cari siswa...">
    <div class="absensi-content">

      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title">Rekapitulasi Absensi</h2>
          <p class="page-desc">Pantau, filter, dan ekspor laporan absensi siswa secara menyeluruh.</p>
        </div>
        <div class="header-actions">
          <button class="export-btn secondary" @click="exportCSV">
            <span class="material-symbols-outlined" style="font-size:17px">file_download</span>
            Ekspor CSV
          </button>
          <button class="export-btn primary" @click="exportExcel">
            <span class="material-symbols-outlined" style="font-size:17px">table_view</span>
            Ekspor Excel
          </button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-row">
        <div class="stat-chip hadir">
          <span class="material-symbols-outlined" style="font-size:20px">check_circle</span>
          <div>
            <p class="stat-chip-label">Hadir</p>
            <p class="stat-chip-value">{{ stats.hadir }}</p>
          </div>
        </div>
        <div class="stat-chip terlambat">
          <span class="material-symbols-outlined" style="font-size:20px">schedule</span>
          <div>
            <p class="stat-chip-label">Terlambat</p>
            <p class="stat-chip-value">{{ stats.terlambat }}</p>
          </div>
        </div>
        <div class="stat-chip sakit">
          <span class="material-symbols-outlined" style="font-size:20px">healing</span>
          <div>
            <p class="stat-chip-label">Sakit</p>
            <p class="stat-chip-value">{{ stats.sakit }}</p>
          </div>
        </div>
        <div class="stat-chip izin">
          <span class="material-symbols-outlined" style="font-size:20px">assignment_ind</span>
          <div>
            <p class="stat-chip-label">Izin</p>
            <p class="stat-chip-value">{{ stats.izin }}</p>
          </div>
        </div>
        <div class="stat-chip alfa">
          <span class="material-symbols-outlined" style="font-size:20px">cancel</span>
          <div>
            <p class="stat-chip-label">Alfa</p>
            <p class="stat-chip-value">{{ stats.alfa }}</p>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-card">
        <div class="filter-bar">
          <div class="filter-group">
            <label class="filter-label">Dari Tanggal</label>
            <input v-model="filterDateFrom" type="date" class="filter-input" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Sampai Tanggal</label>
            <input v-model="filterDateTo" type="date" class="filter-input" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Kelas</label>
            <select v-model="filterKelas" class="filter-input">
              <option value="">— Semua Kelas —</option>
              <option v-for="k in kelasList" :key="k.id" :value="k.id">{{ k.nama_kelas }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Status Absen</label>
            <select v-model="filterStatus" class="filter-input">
              <option value="">— Semua Status —</option>
              <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn-filter-reset" @click="resetFilter">
              <span class="material-symbols-outlined" style="font-size:16px">refresh</span>
            </button>
            <button class="btn-filter-apply" @click="applyFilter">
              <span class="material-symbols-outlined" style="font-size:16px">filter_list</span>
              Terapkan
            </button>
          </div>
        </div>
        <p class="filter-hint">
          Menampilkan <strong>{{ absensiList.length }}</strong> dari <strong>{{ totalCount }}</strong> entri
        </p>
      </div>

      <!-- Table -->
      <div class="table-card">
        <!-- Loading -->
        <div v-if="isLoading" class="table-state">
          <span class="material-symbols-outlined spin" style="font-size:36px; color:var(--color-outline)">progress_activity</span>
          <span>Memuat data absensi…</span>
        </div>
        <!-- Empty -->
        <div v-else-if="absensiList.length === 0" class="table-state">
          <span class="material-symbols-outlined" style="font-size:52px; color:var(--color-outline-variant)">event_busy</span>
          <span>Tidak ada data absensi untuk filter ini.</span>
        </div>

        <!-- Data Table -->
        <table v-else class="ab-table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Kelas</th>
              <th>Waktu Absen</th>
              <th>Mapel</th>
              <th>Status</th>
              <th class="text-right">Override</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in absensiList" :key="row.id">
              <!-- Siswa -->
              <td>
                <div class="siswa-cell">
                  <div class="siswa-avatar">{{ (row.profiles?.nama_lengkap ?? 'U')[0].toUpperCase() }}</div>
                  <div>
                    <p class="siswa-name">{{ row.profiles?.nama_lengkap ?? '—' }}</p>
                    <p class="siswa-induk">{{ row.profiles?.nomor_induk ?? '—' }}</p>
                  </div>
                </div>
              </td>
              <!-- Kelas -->
              <td>
                <span class="kelas-tag">{{ row.profiles?.master_kelas?.nama_kelas ?? '—' }}</span>
              </td>
              <!-- Waktu -->
              <td>
                <div class="waktu-cell">
                  <span class="material-symbols-outlined" style="font-size:13px; color:var(--color-on-surface-variant)">schedule</span>
                  <span>{{ formatDateTimeStr(row.waktu_absen) }}</span>
                </div>
              </td>
              <!-- Mapel -->
              <td class="mapel-text">{{ row.jadwal_pelajaran?.master_mapel?.nama_pelajaran ?? '—' }}</td>
              <!-- Status -->
              <td>
                <span :class="['ab-badge', statusBadgeClass(row.status_absen)]">
                  <span class="material-symbols-outlined" style="font-size:12px;font-variation-settings:'FILL' 1">{{ statusIcon(row.status_absen) }}</span>
                  {{ row.status_absen }}
                </span>
              </td>
              <!-- Override -->
              <td class="text-right">
                <button class="override-btn" title="Manual Override Status" @click="openOverride(row)">
                  <span class="material-symbols-outlined" style="font-size:16px">edit_note</span>
                  Override
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalCount > 0" class="ab-pagination">
          <p class="pag-info">Halaman {{ currentPage }} dari {{ totalPages }} ({{ totalCount }} total)</p>
          <div class="pag-btns">
            <button class="pag-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
              <span class="material-symbols-outlined" style="font-size:18px">chevron_left</span>
            </button>
            <button
              v-for="p in totalPages" :key="p"
              :class="['pag-btn', { active: p === currentPage }]"
              @click="goToPage(p)"
            >{{ p }}</button>
            <button class="pag-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
              <span class="material-symbols-outlined" style="font-size:18px">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal Override ──────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="modalOverride.open" class="modal-overlay" @click.self="modalOverride.open = false">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon-wrap">
                <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-primary)">edit_note</span>
              </div>
              <div>
                <h5 class="modal-title">Override Status Absensi</h5>
                <p class="modal-subtitle">{{ modalOverride.siswaName }}</p>
              </div>
            </div>
            <button class="modal-close" @click="modalOverride.open = false">
              <span class="material-symbols-outlined" style="font-size:20px">close</span>
            </button>
          </div>

          <div class="modal-body">
            <!-- Current status -->
            <div class="override-current">
              <p class="oc-label">Status Saat Ini</p>
              <span :class="['ab-badge', statusBadgeClass(modalOverride.currentStatus)]">
                <span class="material-symbols-outlined" style="font-size:12px;font-variation-settings:'FILL' 1">{{ statusIcon(modalOverride.currentStatus) }}</span>
                {{ modalOverride.currentStatus }}
              </span>
            </div>

            <!-- New status -->
            <div class="form-group">
              <label class="form-label">Ubah Status Menjadi <span class="required">*</span></label>
              <div class="status-selector">
                <button
                  v-for="s in STATUS_OPTIONS" :key="s"
                  :class="['status-opt', statusBadgeClass(s), { 'status-opt-active': modalOverride.newStatus === s }]"
                  @click="modalOverride.newStatus = s"
                >
                  <span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">{{ statusIcon(s) }}</span>
                  {{ s }}
                </button>
              </div>
            </div>

            <!-- Keterangan -->
            <div class="form-group">
              <label class="form-label">Keterangan / Alasan <span style="font-weight:400;color:var(--color-on-surface-variant)">(opsional)</span></label>
              <textarea
                v-model="modalOverride.keterangan"
                class="form-textarea"
                rows="3"
                placeholder="Contoh: Siswa membawa surat keterangan sakit dari dokter..."
              ></textarea>
            </div>

            <div class="override-warning">
              <span class="material-symbols-outlined" style="font-size:16px;color:var(--color-error)">warning</span>
              <p>Perubahan ini akan tercatat di log aktivitas dan tidak dapat dibatalkan secara otomatis.</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost" @click="modalOverride.open = false">Batal</button>
            <button
              class="btn-primary-save"
              :disabled="isSaving || modalOverride.newStatus === modalOverride.currentStatus"
              @click="saveOverride"
            >
              <span v-if="isSaving" class="material-symbols-outlined spin" style="font-size:15px">progress_activity</span>
              <span class="material-symbols-outlined" v-else style="font-size:15px">save</span>
              {{ isSaving ? 'Menyimpan…' : 'Simpan Perubahan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ─── Layout ────────────────────────────────────────────────────────────────── */
.absensi-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ─── Header ─────────────────────────────────────────────────────────────────── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
}
.page-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-on-surface);
  letter-spacing: -0.5px;
}
.page-desc {
  font-size: 14px;
  color: var(--color-on-surface-variant);
  margin-top: 4px;
}
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.export-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 10px; border: none;
  font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: var(--font-body);
  transition: opacity 0.2s, transform 0.15s;
}
.export-btn:hover { opacity: 0.88; }
.export-btn:active { transform: scale(0.97); }
.export-btn.secondary {
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  border: 1px solid rgba(0,0,0,0.06);
}
.export-btn.primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-container));
  color: white;
  box-shadow: 0 2px 8px rgba(0,53,95,0.2);
}

/* ─── Stats Row ──────────────────────────────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.stat-chip {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-radius: 14px;
  flex: 1; min-width: 130px;
  border: 1px solid rgba(0,0,0,0.06);
  background: var(--color-surface-container-lowest);
}
.stat-chip-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.7; }
.stat-chip-value { font-size: 26px; font-weight: 800; letter-spacing: -1px; margin-top: 2px; }

.stat-chip.hadir     { border-left: 4px solid #22c55e; }
.stat-chip.terlambat { border-left: 4px solid #f59e0b; }
.stat-chip.sakit     { border-left: 4px solid #3b82f6; }
.stat-chip.izin      { border-left: 4px solid #8b5cf6; }
.stat-chip.alfa      { border-left: 4px solid #ef4444; }

.stat-chip.hadir     .material-symbols-outlined { color: #22c55e; }
.stat-chip.terlambat .material-symbols-outlined { color: #f59e0b; }
.stat-chip.sakit     .material-symbols-outlined { color: #3b82f6; }
.stat-chip.izin      .material-symbols-outlined { color: #8b5cf6; }
.stat-chip.alfa      .material-symbols-outlined { color: #ef4444; }

/* ─── Filter Card ─────────────────────────────────────────────────────────────── */
.filter-card {
  background: var(--color-surface-container-lowest);
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--color-on-surface-variant); }
.filter-input {
  padding: 9px 14px; border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.1);
  background: var(--color-surface);
  font-family: var(--font-body); font-size: 13px;
  color: var(--color-on-surface);
  outline: none; min-width: 150px;
  transition: border-color 0.2s;
}
.filter-input:focus { border-color: var(--color-primary); }
.filter-actions { display: flex; gap: 8px; align-items: flex-end; }
.btn-filter-reset {
  padding: 9px 12px; border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.1);
  background: var(--color-surface); cursor: pointer;
  color: var(--color-on-surface-variant);
  display: flex; align-items: center;
  transition: background 0.15s;
}
.btn-filter-reset:hover { background: var(--color-surface-container-low); }
.btn-filter-apply {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 10px; border: none;
  background: var(--color-primary); color: white;
  font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: var(--font-body);
  transition: opacity 0.2s;
}
.btn-filter-apply:hover { opacity: 0.88; }
.filter-hint { font-size: 12px; color: var(--color-on-surface-variant); }

/* ─── Table Card ─────────────────────────────────────────────────────────────── */
.table-card {
  background: var(--color-surface-container-lowest);
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 16px;
  overflow: hidden;
}
.ab-table { width: 100%; border-collapse: collapse; }
.ab-table thead tr {
  background: var(--color-surface-container-low);
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.ab-table th {
  padding: 13px 20px; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  color: var(--color-on-surface-variant); text-align: left;
}
.ab-table td {
  padding: 16px 20px; font-size: 13px;
  color: var(--color-on-surface);
  border-bottom: 1px solid rgba(0,0,0,0.04);
  vertical-align: middle;
}
.ab-table tbody tr:hover { background: var(--color-surface-container); }
.ab-table tbody tr:last-child td { border-bottom: none; }
.text-right { text-align: right !important; }

/* Cells */
.siswa-cell { display: flex; align-items: center; gap: 12px; }
.siswa-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--color-primary-fixed);
  color: var(--color-primary);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; flex-shrink: 0;
}
.siswa-name { font-weight: 600; font-size: 13px; }
.siswa-induk { font-size: 11px; color: var(--color-on-surface-variant); font-family: monospace; margin-top: 2px; }
.kelas-tag {
  padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
}
.waktu-cell { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--color-on-surface-variant); }
.mapel-text { font-size: 12px; color: var(--color-on-surface-variant); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jarak-tag { font-size: 11px; font-family: monospace; color: var(--color-on-surface-variant); }

/* Status badges */
.ab-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
}
.ab-badge-hadir     { background: #dcfce7; color: #15803d; }
.ab-badge-terlambat { background: #fef9c3; color: #854d0e; }
.ab-badge-sakit     { background: #dbeafe; color: #1d4ed8; }
.ab-badge-izin      { background: #ede9fe; color: #6d28d9; }
.ab-badge-alfa      { background: #fee2e2; color: #b91c1c; }
.ab-badge-default   { background: var(--color-surface-container-high); color: var(--color-on-surface-variant); }

/* Override button */
.override-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1); background: var(--color-surface);
  color: var(--color-on-surface); font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: var(--font-body);
  transition: background 0.15s, border-color 0.15s;
}
.override-btn:hover {
  background: var(--color-primary-fixed);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Table states */
.table-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 20px;
  color: var(--color-on-surface-variant); font-size: 14px; font-weight: 500;
}

/* Pagination */
.ab-pagination {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-top: 1px solid rgba(0,0,0,0.05);
  flex-wrap: wrap; gap: 10px;
}
.pag-info { font-size: 12px; color: var(--color-on-surface-variant); }
.pag-btns { display: flex; gap: 4px; }
.pag-btn {
  min-width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1); background: var(--color-surface);
  color: var(--color-on-surface); font-size: 13px; font-weight: 500;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-body);
  transition: background 0.15s;
}
.pag-btn:hover:not(:disabled) { background: var(--color-primary-fixed); color: var(--color-primary); }
.pag-btn.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ─── Modal ──────────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px); display: flex;
  align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: var(--color-surface);
  border-radius: 20px; width: 500px; max-width: 95vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  overflow: hidden;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,0.06);
}
.modal-header-left { display: flex; align-items: center; gap: 14px; }
.modal-icon-wrap {
  width: 40px; height: 40px; border-radius: 10px;
  background: var(--color-primary-fixed);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.modal-title { font-size: 16px; font-weight: 700; color: var(--color-on-surface); }
.modal-subtitle { font-size: 12px; color: var(--color-on-surface-variant); margin-top: 2px; }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-on-surface-variant); border-radius: 8px; padding: 4px;
}
.modal-close:hover { background: var(--color-surface-container); }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 24px; border-top: 1px solid rgba(0,0,0,0.06);
  background: var(--color-surface-container-lowest);
}

/* Override Modal Internals */
.override-current { display: flex; align-items: center; gap: 14px; }
.oc-label { font-size: 12px; font-weight: 600; color: var(--color-on-surface-variant); flex-shrink: 0; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 12px; font-weight: 700; color: var(--color-on-surface-variant); text-transform: uppercase; letter-spacing: 0.6px; }
.status-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.status-opt {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 20px;
  border: 2px solid transparent; cursor: pointer;
  font-size: 12px; font-weight: 600; font-family: var(--font-body);
  opacity: 0.55; transition: opacity 0.15s, border-color 0.15s;
}
.status-opt:hover { opacity: 0.85; }
.status-opt-active { opacity: 1; border-color: currentColor; }
.form-textarea {
  padding: 10px 14px; border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.1); font-family: var(--font-body);
  font-size: 13px; color: var(--color-on-surface); resize: vertical;
  background: var(--color-surface-container); outline: none;
}
.form-textarea:focus { border-color: var(--color-primary); }
.override-warning {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 12px 14px; border-radius: 10px;
  background: #fff5f5; border: 1px solid #fecaca;
}
.override-warning p { font-size: 12px; color: var(--color-on-surface-variant); line-height: 1.5; }
.btn-ghost {
  padding: 9px 18px; border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.1); background: transparent;
  font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: var(--font-body); color: var(--color-on-surface);
}
.btn-primary-save {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 20px; border-radius: 10px; border: none;
  background: var(--color-primary); color: white;
  font-size: 13px; font-weight: 700; cursor: pointer;
  font-family: var(--font-body);
  transition: opacity 0.2s;
}
.btn-primary-save:disabled { opacity: 0.5; cursor: not-allowed; }

.required { color: var(--color-error); }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin { animation: spin 1s linear infinite; }
</style>
