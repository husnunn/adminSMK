<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { toast } from 'vue3-toastify'
import { supabase } from '../supabase'
import AdminLayout from '../components/layout/AdminLayout.vue'

// =====================================================
// HELPERS
// =====================================================
const todayStr = new Date().toISOString().split('T')[0]

function timeToMins(t) {
  const [h, m] = (t ?? '00:00').slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function timesOverlap(s1, e1, s2, e2) {
  return timeToMins(s1) < timeToMins(e2) && timeToMins(e1) > timeToMins(s2)
}

function formatDateId(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// =====================================================
// STATE: Master Kategori
// =====================================================
const kategoriList = ref([])
const isLoadingKategori = ref(false)
const modalKategori = reactive({ open: false, mode: 'add', data: { id: null, nama_kategori: '' } })
const isSavingKategori = ref(false)

// =====================================================
// STATE: Master Kelas
// =====================================================
const kelasList      = ref([])
const isLoadingKelas = ref(false)
const modalKelas     = reactive({ open: false, mode: 'add', data: { id: null, nama_kelas: ''} })
const isSavingKelas  = ref(false)

// =====================================================
// STATE: Master Mapel
// =====================================================
const mapelList      = ref([])
const isLoadingMapel = ref(false)
const modalMapel     = reactive({ open: false, mode: 'add', data: { id: null, nama_pelajaran: '', kategori_id: null } })
const isSavingMapel  = ref(false)

// =====================================================
// STATE: Guru
// =====================================================
const guruList = ref([])

// =====================================================
// STATE: Jadwal Pelajaran
// =====================================================
const jadwalList        = ref([])
const isLoadingJadwal   = ref(false)
const jadwalPage        = ref(1)
const jadwalPageSize    = 8
const jadwalTotalCount  = ref(0)
const isCheckingConflict = ref(false)
const modalJadwal = reactive({
  open: false,
  mode: 'add',
  data: {
    id: null,
    tipe_jadwal: 'Rutin',
    hari:        1,
    tanggal:     todayStr,
    jam_mulai:   '07:00',
    jam_selesai: '08:30',
    kelas_id:    null,
    mapel_id:    null,
    guru_id:     null,
    keterangan:  '',
  }
})
const isSavingJadwal = ref(false)

// =====================================================
// STATE: Calendar
// =====================================================
const calendarYear  = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth()) // 0-indexed
const specialDates  = ref([]) // Event/Libur entries with tanggal filled
const selectedDay   = ref(null) // { dateStr, day, special[] }

// =====================================================
// STATE: Delete Confirm
// =====================================================
const deleteConfirm = reactive({ open: false, type: '', id: null, label: '' })
const isDeleting    = ref(false)

// =====================================================
// COMPUTED
// =====================================================
const jadwalTotalPages = computed(() => Math.max(1, Math.ceil(jadwalTotalCount.value / jadwalPageSize)))
const hariLabel   = (h) => ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'][h] ?? '-'
const hariNum     = (dateStr) => { const d = new Date(dateStr + 'T00:00:00'); return (d.getDay() + 6) % 7 + 1 } // Mon=1

const jurusanBadgeClass    = (j) => ({ MIPA: 'badge-secondary', IPS: 'badge-tertiary', Bahasa: 'badge-surface' }[j] ?? 'badge-surface')
const kategoriBadgeClass   = (n) => ({ STEM: 'badge-primary', Humanities: 'badge-surface', Arts: 'badge-tertiary', General: 'badge-secondary' }[n] ?? 'badge-surface')
const tipeJadwalBadgeClass = (t) => ({ Rutin: 'badge-secondary', Event: 'badge-tertiary', Libur: 'badge-error' }[t] ?? 'badge-surface')

const isRutin  = computed(() => modalJadwal.data.tipe_jadwal === 'Rutin')
const isEvent  = computed(() => modalJadwal.data.tipe_jadwal === 'Event')
const isLibur  = computed(() => modalJadwal.data.tipe_jadwal === 'Libur')

const calendarMonthLabel = computed(() =>
  new Date(calendarYear.value, calendarMonth.value, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
)

const calendarDays = computed(() => {
  const year  = calendarYear.value
  const month = calendarMonth.value

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const lastDate       = new Date(year, month + 1, 0).getDate()

  const days = []

  // Leading empty cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ day: null, type: 'empty', dateStr: null, isToday: false, special: [], label: null })
  }

  for (let d = 1; d <= lastDate; d++) {
    const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow      = new Date(dateStr + 'T00:00:00').getDay() // 0=Sun 6=Sat
    const isToday  = dateStr === todayStr
    const special  = specialDates.value.filter(s => s.tanggal === dateStr)
    const hasLibur = special.some(s => s.tipe_jadwal === 'Libur')
    const hasEvent = special.some(s => !hasLibur && s.tipe_jadwal === 'Event')

    let type = 'school'
    if (dow === 0)    type = 'sunday'
    else if (dow === 6) type = 'saturday'
    if (hasLibur)     type = 'libur'
    else if (hasEvent && type === 'school') type = 'event'

    days.push({
      day: d,
      type,
      dateStr,
      isToday,
      special,
      label: special.find(s => s.keterangan)?.keterangan ?? null,
    })
  }

  // Trailing empty to fill up to multiple of 7
  while (days.length % 7 !== 0) {
    days.push({ day: null, type: 'empty', dateStr: null, isToday: false, special: [], label: null })
  }

  return days
})

// =====================================================
// FETCH FUNCTIONS
// =====================================================
async function fetchKategori() {
  isLoadingKategori.value = true
  const { data, error } = await supabase.from('master_kategori').select('*').order('nama_kategori')
  isLoadingKategori.value = false
  if (error) { toast.error('Gagal memuat kategori.'); return }
  kategoriList.value = data ?? []
}

async function fetchKelas() {
  isLoadingKelas.value = true
  const { data, error } = await supabase.from('master_kelas').select('*').order('nama_kelas')
  isLoadingKelas.value = false
  if (error) { toast.error('Gagal memuat kelas.'); return }
  kelasList.value = data ?? []
}

async function fetchMapel() {
  isLoadingMapel.value = true
  const { data, error } = await supabase
    .from('master_mapel')
    .select('id, nama_pelajaran, kategori_id, master_kategori(id, nama_kategori)')
    .order('nama_pelajaran')
  isLoadingMapel.value = false
  if (error) { toast.error('Gagal memuat mapel.'); return }
  mapelList.value = data ?? []
}

async function fetchGuru() {
  const { data } = await supabase
    .from('profiles')
    .select('id, nama_lengkap')
    .eq('role', 'guru')
    .order('nama_lengkap')
  guruList.value = data ?? []
}

async function fetchJadwal() {
  isLoadingJadwal.value = true
  const from = (jadwalPage.value - 1) * jadwalPageSize
  const to   = from + jadwalPageSize - 1

  const { data, error, count } = await supabase
    .from('jadwal_pelajaran')
    .select(
      `id, hari, tanggal, tipe_jadwal, keterangan, jam_mulai, jam_selesai,
       master_kelas(id, nama_kelas),
       master_mapel(id, nama_pelajaran),
       profiles(id, nama_lengkap)`,
      { count: 'exact' }
    )
    .order('hari',      { ascending: true,  nullsFirst: false })
    .order('tanggal',   { ascending: true,  nullsFirst: false })
    .order('jam_mulai', { ascending: true,  nullsFirst: false })
    .range(from, to)

  isLoadingJadwal.value = false
  if (error) { toast.error('Gagal memuat jadwal.'); return }
  jadwalList.value     = data ?? []
  jadwalTotalCount.value = count ?? 0
}

async function fetchSpecialDates() {
  const year     = calendarYear.value
  const month    = calendarMonth.value
  const lastDay  = new Date(year, month + 1, 0).getDate()
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const last  = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('jadwal_pelajaran')
    .select('id, tanggal, tipe_jadwal, keterangan')
    .in('tipe_jadwal', ['Libur', 'Event'])
    .not('tanggal', 'is', null)
    .gte('tanggal', first)
    .lte('tanggal', last)

  specialDates.value = data ?? []
}

// =====================================================
// CALENDAR NAVIGATION
// =====================================================
async function prevMonth() {
  if (calendarMonth.value === 0) { calendarMonth.value = 11; calendarYear.value-- }
  else calendarMonth.value--
  selectedDay.value = null
  await fetchSpecialDates()
}

async function nextMonth() {
  if (calendarMonth.value === 11) { calendarMonth.value = 0; calendarYear.value++ }
  else calendarMonth.value++
  selectedDay.value = null
  await fetchSpecialDates()
}

function selectDay(day) {
  if (!day.dateStr || day.type === 'empty') return
  if (selectedDay.value?.dateStr === day.dateStr) { selectedDay.value = null; return }
  selectedDay.value = day
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
    const payload = { nama_kelas: modalKelas.data.nama_kelas, jurusan: modalKelas.data.jurusan }
    if (modalKelas.mode === 'add') {
      const { error } = await supabase.from('master_kelas').insert([payload])
      if (error) throw error
      toast.success('Kelas berhasil ditambahkan.')
    } else {
      const { error } = await supabase.from('master_kelas').update(payload).eq('id', modalKelas.data.id)
      if (error) throw error
      toast.success('Kelas berhasil diperbarui.')
    }
    modalKelas.open = false
    await fetchKelas()
  } catch (e) { toast.error(`Error: ${e.message}`) }
  finally { isSavingKelas.value = false }
}

