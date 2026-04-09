<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue3-toastify'
import { supabase } from '../supabase'
import AdminLayout from '../components/layout/AdminLayout.vue'
import DataTable from '../components/ui/DataTable.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'

const route = useRoute()
const activeTab = ref(route.meta.defaultTab || 'students')

// --- State ---
const students = ref([])
const teachers = ref([])
const isLoading = ref(false)
const currentPage = ref(1)
const PAGE_SIZE = 10

const selectedClass = ref('')
const selectedStatus = ref('')

// Stats
const stats = ref({
  activeDevices: 0,
  recentUnbinds: 0,
  pendingApprovals: 0,
})

// Modal Add User
const showAddUserModal = ref(false)
const newUser = ref({
  id: null,
  nama_lengkap: '',
  nomor_induk: '',
  role: 'siswa',
  kelas_id: null
})

const fileInput = ref(null)

const classes = ref([])

// --- Table Config ---
const columns = [
  { key: 'nisn', label: 'NISN / NIP' },
  { key: 'name', label: 'Name' },
  { key: 'classMajor', label: 'Class / Major' },
  { key: 'status', label: 'Account Status' },
  { key: 'actions', label: 'Actions', align: 'right' },
]

// --- Computed ---
const activeRows = computed(() => activeTab.value === 'students' ? students.value : teachers.value)
const totalItems = computed(() => activeTab.value === 'students' ? studentCount.value : teacherCount.value)
const totalPages = computed(() => Math.ceil(totalItems.value / PAGE_SIZE))

const studentCount = ref(0)
const teacherCount = ref(0)

// --- Helpers ---
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const INITIALS_COLORS = [
  { bg: 'var(--color-primary-fixed)', text: 'var(--color-primary)' },
  { bg: 'var(--color-tertiary-fixed)', text: 'var(--color-tertiary)' },
  { bg: 'var(--color-secondary-container)', text: 'var(--color-on-secondary-container)' },
  { bg: 'var(--color-on-primary-fixed-variant)', text: 'white' },
]

function colorFor(index) {
  return INITIALS_COLORS[index % INITIALS_COLORS.length]
}

function mapProfile(profile, index) {
  const color = colorFor(index)
  return {
    id: profile.id,
    nisn: profile.nomor_induk || '-',
    name: profile.nama_lengkap || '-',
    kelas_id: profile.kelas_id,
    initials: getInitials(profile.nama_lengkap),
    initialsColor: color.bg,
    initialsText: color.text,
    classMajor: profile.master_kelas ? profile.master_kelas.nama_kelas : (profile.bidang_studi || '-'),
    status: !profile.device_id ? 'pending' : (profile.is_on_leave ? 'suspended' : 'active'),
    deviceId: profile.device_id,
  }
}

// --- Data Fetching ---
async function fetchStudents() {
  isLoading.value = true
  const from = (currentPage.value - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Total count
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'siswa')
  studentCount.value = count || 0

  // Paginated data
  const { data, error } = await supabase
    .from('profiles')
    .select('*, master_kelas(nama_kelas)')
    .eq('role', 'siswa')
    .order('nama_lengkap', { ascending: true })
    .range(from, to)

  if (error) {
    toast.error('Gagal memuat data siswa.')
    console.error(error)
  } else {
    students.value = (data || []).map(mapProfile)
  }
  isLoading.value = false
}

async function fetchTeachers() {
  isLoading.value = true
  const from = (currentPage.value - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'guru')
  teacherCount.value = count || 0

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'guru')
    .order('nama_lengkap', { ascending: true })
    .range(from, to)

  if (error) {
    toast.error('Gagal memuat data guru.')
    console.error(error)
  } else {
    teachers.value = (data || []).map(mapProfile)
  }
  isLoading.value = false
}

async function fetchStats() {
  const { count: activeDevices } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('device_id', 'is', null)

  const { count: pendingApprovals } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'siswa')
    .is('device_id', null)

  const { count: recentUnbinds } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .ilike('title', '%Device Unbind%')

  stats.value = {
    activeDevices: activeDevices || 0,
    recentUnbinds: recentUnbinds || 0,
    pendingApprovals: pendingApprovals || 0,
  }
}