async function deleteKelas(id) {
  isDeleting.value = true
  const { error } = await supabase.from('master_kelas').delete().eq('id', id)
  isDeleting.value = false; deleteConfirm.open = false
  if (error) { toast.error(`Gagal hapus: ${error.message}`); return }
  toast.success('Kelas berhasil dihapus.')
  await fetchKelas(); await fetchJadwal()
}

// =====================================================
// KATEGORI CRUD
// =====================================================
function openAddKategori() {
  modalKategori.mode = 'add'
  modalKategori.data = { id: null, nama_kategori: '' }
  modalKategori.open = true
}

function openEditKategori(row) {
  modalKategori.mode = 'edit'
  modalKategori.data = { id: row.id, nama_kategori: row.nama_kategori }
  modalKategori.open = true
}

async function saveKategori() {
  if (!modalKategori.data.nama_kategori.trim()) { toast.warn('Nama kategori wajib diisi.'); return }
  isSavingKategori.value = true
  try {
    const payload = { nama_kategori: modalKategori.data.nama_kategori }
    if (modalKategori.mode === 'add') {
      const { error } = await supabase.from('master_kategori').insert([payload])
      if (error) throw error
      toast.success('Kategori berhasil ditambahkan.')
    } else {
      const { error } = await supabase.from('master_kategori').update(payload).eq('id', modalKategori.data.id)
      if (error) throw error
      toast.success('Kategori berhasil diperbarui.')
    }
    modalKategori.open = false
    await fetchKategori()
  } catch (e) { toast.error(`Error: ${e.message}`) }
  finally { isSavingKategori.value = false }
}

async function deleteKategori(id) {
  isDeleting.value = true
  const { error } = await supabase.from('master_kategori').delete().eq('id', id)
  isDeleting.value = false; deleteConfirm.open = false
  if (error) { toast.error(`Gagal hapus: ${error.message}`); return }
  toast.success('Kategori berhasil dihapus.')
  await fetchKategori(); await fetchMapel()
}

// =====================================================
// MAPEL CRUD
// =====================================================
function openAddMapel() {
  modalMapel.mode = 'add'
  modalMapel.data = { id: null, nama_pelajaran: '', kategori_id: null }
  modalMapel.open = true
}

function openEditMapel(row) {
  modalMapel.mode = 'edit'
  modalMapel.data = { id: row.id, nama_pelajaran: row.nama_pelajaran, kategori_id: row.kategori_id }
  modalMapel.open = true
}

async function saveMapel() {
  if (!modalMapel.data.nama_pelajaran.trim()) { toast.warn('Nama pelajaran wajib diisi.'); return }
  isSavingMapel.value = true
  try {
    const payload = { nama_pelajaran: modalMapel.data.nama_pelajaran, kategori_id: modalMapel.data.kategori_id || null }
    if (modalMapel.mode === 'add') {
      const { error } = await supabase.from('master_mapel').insert([payload])
      if (error) throw error
      toast.success('Mapel berhasil ditambahkan.')
    } else {
      const { error } = await supabase.from('master_mapel').update(payload).eq('id', modalMapel.data.id)
      if (error) throw error
      toast.success('Mapel berhasil diperbarui.')
    }
    modalMapel.open = false
    await fetchMapel(); await fetchJadwal()
  } catch (e) { toast.error(`Error: ${e.message}`) }
  finally { isSavingMapel.value = false }
}

async function deleteMapel(id) {
  isDeleting.value = true
  const { error } = await supabase.from('master_mapel').delete().eq('id', id)
  isDeleting.value = false; deleteConfirm.open = false
  if (error) { toast.error(`Gagal hapus: ${error.message}`); return }
  toast.success('Mapel berhasil dihapus.')
  await fetchMapel(); await fetchJadwal()
}

// =====================================================
// JADWAL CRUD
// =====================================================
function openAddJadwal() {
  modalJadwal.mode = 'add'
  Object.assign(modalJadwal.data, {
    id: null, tipe_jadwal: 'Rutin', hari: 1, tanggal: todayStr,
    jam_mulai: '07:00', jam_selesai: '08:30',
    kelas_id: null, mapel_id: null, guru_id: null, keterangan: '',
  })
  modalJadwal.open = true
}

function openAddJadwalForDate(dateStr) {
  const dow  = new Date(dateStr + 'T00:00:00').getDay()
  const tipe = (dow === 0 || dow === 6) ? 'Libur' : 'Event'
  modalJadwal.mode = 'add'
  Object.assign(modalJadwal.data, {
    id: null, tipe_jadwal: tipe, hari: 1, tanggal: dateStr < todayStr ? todayStr : dateStr,
    jam_mulai: '07:00', jam_selesai: '08:30',
    kelas_id: null, mapel_id: null, guru_id: null, keterangan: '',
  })
  modalJadwal.open = true
}

function openEditJadwal(row) {
  modalJadwal.mode = 'edit'
  Object.assign(modalJadwal.data, {
    id:          row.id,
    tipe_jadwal: row.tipe_jadwal ?? 'Rutin',
    hari:        row.hari ?? 1,
    tanggal:     row.tanggal ?? todayStr,
    jam_mulai:   row.jam_mulai?.slice(0, 5) ?? '07:00',
    jam_selesai: row.jam_selesai?.slice(0, 5) ?? '08:30',
    kelas_id:    row.master_kelas?.id ?? null,
    mapel_id:    row.master_mapel?.id ?? null,
    guru_id:     row.profiles?.id ?? null,
    keterangan:  row.keterangan ?? '',
  })
  modalJadwal.open = true
}

/** Returns true if there's a schedule conflict (same guru, same hari, overlapping time, Rutin type) */
async function checkConflict() {
  const d = modalJadwal.data
  if (d.tipe_jadwal !== 'Rutin' || !d.guru_id) return false

  isCheckingConflict.value = true
  let q = supabase
    .from('jadwal_pelajaran')
    .select('id, jam_mulai, jam_selesai')
    .eq('guru_id', d.guru_id)
    .eq('hari', Number(d.hari))
    .eq('tipe_jadwal', 'Rutin')

  if (modalJadwal.mode === 'edit') q = q.neq('id', d.id)

  const { data, error } = await q
  isCheckingConflict.value = false
  if (error || !data?.length) return false

  return data.some(row => timesOverlap(d.jam_mulai, d.jam_selesai, row.jam_mulai, row.jam_selesai))
}

async function saveJadwal() {
  const d = modalJadwal.data

  // --- Validation ---
  if (d.tipe_jadwal === 'Rutin') {
    if (!d.kelas_id || !d.mapel_id)                              { toast.warn('Kelas dan Mapel wajib dipilih.'); return }
    if (timeToMins(d.jam_mulai) >= timeToMins(d.jam_selesai))   { toast.warn('Jam selesai harus lebih besar dari jam mulai.'); return }
    const conflict = await checkConflict()
    if (conflict) {
      toast.error('⚠️ Konflik jadwal! Guru ini sudah mengajar di hari dan jam yang sama.'); return
    }
  } else if (d.tipe_jadwal === 'Event') {
    if (!d.tanggal)           { toast.warn('Tanggal wajib diisi.'); return }
    if (!d.keterangan.trim()) { toast.warn('Keterangan event wajib diisi.'); return }
    if (d.guru_id && d.kelas_id && d.mapel_id) {
      if (timeToMins(d.jam_mulai) >= timeToMins(d.jam_selesai)) { toast.warn('Jam selesai harus lebih besar dari jam mulai.'); return }
    }
  } else if (d.tipe_jadwal === 'Libur') {
    if (!d.tanggal)           { toast.warn('Tanggal wajib diisi.'); return }
    if (!d.keterangan.trim()) { toast.warn('Nama hari libur wajib diisi.'); return }
  }

  isSavingJadwal.value = true
  try {
    const isLiburType  = d.tipe_jadwal === 'Libur'
    const isRutinType  = d.tipe_jadwal === 'Rutin'

    const payload = {
      tipe_jadwal: d.tipe_jadwal,
      hari:        isRutinType   ? Number(d.hari) : null,
      tanggal:     !isRutinType  ? d.tanggal       : null,
      jam_mulai:   !isLiburType  ? d.jam_mulai + ':00' : null,
      jam_selesai: !isLiburType  ? d.jam_selesai + ':00' : null,
      kelas_id:    d.kelas_id || null,
      mapel_id:    d.mapel_id || null,
      guru_id:     d.guru_id  || null,
      keterangan:  d.keterangan || null,
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
    await Promise.all([fetchJadwal(), fetchSpecialDates()])
  } catch (e) { toast.error(`Error: ${e.message}`) }
  finally { isSavingJadwal.value = false }
}

async function deleteJadwal(id) {
  isDeleting.value = true
  const { error } = await supabase.from('jadwal_pelajaran').delete().eq('id', id)
  isDeleting.value = false; deleteConfirm.open = false
  if (error) { toast.error(`Gagal hapus: ${error.message}`); return }
  toast.success('Jadwal berhasil dihapus.')
  if (jadwalList.value.length === 1 && jadwalPage.value > 1) jadwalPage.value--
  await Promise.all([fetchJadwal(), fetchSpecialDates()])
}

// =====================================================
// DELETE CONFIRM
// =====================================================
function confirmDelete(type, id, label) {
  Object.assign(deleteConfirm, { type, id, label, open: true })
}

async function executeDelete() {
  if (deleteConfirm.type === 'kelas')  await deleteKelas(deleteConfirm.id)
  if (deleteConfirm.type === 'kategori') await deleteKategori(deleteConfirm.id)
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
  await Promise.all([fetchKategori(), fetchKelas(), fetchMapel(), fetchGuru()])
  await Promise.all([fetchJadwal(), fetchSpecialDates()])
})
</script>