// --- Actions ---
async function unbindDevice(row) {
  const confirm = window.confirm(`Unbind device dari "${row.name}"? Aksi ini tidak bisa dibatalkan.`)
  if (!confirm) return

  const { error } = await supabase
    .from('profiles')
    .update({ device_id: null })
    .eq('id', row.id)

  if (error) {
    toast.error(`Gagal unbind device: ${error.message}`)
  } else {
    toast.success(`Device "${row.name}" berhasil di-unbind.`)
    
    // Log the action explicitly
    await supabase.from('activity_logs').insert([{
      title: 'Device Unbind',
      description: `Unbind ${row.name} (${row.nisn}) by administrator.`,
      icon: 'phonelink_erase',
      bg_color: 'var(--color-error)',
      text_color: 'white'
    }])

    // Update local state
    const list = activeTab.value === 'students' ? students : teachers
    const target = list.value.find(u => u.id === row.id)
    if (target) target.deviceId = null
    stats.value.recentUnbinds++
  }
}

async function submitNewUser() {
  if (!newUser.value.nama_lengkap) {
    toast.warn('Nama lengkap wajib diisi!')
    return
  }

  isLoading.value = true
  let error;
  
  if (newUser.value.id) {
    const { id, ...updates } = newUser.value
    const res = await supabase.from('profiles').update(updates).eq('id', id)
    error = res.error
  } else {
    const { id, ...inserts } = newUser.value
    const res = await supabase.from('profiles').insert([inserts])
    error = res.error
  }

  if (error) {
    toast.error('Gagal menyimpan user: ' + error.message)
  } else {
    toast.success('Pengguna berhasil disimpan!')
    showAddUserModal.value = false
    newUser.value = { id: null, nama_lengkap: '', nomor_induk: '', role: 'siswa', kelas_id: null }
    if (activeTab.value === 'students') await fetchStudents()
    else await fetchTeachers()
  }
  isLoading.value = false
}

function openEditModal(row) {
  newUser.value = {
    id: row.id,
    nama_lengkap: row.name,
    nomor_induk: row.nisn,
    role: activeTab.value === 'students' ? 'siswa' : 'guru',
    kelas_id: row.kelas_id || null
  }
  showAddUserModal.value = true
}

function triggerImport() {
  if (fileInput.value) fileInput.value.click()
}

async function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const text = e.target.result
    const rows = text.split('\n').map(r => r.trim()).filter(r => r)
    if (rows.length < 2) return toast.error('Format CSV tidak valid atau kosong.')
    
    const dataToInsert = []
    for(let i=1; i<rows.length; i++) {
        const cols = rows[i].split(',').map(c => c.replace(/^"|"$/g, '').trim())
        if (cols.length < 2) continue
        dataToInsert.push({
            nama_lengkap: cols[0],
            nomor_induk: cols[1],
            role: cols[2] || 'siswa',
            kelas_id: null // Require manual matching or explicit assignment
        })
    }
    
    isLoading.value = true
    const { error } = await supabase.from('profiles').insert(dataToInsert)
    if (error) {
        toast.error('Gagal mengimpor data: ' + error.message)
    } else {
        toast.success(`Berhasil mengimpor ${dataToInsert.length} data.`)
        event.target.value = ''
        if (activeTab.value === 'students') await fetchStudents()
        else await fetchTeachers()
    }
    isLoading.value = false
  }
  reader.readAsText(file)
}

function mockupAlert(featureName) {
  window.alert(`Fitur [${featureName}] saat ini belum tersambung dengan sistem back-end di panel demo.`)
}

// --- Tab & Pagination ---
async function onTabChange(tab) {
  activeTab.value = tab
  currentPage.value = 1
  if (tab === 'students') await fetchStudents()
  else await fetchTeachers()
}

async function onPageChange(page) {
  currentPage.value = page
  if (activeTab.value === 'students') await fetchStudents()
  else await fetchTeachers()
}