<template>
  <AdminLayout page-title="Akademik & Penjadwalan" search-placeholder="Cari jadwal...">
    <div class="schedules-content">

      <!-- ── Page Header ──────────────────────────── -->
      <div class="page-header">
        <div>
          <h3 class="page-title">Akademik & Penjadwalan</h3>
          <p class="page-desc">Kelola kelas, mata pelajaran, jadwal mingguan, dan hari libur.</p>
        </div>
        <button class="export-btn" @click="toast.info('Fitur export segera hadir.')">
          <span class="material-symbols-outlined" style="font-size:18px;">download</span>
          Export Laporan
        </button>
      </div>

      <!-- ── Kalender Akademik ─────────────────────── -->
      <section class="card calendar-card">
        <!-- Calendar Header -->
        <div class="cal-header">
          <div class="cal-header-left">
            <div class="cal-icon-wrap">
              <span class="material-symbols-outlined" style="font-size:22px; color:var(--color-primary)">event</span>
            </div>
            <div>
              <h4 class="cal-month-label">{{ calendarMonthLabel }}</h4>
              <p class="cal-sub">Kalender Akademik Sekolah</p>
            </div>
          </div>
          <div class="cal-header-right">
            <!-- Legend -->
            <div class="cal-legend">
              <span class="legend-dot school"></span><span class="legend-text">Hari Sekolah</span>
              <span class="legend-dot libur"></span><span class="legend-text">Libur / Ahad</span>
              <span class="legend-dot event"></span><span class="legend-text">Event Khusus</span>
              <span class="legend-dot saturday"></span><span class="legend-text">Sabtu</span>
            </div>
            <!-- Nav -->
            <div class="cal-nav">
              <button class="cal-nav-btn" @click="prevMonth">
                <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
              </button>
              <button class="cal-nav-btn" @click="nextMonth">
                <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Day Labels -->
        <div class="cal-day-labels">
          <div v-for="d in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']" :key="d"
            :class="['cal-day-label', d === 'Min' ? 'label-red' : '']">
            {{ d }}
          </div>
        </div>

        <!-- Grid -->
        <div class="cal-grid">
          <div
            v-for="(cell, idx) in calendarDays"
            :key="idx"
            :class="['cal-cell', `cell-${cell.type}`, { 'cell-today': cell.isToday, 'cell-selected': selectedDay?.dateStr === cell.dateStr }]"
            @click="selectDay(cell)"
          >
            <span v-if="cell.day" class="cal-day-num">{{ cell.day }}</span>
            <span v-if="cell.label" class="cal-event-label">{{ cell.label }}</span>
            <span v-else-if="cell.isToday && !cell.label" class="cal-today-dot"></span>
          </div>
        </div>

        <!-- Selected Day Info -->
        <div v-if="selectedDay" class="cal-selected-info">
          <div class="selected-info-inner">
            <span class="material-symbols-outlined" style="font-size:16px; color:var(--color-primary)">info</span>
            <div>
              <p class="selected-date-label">{{ formatDateId(selectedDay.dateStr) }}</p>
              <p v-if="selectedDay.special.length === 0" class="selected-date-desc">
                {{ ['school', 'event'].includes(selectedDay.type) ? 'Hari sekolah aktif.' : selectedDay.type === 'saturday' ? 'Hari Sabtu.' : 'Hari Minggu / Libur.' }}
              </p>
              <p v-for="s in selectedDay.special" :key="s.id" class="selected-date-desc">
                <strong>{{ s.tipe_jadwal }}</strong>: {{ s.keterangan }}
              </p>
            </div>
            <button v-if="selectedDay.type !== 'empty'" class="btn-ghost-sm"
              @click="openAddJadwalForDate(selectedDay.dateStr)">
              <span class="material-symbols-outlined" style="font-size:14px">add</span>
              Tambah Entry
            </button>
            <button class="cal-close-btn" @click="selectedDay = null">
              <span class="material-symbols-outlined" style="font-size:16px">close</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ── Bento Grid ────────────────────────────── -->
      <div class="bento-grid">

        <!-- Master Kelas -->
        <section class="card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="material-symbols-outlined card-icon">groups</span>
              <h4 class="card-title">Master Kelas</h4>
            </div>
            <button class="btn-primary-sm" @click="openAddKelas">
              <span class="material-symbols-outlined" style="font-size:15px;">add</span> Tambah
            </button>
          </div>

          <div class="table-wrap">
            <div v-if="isLoadingKelas" class="table-empty">
              <span class="material-symbols-outlined spin" style="font-size:28px; color:var(--color-outline)">progress_activity</span>
            </div>
            <div v-else-if="kelasList.length === 0" class="table-empty">
              <span class="material-symbols-outlined" style="font-size:40px; color:var(--color-outline-variant)">inbox</span>
              <p class="empty-text">Belum ada data kelas</p>
            </div>
            <table v-else class="data-table">
              <thead>
                <tr><th>ID</th><th>Nama Kelas</th>
                  <!-- <th>Jurusan</th> -->
                  <th class="text-right">Aksi</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in kelasList" :key="row.id">
                  <td class="td-id">KLS-{{ String(row.id).padStart(2, '0') }}</td>
                  <td class="text-center">{{ row.nama_kelas }}</td>
                  <!-- <td><span :class="['badge', jurusanBadgeClass(row.jurusan)]">{{ row.jurusan || '—' }}</span></td> -->
                  <td class="text-right">
                    <div class="action-btns">
                      <button class="icon-btn" @click="openEditKelas(row)"><span class="material-symbols-outlined" style="font-size:18px">edit_note</span></button>
                      <button class="icon-btn danger" @click="confirmDelete('kelas', row.id, row.nama_kelas)"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Master Kategori -->
        <section class="card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="material-symbols-outlined card-icon">category</span>
              <h4 class="card-title">Master Kategori</h4>
            </div>
            <button class="btn-primary-sm" @click="openAddKategori">
              <span class="material-symbols-outlined" style="font-size:15px;">add</span> Tambah
            </button>
          </div>

          <div class="table-wrap">
            <div v-if="isLoadingKategori" class="table-empty">
              <span class="material-symbols-outlined spin" style="font-size:28px; color:var(--color-outline)">progress_activity</span>
            </div>
            <div v-else-if="kategoriList.length === 0" class="table-empty">
              <span class="material-symbols-outlined" style="font-size:40px; color:var(--color-outline-variant)">inbox</span>
              <p class="empty-text">Belum ada data kategori</p>
            </div>
            <table v-else class="data-table">
              <thead>
                <tr><th>ID</th><th>Nama Kategori</th><th class="text-right">Aksi</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in kategoriList" :key="row.id">
                  <td class="td-id">KAT-{{ String(row.id).padStart(2, '0') }}</td>
                  <td>
                    <span :class="['badge', kategoriBadgeClass(row.nama_kategori)]">{{ row.nama_kategori }}</span>
                  </td>
                  <td class="text-right">
                    <div class="action-btns">
                      <button class="icon-btn" @click="openEditKategori(row)"><span class="material-symbols-outlined" style="font-size:18px">edit_note</span></button>
                      <button class="icon-btn danger" @click="confirmDelete('kategori', row.id, row.nama_kategori)"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Master Mapel -->
        <section class="card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="material-symbols-outlined card-icon">menu_book</span>
              <h4 class="card-title">Master Mapel</h4>
            </div>
            <button class="btn-primary-sm" @click="openAddMapel">
              <span class="material-symbols-outlined" style="font-size:15px;">add</span> Tambah
            </button>
          </div>

          <div class="table-wrap">
            <div v-if="isLoadingMapel" class="table-empty">
              <span class="material-symbols-outlined spin" style="font-size:28px; color:var(--color-outline)">progress_activity</span>
            </div>
            <div v-else-if="mapelList.length === 0" class="table-empty">
              <span class="material-symbols-outlined" style="font-size:40px; color:var(--color-outline-variant)">inbox</span>
              <p class="empty-text">Belum ada data mapel</p>
            </div>
            <table v-else class="data-table">
              <thead>
                <tr><th>ID</th><th>Mata Pelajaran</th><th>Kategori</th><th class="text-right">Aksi</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in mapelList" :key="row.id">
                  <td class="td-id">MPL-{{ String(row.id).padStart(3, '0') }}</td>
                  <td>{{ row.nama_pelajaran }}</td>
                  <td>
                    <span :class="['badge', kategoriBadgeClass(row.master_kategori?.nama_kategori)]">
                      {{ row.master_kategori?.nama_kategori || '—' }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="action-btns">
                      <button class="icon-btn" @click="openEditMapel(row)"><span class="material-symbols-outlined" style="font-size:18px">edit_note</span></button>
                      <button class="icon-btn danger" @click="confirmDelete('mapel', row.id, row.nama_pelajaran)"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Jadwal Pelajaran (full width) -->
        <section class="card card-full">
          <div class="card-head">
            <div class="card-head-left">
              <div class="cal-icon-wrap" style="width:38px;height:38px">
                <span class="material-symbols-outlined" style="font-size:20px; color:var(--color-primary)">calendar_month</span>
              </div>
              <div>
                <h4 class="card-title">Jadwal Pelajaran</h4>
                <p class="card-subtitle">Jadwal rutin, event, dan hari libur.</p>
              </div>
            </div>
            <div class="jadwal-head-right">
              <span class="badge-count">{{ jadwalTotalCount }} Entri</span>
              <button class="btn-primary-md" @click="openAddJadwal">
                <span class="material-symbols-outlined" style="font-size:17px">add_task</span> Tambah Jadwal
              </button>
            </div>
          </div>

          <div class="table-wrap">
            <div v-if="isLoadingJadwal" class="table-empty" style="padding:48px 0">
              <span class="material-symbols-outlined spin" style="font-size:36px; color:var(--color-outline)">progress_activity</span>
            </div>
            <div v-else-if="jadwalList.length === 0" class="table-empty" style="padding:48px 0">
              <span class="material-symbols-outlined" style="font-size:48px; color:var(--color-outline-variant)">event_busy</span>
              <p class="empty-text">Belum ada jadwal. Klik "Tambah Jadwal" untuk memulai.</p>
            </div>
            <table v-else class="data-table jadwal-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipe</th>
                  <th>Hari / Tanggal</th>
                  <th>Waktu</th>
                  <th>Kelas</th>
                  <th>Mapel</th>
                  <th>Guru</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in jadwalList" :key="row.id">
                  <td class="td-id">SCH-{{ String(row.id).padStart(3, '0') }}</td>
                  <td>
                    <span :class="['badge', tipeJadwalBadgeClass(row.tipe_jadwal)]">{{ row.tipe_jadwal ?? 'Rutin' }}</span>
                  </td>
                  <td>
                    <div v-if="row.tipe_jadwal === 'Rutin' || !row.tanggal" class="hari-label">
                      {{ hariLabel(row.hari) }}
                    </div>
                    <div v-else class="tanggal-cell">
                      <span class="material-symbols-outlined" style="font-size:13px; color:var(--color-on-surface-variant)">calendar_today</span>
                      {{ formatDateId(row.tanggal) }}
                    </div>
                    <p v-if="row.keterangan" class="keterangan-text">{{ row.keterangan }}</p>
                  </td>
                  <td>
                    <div v-if="row.jam_mulai" class="waktu-cell">
                      <span class="material-symbols-outlined" style="font-size:13px; color:var(--color-on-surface-variant)">schedule</span>
                      {{ row.jam_mulai?.slice(0,5) }} – {{ row.jam_selesai?.slice(0,5) }}
                    </div>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td>{{ row.master_kelas?.nama_kelas ?? '—' }}</td>
                  <td class="td-mapel">{{ row.master_mapel?.nama_pelajaran ?? '—' }}</td>
                  <td>
                    <div v-if="row.profiles?.nama_lengkap" class="guru-cell">
                      <div class="guru-avatar">{{ row.profiles.nama_lengkap[0] }}</div>
                      <span class="guru-name">{{ row.profiles.nama_lengkap }}</span>
                    </div>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td class="text-right">
                    <div class="action-btns">
                      <button class="icon-btn" @click="openEditJadwal(row)"><span class="material-symbols-outlined" style="font-size:18px">edit_note</span></button>
                      <button class="icon-btn danger" @click="confirmDelete('jadwal', row.id, `SCH-${String(row.id).padStart(3,'0')}`)"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="jadwalTotalCount > 0" class="pagination">
            <p class="pagination-info">Menampilkan {{ jadwalList.length }} dari {{ jadwalTotalCount }} entri</p>
            <div class="pagination-btns">
              <button class="page-btn icon-only" :disabled="jadwalPage === 1" @click="goToPage(jadwalPage - 1)">
                <span class="material-symbols-outlined" style="font-size:18px">chevron_left</span>
              </button>
              <button
                v-for="p in jadwalTotalPages" :key="p"
                :class="['page-btn', { active: p === jadwalPage }]"
                @click="goToPage(p)">{{ p }}</button>
              <button class="page-btn icon-only" :disabled="jadwalPage === jadwalTotalPages" @click="goToPage(jadwalPage + 1)">
                <span class="material-symbols-outlined" style="font-size:18px">chevron_right</span>
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
              <div class="modal-icon"><span class="material-symbols-outlined" style="font-size:20px">groups</span></div>
              <h5 class="modal-title">{{ modalKelas.mode === 'add' ? 'Tambah Kelas' : 'Edit Kelas' }}</h5>
            </div>
            <button class="modal-close" @click="modalKelas.open = false"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Kelas <span class="required">*</span></label>
              <input v-model="modalKelas.data.nama_kelas" class="form-input" placeholder="Contoh: X MIPA 1" type="text" @keyup.enter="saveKelas" />
            </div>
            <!-- <div class="form-group">
              <label class="form-label">Jurusan</label>
              <select v-model="modalKelas.data.jurusan" class="form-input">
                <option value="">— Pilih Jurusan —</option>
                <option value="MIPA">MIPA</option>
                <option value="IPS">IPS</option>
                <option value="Bahasa">Bahasa</option>
                <option value="Teknik">Teknik</option>
              </select>
            </div> -->
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="modalKelas.open = false">Batal</button>
            <button class="btn-primary-md" :disabled="isSavingKelas" @click="saveKelas">
              <span v-if="isSavingKelas" class="material-symbols-outlined spin" style="font-size:14px">progress_activity</span>
              {{ isSavingKelas ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ================================================
         MODAL: Tambah / Edit Kategori
    ================================================ -->
    <Teleport to="body">
      <div v-if="modalKategori.open" class="modal-overlay" @click.self="modalKategori.open = false">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon"><span class="material-symbols-outlined" style="font-size:20px">category</span></div>
              <h5 class="modal-title">{{ modalKategori.mode === 'add' ? 'Tambah Kategori' : 'Edit Kategori' }}</h5>
            </div>
            <button class="modal-close" @click="modalKategori.open = false"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Kategori <span class="required">*</span></label>
              <input v-model="modalKategori.data.nama_kategori" class="form-input" placeholder="Contoh: STEM, Humanities" type="text" @keyup.enter="saveKategori" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="modalKategori.open = false">Batal</button>
            <button class="btn-primary-md" :disabled="isSavingKategori" @click="saveKategori">
              <span v-if="isSavingKategori" class="material-symbols-outlined spin" style="font-size:14px">progress_activity</span>
              {{ isSavingKategori ? 'Menyimpan...' : 'Simpan' }}
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
              <div class="modal-icon"><span class="material-symbols-outlined" style="font-size:20px">menu_book</span></div>
              <h5 class="modal-title">{{ modalMapel.mode === 'add' ? 'Tambah Mapel' : 'Edit Mapel' }}</h5>
            </div>
            <button class="modal-close" @click="modalMapel.open = false"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Pelajaran <span class="required">*</span></label>
              <input v-model="modalMapel.data.nama_pelajaran" class="form-input" placeholder="Contoh: Matematika Wajib" type="text" @keyup.enter="saveMapel" />
            </div>
            <div class="form-group">
              <label class="form-label">Kategori</label>
              <select v-model.number="modalMapel.data.kategori_id" class="form-input">
                <option :value="null">— Pilih Kategori —</option>
                <option v-for="k in kategoriList" :key="k.id" :value="k.id">{{ k.nama_kategori }}</option>
              </select>
              <p v-if="kategoriList.length === 0" class="form-hint">Tabel master_kategori belum ada. Jalankan SQL migration terlebih dahulu.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="modalMapel.open = false">Batal</button>
            <button class="btn-primary-md" :disabled="isSavingMapel" @click="saveMapel">
              <span v-if="isSavingMapel" class="material-symbols-outlined spin" style="font-size:14px">progress_activity</span>
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
              <div class="modal-icon"><span class="material-symbols-outlined" style="font-size:20px">calendar_month</span></div>
              <h5 class="modal-title">{{ modalJadwal.mode === 'add' ? 'Tambah Jadwal' : 'Edit Jadwal' }}</h5>
            </div>
            <button class="modal-close" @click="modalJadwal.open = false"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>
          </div>
          <div class="modal-body">

            <!-- Tipe Jadwal Selector -->
            <div class="form-group">
              <label class="form-label">Tipe Jadwal <span class="required">*</span></label>
              <div class="tipe-selector">
                <button
                  v-for="t in ['Rutin', 'Event', 'Libur']" :key="t"
                  :class="['tipe-btn', { active: modalJadwal.data.tipe_jadwal === t }, `tipe-${t.toLowerCase()}`]"
                  @click="modalJadwal.data.tipe_jadwal = t">
                  <span class="material-symbols-outlined" style="font-size:16px">{{ t === 'Rutin' ? 'repeat' : t === 'Event' ? 'celebration' : 'beach_access' }}</span>
                  {{ t }}
                </button>
              </div>
            </div>

            <!-- Rutin: hari picker -->
            <div v-if="isRutin" class="form-group">
              <label class="form-label">Hari <span class="required">*</span></label>
              <select v-model.number="modalJadwal.data.hari" class="form-input">
                <option :value="1">Senin</option>
                <option :value="2">Selasa</option>
                <option :value="3">Rabu</option>
                <option :value="4">Kamis</option>
                <option :value="5">Jumat</option>
              </select>
            </div>

            <!-- Event / Libur: tanggal picker (min = today) -->
            <div v-if="!isRutin" class="form-group">
              <label class="form-label">Tanggal <span class="required">*</span></label>
              <input v-model="modalJadwal.data.tanggal" class="form-input" type="date" :min="todayStr" />
            </div>

            <!-- Event / Libur: keterangan -->
            <div v-if="!isRutin" class="form-group">
              <label class="form-label">Keterangan / Nama Acara <span class="required">*</span></label>
              <input v-model="modalJadwal.data.keterangan" class="form-input" :placeholder="isLibur ? 'Contoh: Hari Kemerdekaan RI' : 'Contoh: Penilaian Akhir Semester'" type="text" />
            </div>

            <!-- Jam (untuk Rutin & Event, optional untuk Libur) -->
            <div v-if="!isLibur" class="form-row-2">
              <div class="form-group">
                <label class="form-label">Jam Mulai <span class="required">*</span></label>
                <input v-model="modalJadwal.data.jam_mulai" class="form-input" type="time" />
              </div>
              <div class="form-group">
                <label class="form-label">Jam Selesai <span class="required">*</span></label>
                <input v-model="modalJadwal.data.jam_selesai" class="form-input" type="time" />
              </div>
            </div>

            <!-- Kelas & Mapel (wajib untuk Rutin, opsional Event) -->
            <div v-if="isRutin || isEvent" class="form-row-2">
              <div class="form-group">
                <label class="form-label">Kelas <span v-if="isRutin" class="required">*</span><span v-else class="optional">(opsional)</span></label>
                <select v-model.number="modalJadwal.data.kelas_id" class="form-input">
                  <option :value="null">— Pilih Kelas —</option>
                  <option v-for="k in kelasList" :key="k.id" :value="k.id">{{ k.nama_kelas }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Mata Pelajaran <span v-if="isRutin" class="required">*</span><span v-else class="optional">(opsional)</span></label>
                <select v-model.number="modalJadwal.data.mapel_id" class="form-input">
                  <option :value="null">— Pilih Mapel —</option>
                  <option v-for="m in mapelList" :key="m.id" :value="m.id">{{ m.nama_pelajaran }}</option>
                </select>
              </div>
            </div>

            <!-- Guru (opsional kecuali tidak ada) -->
            <div v-if="!isLibur" class="form-group">
              <label class="form-label">Guru Pengampu <span class="optional">(opsional)</span></label>
              <select v-model="modalJadwal.data.guru_id" class="form-input">
                <option :value="null">— Pilih Guru —</option>
                <option v-for="g in guruList" :key="g.id" :value="g.id">{{ g.nama_lengkap }}</option>
              </select>
            </div>

            <!-- Conflict warning -->
            <div v-if="isRutin && modalJadwal.data.guru_id" class="conflict-hint">
              <span class="material-symbols-outlined" style="font-size:14px">info</span>
              Sistem akan memeriksa konflik jadwal guru secara otomatis saat menyimpan.
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="modalJadwal.open = false">Batal</button>
            <button class="btn-primary-md" :disabled="isSavingJadwal || isCheckingConflict" @click="saveJadwal">
              <span v-if="isSavingJadwal || isCheckingConflict" class="material-symbols-outlined spin" style="font-size:14px">progress_activity</span>
              {{ isCheckingConflict ? 'Memeriksa...' : isSavingJadwal ? 'Menyimpan...' : 'Simpan Jadwal' }}
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
              <div class="modal-icon danger"><span class="material-symbols-outlined" style="font-size:20px">warning</span></div>
              <h5 class="modal-title">Konfirmasi Hapus</h5>
            </div>
            <button class="modal-close" @click="deleteConfirm.open = false"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>
          </div>
          <div class="modal-body">
            <p class="delete-msg">Apakah Anda yakin ingin menghapus <strong>{{ deleteConfirm.label }}</strong>? Tindakan ini tidak bisa dibatalkan.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="deleteConfirm.open = false">Batal</button>
            <button class="btn-danger" :disabled="isDeleting" @click="executeDelete">
              <span v-if="isDeleting" class="material-symbols-outlined spin" style="font-size:14px">progress_activity</span>
              {{ isDeleting ? 'Menghapus...' : 'Hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </AdminLayout>
</template>

<style scoped>
/* ─── Layout ────────────────────────────────────────── */
.schedules-content { display: flex; flex-direction: column; gap: 28px; }

.page-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.page-title {
  font-size: 30px; font-weight: 800;
  color: var(--color-on-surface); letter-spacing: -0.5px; margin-bottom: 4px;
}
.page-desc { font-size: 14px; color: var(--color-on-surface-variant); }

.export-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 18px; border: 1px solid rgba(194,199,209,.4);
  background-color: var(--color-surface-container-lowest);
  border-radius: 10px; font-size: 13px; font-weight: 600;
  color: var(--color-on-surface); cursor: pointer; font-family: var(--font-body);
  transition: background-color .2s;
}
.export-btn:hover { background-color: var(--color-surface-container); }

/* ─── Calendar Card ─────────────────────────────────── */
.calendar-card { gap: 20px; }

.cal-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.cal-header-left { display: flex; align-items: center; gap: 14px; }
.cal-icon-wrap {
  width: 44px; height: 44px; border-radius: 12px;
  background-color: rgba(0,53,95,.07);
  display: flex; align-items: center; justify-content: center;
}
.cal-month-label { font-family: var(--font-headline); font-size: 22px; font-weight: 800; color: var(--color-on-surface); }
.cal-sub { font-size: 12px; color: var(--color-on-surface-variant); margin-top: 2px; }

.cal-header-right { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

.cal-legend {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.legend-dot {
  width: 10px; height: 10px; border-radius: 50%;
  border: 1.5px solid;
}
.legend-dot.school   { background: #dcfce7; border-color: #bbf7d0; }
.legend-dot.libur    { background: #fee2e2; border-color: #fca5a5; }
.legend-dot.event    { background: #fef3c7; border-color: #fde68a; }
.legend-dot.saturday { background: var(--color-surface-container-high); border-color: var(--color-outline-variant); }
.legend-text { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--color-on-surface-variant); }

.cal-nav { display: flex; gap: 6px; }
.cal-nav-btn {
  width: 34px; height: 34px; border-radius: 9px;
  border: 1px solid rgba(194,199,209,.35); background: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--color-on-surface-variant);
  transition: background-color .15s;
}
.cal-nav-btn:hover { background-color: var(--color-surface-container); }

.cal-day-labels {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
}
.cal-day-label {
  text-align: center; font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .8px;
  color: var(--color-on-surface-variant); padding-bottom: 4px;
}
.label-red { color: #ef4444; }

.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
}

/* Calendar Cells */
.cal-cell {
  aspect-ratio: 1; border-radius: 12px; border: 1.5px solid transparent;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s; position: relative; overflow: hidden;
  gap: 2px;
}

.cell-empty {
  background: transparent; border-color: transparent; cursor: default;
}
.cell-school {
  background: rgba(220,252,231,.5); border-color: rgba(187,247,208,.6);
}
.cell-school:hover { background: #dcfce7; }

.cell-saturday {
  background: rgba(236,238,240,.3); border-color: rgba(194,199,209,.2);
}
.cell-saturday:hover { background: var(--color-surface-container-high); }

.cell-sunday {
  background: #fee2e2; border-color: #fca5a5;
}
.cell-sunday:hover { background: #fecaca; }

.cell-libur {
  background: #fee2e2; border-color: #f87171;
  box-shadow: inset 0 0 0 1px rgba(248,113,113,.3);
}
.cell-libur:hover { background: #fecaca; }

.cell-event {
  background: #fef3c7; border-color: #fde68a;
}
.cell-event:hover { background: #fde68a; }

.cell-today {
  background: var(--color-primary) !important;
  border-color: var(--color-primary-container) !important;
  box-shadow: 0 4px 16px -4px rgba(0,53,95,.35) !important;
  transform: scale(1.08);
  z-index: 1;
}
.cell-today .cal-day-num { color: #fff !important; }

.cell-selected:not(.cell-today) {
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 2px rgba(0,53,95,.15);
}

.cal-day-num {
  font-size: 13px; font-weight: 700;
  color: inherit; line-height: 1;
}
.cell-school .cal-day-num  { color: #15803d; }
.cell-saturday .cal-day-num { color: var(--color-on-surface-variant); }
.cell-sunday .cal-day-num  { color: #dc2626; }
.cell-libur .cal-day-num   { color: #b91c1c; }
.cell-event .cal-day-num   { color: #92400e; }

.cal-event-label {
  font-size: 8px; font-weight: 800; text-align: center; line-height: 1.2;
  text-transform: uppercase; letter-spacing: .3px;
  color: #b91c1c; padding: 0 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%;
}

.cal-today-dot {
  width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,.8);
}

/* Selected Day Info */
.cal-selected-info {
  margin-top: 4px; border-top: 1px solid rgba(194,199,209,.1); padding-top: 16px;
}
.selected-info-inner {
  display: flex; align-items: flex-start; gap: 10px;
  background-color: var(--color-surface-container-low);
  border-radius: 10px; padding: 12px 14px;
}
.selected-date-label { font-size: 13px; font-weight: 700; color: var(--color-on-surface); }
.selected-date-desc  { font-size: 12px; color: var(--color-on-surface-variant); margin-top: 2px; }
.selected-info-inner > div { flex: 1; }

.btn-ghost-sm {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px; border: 1px solid rgba(194,199,209,.4);
  background: var(--color-surface-container-lowest);
  border-radius: 8px; font-size: 11px; font-weight: 700;
  cursor: pointer; color: var(--color-primary); font-family: var(--font-body);
  white-space: nowrap; transition: background-color .15s;
}
.btn-ghost-sm:hover { background-color: var(--color-surface-container); }

.cal-close-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 7px; cursor: pointer;
  color: var(--color-on-surface-variant); flex-shrink: 0;
  transition: background-color .15s;
}
.cal-close-btn:hover { background-color: var(--color-surface-container); }

/* ─── Bento Grid ────────────────────────────────────── */
.bento-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }

/* ─── Cards ─────────────────────────────────────────── */
.card {
  background-color: var(--color-surface-container-lowest);
  border-radius: 16px; padding: 24px;
  border: 1px solid rgba(194,199,209,.12);
  box-shadow: 0 4px 20px -4px rgba(0,0,0,.05);
  display: flex; flex-direction: column; gap: 18px;
}
.card-full { grid-column: 1 / -1; padding: 28px 32px; gap: 20px; }

.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.card-head-left { display: flex; align-items: center; gap: 10px; }
.card-icon { font-size: 22px; color: var(--color-primary); }
.card-title { font-family: var(--font-headline); font-size: 17px; font-weight: 700; color: var(--color-primary); }
.card-subtitle { font-size: 12px; color: var(--color-on-surface-variant); margin-top: 2px; }

.jadwal-head-right { display: flex; align-items: center; gap: 12px; }
.badge-count {
  padding: 4px 12px; background-color: var(--color-primary-fixed);
  color: var(--color-on-primary-fixed-variant); font-size: 11px; font-weight: 800;
  border-radius: 9999px; letter-spacing: .3px;
}

/* ─── Tables ─────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead tr { border-bottom: 1px solid var(--color-surface-container); }
.data-table th {
  padding-bottom: 11px; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
  color: var(--color-on-surface-variant); white-space: nowrap;
}
.data-table tbody tr {
  border-bottom: 1px solid rgba(194,199,209,.08);
  transition: background-color .15s;
}
.data-table tbody tr:last-child { border-bottom: none; }
.data-table tbody tr:hover { background-color: var(--color-surface-container-low); }
.data-table td {
  padding: 13px 0; vertical-align: middle; color: var(--color-on-surface);
}
.data-table td:not(:first-child) { padding-left: 10px; }

.jadwal-table th, .jadwal-table td { padding-right: 12px; }
.jadwal-table th:last-child, .jadwal-table td:last-child { padding-right: 0; }

.td-id { font-weight: 700; color: var(--color-primary); font-size: 11px; white-space: nowrap; }
.td-mapel { font-weight: 600; color: var(--color-primary); }
.text-right { text-align: right; }
.text-muted { color: var(--color-on-surface-variant); font-size: 12px; }

.table-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 32px 0;
}
.empty-text { font-size: 13px; color: var(--color-on-surface-variant); }

/* ─── Cell helpers ───────────────────────────────────── */
.hari-label { font-weight: 600; }
.tanggal-cell { display: flex; align-items: center; gap: 5px; font-size: 13px; white-space: nowrap; }
.waktu-cell  { display: flex; align-items: center; gap: 5px; color: var(--color-on-surface-variant); font-size: 13px; white-space: nowrap; }
.keterangan-text { font-size: 11px; color: var(--color-on-surface-variant); margin-top: 2px; }

.guru-cell { display: flex; align-items: center; gap: 8px; }
.guru-avatar {
  width: 26px; height: 26px; border-radius: 7px;
  background-color: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; flex-shrink: 0;
}
.guru-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

/* ─── Badges ─────────────────────────────────────────── */
.badge {
  display: inline-block; padding: 2px 10px;
  border-radius: 9999px; font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .5px;
}
.badge-primary   { background: var(--color-primary-fixed);   color: var(--color-on-primary-fixed-variant); }
.badge-secondary { background: var(--color-secondary-fixed); color: var(--color-on-secondary-fixed-variant); }
.badge-tertiary  { background: var(--color-tertiary-fixed);  color: var(--color-on-tertiary-fixed-variant); }
.badge-surface   { background: var(--color-surface-container-high); color: var(--color-on-surface-variant); }
.badge-error     { background: var(--color-error-container); color: var(--color-on-error-container); }

/* ─── Action buttons ─────────────────────────────────── */
.action-btns { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.icon-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 8px;
  color: var(--color-on-surface-variant); cursor: pointer; transition: all .15s;
}
.icon-btn:hover { background-color: var(--color-surface-container); color: var(--color-primary); }
.icon-btn.danger:hover { background-color: var(--color-error-container); color: var(--color-error); }

/* ─── Button variants ────────────────────────────────── */
.btn-primary-sm {
  display: inline-flex; align-items: center; gap: 5px;
  background-color: var(--color-primary); color: white; border: none;
  padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: opacity .15s, transform .1s;
  font-family: var(--font-body); white-space: nowrap;
}
.btn-primary-sm:hover { opacity: .9; }
.btn-primary-sm:active { transform: scale(.95); }

.btn-primary-md {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #00355f 0%, #0f4c81 100%);
  color: white; border: none; padding: 10px 20px; border-radius: 10px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,53,95,.2); font-family: var(--font-body);
  white-space: nowrap; transition: opacity .15s, transform .1s;
}
.btn-primary-md:hover { opacity: .9; }
.btn-primary-md:active:not(:disabled) { transform: scale(.96); }
.btn-primary-md:disabled { opacity: .6; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  background: none; border: 1px solid rgba(194,199,209,.4);
  color: var(--color-on-surface-variant); padding: 10px 20px; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: var(--font-body); transition: background-color .15s;
}
.btn-ghost:hover { background-color: var(--color-surface-container-low); }

.btn-danger {
  display: inline-flex; align-items: center; gap: 8px;
  background-color: var(--color-error); color: white; border: none;
  padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: opacity .15s; font-family: var(--font-body);
}
.btn-danger:hover { opacity: .9; }
.btn-danger:disabled { opacity: .6; cursor: not-allowed; }

/* ─── Pagination ─────────────────────────────────────── */
.pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 14px; border-top: 1px solid rgba(194,199,209,.1); flex-wrap: wrap; gap: 10px;
}
.pagination-info { font-size: 12px; color: var(--color-on-surface-variant); font-weight: 500; }
.pagination-btns { display: flex; align-items: center; gap: 4px; }
.page-btn {
  min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(194,199,209,.3); background: none; border-radius: 8px;
  font-size: 12px; font-weight: 700; color: var(--color-on-surface); cursor: pointer;
  transition: all .15s; font-family: var(--font-body); padding: 0 4px;
}
.page-btn.icon-only { width: 32px; padding: 0; }
.page-btn:hover:not(:disabled):not(.active) { background-color: var(--color-surface-container-low); }
.page-btn.active { background-color: var(--color-primary); color: white; border-color: var(--color-primary); }
.page-btn:disabled { opacity: .35; cursor: not-allowed; }

/* ─── Modal ──────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background-color: rgba(25,28,30,.5); backdrop-filter: blur(4px) saturate(1.2);
  -webkit-backdrop-filter: blur(4px) saturate(1.2);
  display: flex; align-items: center; justify-content: center;
  z-index: 999; padding: 24px; animation: fadeIn .15s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal {
  background-color: var(--color-surface-container-lowest);
  border-radius: 20px; width: 100%; max-width: 440px;
  box-shadow: 0 24px 64px -8px rgba(0,0,0,.18);
  display: flex; flex-direction: column;
  animation: slideUp .2s ease; overflow: hidden;
}
.modal-lg { max-width: 560px; }
.modal-sm { max-width: 380px; }
@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px 14px; border-bottom: 1px solid rgba(194,199,209,.12);
}
.modal-header-left { display: flex; align-items: center; gap: 12px; }
.modal-icon {
  width: 34px; height: 34px; border-radius: 9px;
  background-color: rgba(0,53,95,.08); color: var(--color-primary);
  display: flex; align-items: center; justify-content: center;
}
.modal-icon.danger { background-color: rgba(186,26,26,.08); color: var(--color-error); }
.modal-title { font-family: var(--font-headline); font-size: 15px; font-weight: 800; color: var(--color-on-surface); }
.modal-close {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 8px;
  color: var(--color-on-surface-variant); cursor: pointer; transition: background-color .15s;
}
.modal-close:hover { background-color: var(--color-surface-container); }
.modal-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; max-height: 70vh; overflow-y: auto; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px; padding: 14px 22px 18px;
  border-top: 1px solid rgba(194,199,209,.12);
}

/* ─── Form ───────────────────────────────────────────── */
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--color-on-surface-variant); }
.required { color: var(--color-error); }
.optional { color: var(--color-outline); font-text-transform: none !important; font-size: 10px; text-transform: none; }
.form-hint { font-size: 11px; color: var(--color-on-surface-variant); font-style: italic; margin-top: 2px; }

.form-input {
  width: 100%; background-color: var(--color-surface-container-low);
  border: 1px solid transparent; border-radius: 10px; padding: 10px 14px;
  color: var(--color-on-surface); font-family: var(--font-body); font-size: 14px;
  outline: none; transition: border-color .2s, box-shadow .2s;
  -webkit-appearance: none; appearance: none;
}
.form-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(0,53,95,.08); }
select.form-input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2342474f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; cursor: pointer;
}

/* Tipe Selector */
.tipe-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.tipe-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 10px; border: 1.5px solid rgba(194,199,209,.35);
  background: var(--color-surface-container-low); font-size: 13px; font-weight: 700;
  cursor: pointer; color: var(--color-on-surface-variant); transition: all .15s;
  font-family: var(--font-body);
}
.tipe-btn:hover { border-color: var(--color-outline); }
.tipe-btn.active.tipe-rutin  { background: var(--color-secondary-fixed); color: var(--color-on-secondary-fixed); border-color: var(--color-secondary); }
.tipe-btn.active.tipe-event  { background: var(--color-tertiary-fixed);  color: var(--color-on-tertiary-fixed);  border-color: var(--color-tertiary); }
.tipe-btn.active.tipe-libur  { background: var(--color-error-container); color: var(--color-on-error-container); border-color: var(--color-error); }

.conflict-hint {
  display: flex; align-items: flex-start; gap: 6px; padding: 10px 12px;
  background-color: var(--color-primary-fixed); border-radius: 8px;
  font-size: 12px; color: var(--color-on-primary-fixed-variant);
}

.delete-msg { font-size: 14px; color: var(--color-on-surface-variant); line-height: 1.6; }
.delete-msg strong { color: var(--color-on-surface); }

/* ─── Utility ────────────────────────────────────────── */
.spin { animation: spin .8s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ─── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .bento-grid { grid-template-columns: 1fr; }
  .card-full   { grid-column: 1; }
  .cal-header  { flex-direction: column; align-items: flex-start; }
  .cal-header-right { width: 100%; justify-content: space-between; }
}
@media (max-width: 640px) {
  .page-header  { flex-direction: column; align-items: flex-start; }
  .cal-legend   { gap: 6px; }
  .form-row-2   { grid-template-columns: 1fr; }
  .tipe-selector { flex-direction: column; }
  .jadwal-head-right { flex-wrap: wrap; }
  .guru-name    { max-width: 100px; }
}
</style>