async function fetchClasses() {
  const { data } = await supabase.from('master_kelas').select('*').order('nama_kelas', { ascending: true })
  classes.value = data || []
}

onMounted(async () => {
  await fetchClasses()
  await Promise.all([fetchStudents(), fetchTeachers(), fetchStats()])
})
</script>

<template>
  <AdminLayout
    search-placeholder="Cari NISN, Nama, atau Kelas..."
  >
    <div class="users-content">
      <!-- Page Header & Actions -->
      <div class="page-header">
        <div>
          <h2 class="page-title">Manajemen Pengguna</h2>
          <p class="page-desc">Kelola secara terpusat identitas institusi dan kredensial akses pengguna.</p>
        </div>
        <div class="header-actions">
          <input type="file" ref="fileInput" accept=".csv" style="display: none;" @change="handleFileImport" />
          <button class="import-btn" @click="triggerImport">
            <span class="material-symbols-outlined" style="font-size: 16px;">cloud_upload</span>
            Impor File CSV
          </button>
          <button class="add-user-btn" @click="() => { newUser = { id: null, nama_lengkap: '', nomor_induk: '', role: 'siswa', kelas_id: null }; showAddUserModal = true }">
            <span class="material-symbols-outlined" style="font-size: 16px;">person_add</span>
            Tambah Pengguna
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button
          :class="['tab-btn', { active: activeTab === 'students' }]"
          @click="onTabChange('students')"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">group</span>
          Siswa
          <span class="tab-count" :class="{ 'tab-count-active': activeTab === 'students' }">
            {{ studentCount.toLocaleString() }}
          </span>
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'teachers' }]"
          @click="onTabChange('teachers')"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">school</span>
          Guru
          <span class="tab-count" :class="{ 'tab-count-active': activeTab === 'teachers' }">
            {{ teacherCount.toLocaleString() }}
          </span>
        </button>
      </div>

      <!-- Data Table -->
      <DataTable
        :columns="columns"
        :rows="activeRows"
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="totalItems"
        :page-size="PAGE_SIZE"
        @page-change="onPageChange"
      >
        <!-- Controls -->
        <template #controls>
          <div class="table-filters">
            <div class="filter-select-wrapper">
              <select v-model="selectedClass" class="filter-select">
                <option value="">Kelas: Semua Tingkat</option>
                <option>Grade 10</option>
                <option>Grade 11</option>
                <option>Grade 12</option>
              </select>
              <span class="material-symbols-outlined filter-arrow">expand_more</span>
            </div>
            <div class="filter-select-wrapper">
              <select v-model="selectedStatus" class="filter-select">
                <option value="">Status: Semua</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
                <option>Ditangguhkan</option>
              </select>
              <span class="material-symbols-outlined filter-arrow">expand_more</span>
            </div>
          </div>
        </template>

        <!-- Custom Cells -->
        <template #cell-nisn="{ value }">
          <span class="nisn-text">{{ value }}</span>
        </template>

        <template #cell-name="{ row }">
          <div class="name-cell">
            <div
              class="name-avatar"
              :style="{ backgroundColor: row.initialsColor, color: row.initialsText }"
            >
              {{ row.initials }}
            </div>
            <div>
              <p class="name-primary">{{ row.name }}</p>
            </div>
          </div>
        </template>

        <template #cell-classMajor="{ value }">
          <span class="class-text">{{ value }}</span>
        </template>

        <template #cell-status="{ value }">
          <StatusBadge :status="value" />
        </template>

        <template #cell-actions="{ row }">
          <div class="action-buttons">
            <button
              class="unbind-btn"
              title="Device Unbind"
              :disabled="!row.deviceId"
              @click="unbindDevice(row)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px; font-variation-settings: 'FILL' 1;">phonelink_erase</span>
              <span class="unbind-label">UNBIND</span>
            </button>
            <button class="edit-btn" @click="openEditModal(row)">
              <span class="material-symbols-outlined" style="font-size: 18px;">edit_square</span>
            </button>
          </div>
        </template>

        <!-- Loading state -->
        <template #empty>
          <div v-if="isLoading" class="table-state">
            <span class="material-symbols-outlined spin">progress_activity</span>
            <span>Memuat data...</span>
          </div>
          <div v-else class="table-state">
            <span class="material-symbols-outlined">manage_accounts</span>
            <span>Tidak ada data ditemukan.</span>
          </div>
        </template>
      </DataTable>

      <!-- Dashboard Stats Summary (Bento Grid) -->
      <div class="stats-bento">
        <div class="stat-hero">
          <div class="stat-hero-header">
            <span class="material-symbols-outlined" style="font-size: 28px; opacity: 0.5;">verified_user</span>
            <span class="stat-change">+12% bulan ini</span>
          </div>
          <div class="stat-hero-body">
            <h4 class="stat-meta-label">Perangkat Aktif Terverifikasi</h4>
            <p class="stat-hero-value">{{ stats.activeDevices.toLocaleString() }}</p>
          </div>
        </div>

        <div class="stat-card">
          <span class="material-symbols-outlined" style="font-size: 24px; color: var(--color-secondary);">device_reset</span>
          <div class="stat-card-body">
            <h4 class="stat-card-label">Riwayat Lepas Perangkat</h4>
            <p class="stat-card-value">{{ String(stats.recentUnbinds).padStart(2, '0') }}</p>
            <p class="stat-card-note">Dalam 24 Jam</p>
          </div>
        </div>

        <div class="stat-card">
          <span class="material-symbols-outlined" style="font-size: 24px; color: var(--color-tertiary);">pending_actions</span>
          <div class="stat-card-body">
            <h4 class="stat-card-label">Persetujuan Tertunda</h4>
            <p class="stat-card-value">{{ String(stats.pendingApprovals).padStart(2, '0') }}</p>
            <p class="stat-card-note">Permintaan ganti perangkat</p>
          </div>
        </div>
      </div>

      <!-- Sticky Status Footer -->
      <footer class="status-footer">
        <div class="status-left">
          <span class="status-indicator">
            <span class="status-dot online"></span> Sistem Daring
          </span>
          <span class="status-indicator">
            <span class="status-dot sync"></span> Sinkronisasi DB: 100%
          </span>
        </div>
        <div class="status-right">
          © 2024 adminSekolah Architectural Systems • v2.4.0-pro
        </div>
      </footer>
    </div>

    <!-- Add User Modal -->
    <div v-if="showAddUserModal" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ newUser.id ? 'Edit Pengguna' : 'Tambah Pengguna Baru' }}</h3>
          <button class="close-btn" @click="showAddUserModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nama Lengkap</label>
            <input v-model="newUser.nama_lengkap" class="form-input" placeholder="Masukkan nama lengkap" />
          </div>
          <div class="form-group">
            <label>NISN / NIP</label>
            <input v-model="newUser.nomor_induk" class="form-input" placeholder="Masukkan nomor identitas" />
          </div>
          <div class="form-group">
            <label>Peran</label>
            <select v-model="newUser.role" class="form-input">
              <option value="siswa">Peserta Didik (Siswa)</option>
              <option value="guru">Pendidik (Guru)</option>
            </select>
          </div>
          <div class="form-group" v-if="newUser.role === 'siswa'">
            <label>Kelas</label>
            <select v-model="newUser.kelas_id" class="form-input">
              <option :value="null">-- Pilih Kelas --</option>
              <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.nama_kelas }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showAddUserModal = false">Batal</button>
          <button class="save-btn" @click="submitNewUser" :disabled="isLoading">Simpan Pengguna</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.users-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: -0.5px;
}

.page-desc {
  font-size: 14px;
  color: var(--color-on-surface-variant);
  font-weight: 500;
  margin-top: 4px;
}

/* Modal Add User */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.modal-card {
  background: white;
  width: 400px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0;
}
.close-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 13px; font-weight: 500; color: #475569; }
.form-input { 
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
}
.form-input:focus { border-color: var(--color-primary); outline: none; }
.modal-footer {
  padding: 16px 24px;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #e2e8f0;
}
.cancel-btn {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}
.save-btn {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}
.save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: var(--color-surface-container-lowest);
  color: var(--color-on-surface);
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  border: 1px solid rgba(194, 199, 209, 0.2);
  cursor: pointer;
  font-family: var(--font-body);
}

.import-btn:hover {
  background-color: var(--color-surface-container-low);
}

.add-user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%);
  color: white;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 53, 95, 0.2);
  font-family: var(--font-body);
}

.add-user-btn:hover {
  box-shadow: 0 4px 12px rgba(0, 53, 95, 0.3);
}

.add-user-btn:active {
  transform: scale(0.95);
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  border-bottom: 1px solid rgba(194, 199, 209, 0.2);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-on-surface-variant);
  cursor: pointer;
  font-family: var(--font-body);
  transition: color 0.2s;
}

.tab-btn:hover {
  color: var(--color-primary);
}

.tab-btn.active {
  color: var(--color-primary);
  font-weight: 700;
  border-bottom-color: var(--color-primary);
}

.tab-count {
  margin-left: 8px;
  padding: 2px 8px;
  background-color: var(--color-surface-container-highest);
  color: var(--color-on-surface-variant);
  font-size: 10px;
  border-radius: 9999px;
  font-weight: 500;
}

.tab-count-active {
  background-color: var(--color-primary-fixed);
  color: var(--color-primary-container);
}

/* Table Filters */
.table-filters {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-select-wrapper {
  position: relative;
}

.filter-select {
  appearance: none;
  background-color: white;
  border: 1px solid rgba(194, 199, 209, 0.3);
  border-radius: 8px;
  padding: 6px 40px 6px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-on-surface);
  font-family: var(--font-body);
  outline: none;
  cursor: pointer;
}

.filter-select:focus {
  box-shadow: 0 0 0 2px rgba(0, 53, 95, 0.1);
}

.filter-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #94a3b8;
  pointer-events: none;
}

/* Custom Cells */
.nisn-text {
  font-size: 14px;
  font-family: ui-monospace, 'Cascadia Code', monospace;
  font-weight: 500;
  color: var(--color-primary);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.name-primary {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-on-surface);
}

.name-email {
  font-size: 10px;
  color: var(--color-on-surface-variant);
  margin-top: 1px;
}

.class-text {
  font-size: 14px;
  color: var(--color-on-surface-variant);
  font-weight: 500;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

:deep(.table-row:hover) .action-buttons,
:deep(tr:hover) .action-buttons {
  opacity: 1;
}

.unbind-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  border-radius: 8px;
  font-family: var(--font-body);
}

.unbind-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.unbind-btn:hover:not(:disabled) {
  background-color: rgba(186, 26, 26, 0.06);
}

.unbind-label {
  font-size: 10px;
  font-weight: 700;
}

.edit-btn {
  padding: 8px;
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  border-radius: 8px;
}

.edit-btn:hover {
  background-color: var(--color-primary-fixed);
}

/* Table State */
.table-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--color-on-surface-variant);
  font-size: 14px;
  font-weight: 500;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Stats Bento */
.stats-bento {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 24px;
  margin-top: 16px;
}

.stat-hero {
  grid-column: span 1;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%);
  padding: 24px;
  border-radius: 12px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
}

.stat-hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-change {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  backdrop-filter: blur(4px);
}

.stat-meta-label {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.stat-hero-value {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
}

.stat-card {
  background-color: var(--color-surface-container-lowest);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  border: 1px solid rgba(194, 199, 209, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stat-card-body {
  margin-top: auto;
}

.stat-card-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.stat-card-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-primary);
  margin-top: 4px;
}

.stat-card-note {
  font-size: 10px;
  color: var(--color-on-surface-variant);
  margin-top: 4px;
}

/* Status Footer */
.status-footer {
  background-color: var(--color-surface-container-lowest);
  border-top: 1px solid rgba(194, 199, 209, 0.2);
  padding: 12px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-on-surface-variant);
  margin-top: 16px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background-color: var(--color-secondary);
}

.status-dot.sync {
  background-color: var(--color-primary-container);
}

@media (max-width: 1024px) {
  .stats-bento {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
