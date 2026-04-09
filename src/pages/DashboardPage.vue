<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue3-toastify'
import { supabase } from '../supabase'
import AdminLayout from '../components/layout/AdminLayout.vue'
import MetricCard from '../components/ui/MetricCard.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import ActivityTimeline from '../components/ui/ActivityTimeline.vue'

// --- State ---
const attendanceData = ref([])
const isLoading = ref(true)
let realtimeChannel = null

// Metric state
const metrics = ref({
  totalPresent: 0,
  attendancePercent: 0,
  totalTeachers: 0,
  activeClasses: 0,
})

const activityItems = ref([])
const geofenceCount = ref(0)

const today = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// --- Helpers ---
function timeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const diff = Math.floor((new Date() - date) / 1000)
  if (diff < 60) return `${diff} SECS AGO`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins} MINS AGO`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} HOURS AGO`
  return `${Math.floor(hours / 24)} DAYS AGO`
}
function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

function formatTime(isoString) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function mapAbsenToRow(absen) {
  const profile = absen.profiles || {}
  const status = absen.status_absen?.toLowerCase() === 'hadir' ? 'success' : 'error'
  return {
    name: profile.nama_lengkap || 'Unknown',
    grade: profile.master_kelas ? profile.master_kelas.nama_kelas : '-',
    time: formatTime(absen.waktu_absen),
    status,
    initials: getInitials(profile.nama_lengkap),
  }
}

// --- Data Fetching ---
async function fetchMetrics() {
  // Total present today
  const todayDate = new Date().toISOString().split('T')[0]
  const { count: presentCount } = await supabase
    .from('riwayat_absen')
    .select('*', { count: 'exact', head: true })
    .eq('status_absen', 'Hadir')
    .gte('waktu_absen', `${todayDate}T00:00:00`)

  // Total siswa untuk persentase
  const { count: totalSiswa } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'siswa')

  // Total guru aktif
  const { count: totalGuru } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'guru')

  // Hitung jadwal pelajaran untuk active classes (hari ini)
  let currentDay = new Date().getDay()
  if (currentDay === 0) currentDay = 7 // Minggu mapping jika perlu
  const { count: activeClasses } = await supabase
    .from('jadwal_pelajaran')
    .select('*', { count: 'exact', head: true })
    .eq('hari', currentDay)

  // Hitung router geofencing
  const { count: gates } = await supabase
    .from('master_bssid')
    .select('*', { count: 'exact', head: true })
  geofenceCount.value = gates || 0

  metrics.value = {
    totalPresent: presentCount || 0,
    attendancePercent: totalSiswa ? Math.round(((presentCount || 0) / totalSiswa) * 100) : 0,
    totalTeachers: totalGuru || 0,
    activeClasses: activeClasses || 0,
  }
}

async function fetchLatestAttendance() {
  isLoading.value = true
  const { data, error } = await supabase
    .from('riwayat_absen')
    .select(`
      *,
      profiles (nama_lengkap, nomor_induk, master_kelas (nama_kelas))
    `)
    .order('waktu_absen', { ascending: false })
    .limit(10)

  if (error) {
    toast.error('Gagal memuat data absensi.')
    console.error(error)
  } else {
    attendanceData.value = (data || []).map(mapAbsenToRow)
  }
  isLoading.value = false
}

async function fetchActivityLogs() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(4)

  if (!error && data) {
    activityItems.value = data.map(log => ({
      icon: log.icon || 'info',
      bgColor: log.bg_color || 'var(--color-outline-variant)',
      textColor: log.text_color || 'var(--color-on-surface-variant)',
      title: log.title || 'System Action',
      description: log.description || '',
      time: timeAgo(log.created_at)
    }))
  }
}

// --- Realtime Subscription ---
function subscribeRealtime() {
  realtimeChannel = supabase
    .channel('dashboard-attendance-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'riwayat_absen' },
      async (payload) => {
        // Ambil data profil siswa
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nama_lengkap, nomor_induk, master_kelas (nama_kelas)')
          .eq('id', payload.new.siswa_id)
          .single()

        const newRow = mapAbsenToRow({
          ...payload.new,
          profiles: profileData,
        })

        // Tambah ke atas list
        attendanceData.value.unshift(newRow)
        if (attendanceData.value.length > 10) attendanceData.value.pop()

        toast.info(`Absen masuk: ${newRow.name}`, { autoClose: 2000 })

        // Update metrics
        if (payload.new.status_absen === 'Hadir') {
          metrics.value.totalPresent++
        }
      }
    )
    .subscribe()
}

onMounted(async () => {
  await Promise.all([fetchMetrics(), fetchLatestAttendance(), fetchActivityLogs()])
  subscribeRealtime()
})

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
})
</script>

<template>
  <AdminLayout
    page-title="Dashboard"
    search-placeholder="Search student records..."
  >
    <div class="dashboard-content">
      <!-- Hero Header -->
      <section class="hero-header">
        <h2 class="hero-title">Ringkasan Administratif</h2>
        <p class="hero-subtitle">Pemantauan aktivitas kampus langsung untuk {{ today }}</p>
      </section>

      <!-- Metric Bento Grid -->
      <section class="metrics-grid">
        <MetricCard
          label="Kesehatan Absensi"
          :value="metrics.totalPresent.toLocaleString()"
          subtitle="Total Siswa Hadir Hari Ini"
          :progress="metrics.attendancePercent"
        />

        <MetricCard
          label="Distribusi Staf"
          :value="String(metrics.totalTeachers)"
          subtitle="Total Guru Aktif"
        >
          <template #footer>
            <div class="avatar-stack">
              <div class="avatar-item" v-for="i in Math.min(3, metrics.totalTeachers)" :key="i">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant);">person</span>
              </div>
              <div class="avatar-count" v-if="metrics.totalTeachers > 3">+{{ metrics.totalTeachers - 3 }}</div>
            </div>
          </template>
        </MetricCard>

        <MetricCard
          label="Denyut Sistem"
          :value="String(metrics.activeClasses)"
          subtitle="Kelas Aktif Berjalan Saat Ini"
          variant="gradient"
          icon="rocket_launch"
        />
      </section>

      <!-- Main Content Area -->
      <section class="content-grid">
        <!-- Monitoring List (2/3 width) -->
        <div class="monitoring-section">
          <div class="section-header">
            <h4 class="section-title">Absensi Waktu Nyata</h4>
            <StatusBadge status="live" />
          </div>

          <div class="attendance-table">
            <!-- Table Header -->
            <div class="table-header-row">
              <div class="col-entity">Identitas Siswa</div>
              <div class="col-time">Waktu Catat</div>
              <div class="col-status">Verifikasi</div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="table-loading">
              <span class="material-symbols-outlined spin">progress_activity</span>
              <span>Memuat data absensi...</span>
            </div>

            <!-- Empty State -->
            <div v-else-if="attendanceData.length === 0" class="table-empty">
              <span class="material-symbols-outlined">event_busy</span>
              <span>Belum ada data absensi hari ini.</span>
            </div>

            <!-- Table Rows -->
            <div
              v-else
              v-for="(student, index) in attendanceData"
              :key="index"
              class="table-row"
            >
              <div class="col-entity">
                <div class="student-info">
                  <div class="student-avatar">
                    <span style="font-size: 13px; font-weight: 700; color: var(--color-primary);">{{ student.initials }}</span>
                  </div>
                  <div>
                    <p class="student-name">{{ student.name }}</p>
                    <p class="student-grade">{{ student.grade }}</p>
                  </div>
                </div>
              </div>
              <div class="col-time">{{ student.time }}</div>
              <div class="col-status">
                <StatusBadge :status="student.status" />
              </div>
            </div>
          </div>

          <button class="view-log-btn" @click="window.alert('Membuka History Log Lengkap...')">
            <span>Lihat Semua Log</span>
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
          </button>
        </div>

        <!-- Activity Stream (1/3 width) -->
        <div class="activity-section">
          <h4 class="section-title">Log Aktivitas</h4>
          <ActivityTimeline :items="activityItems" />

          <!-- Geofencing Mini-Widget -->
          <div class="geo-widget">
            <div class="geo-header">
              <span class="geo-label">ZONA KAMPUS</span>
              <span class="material-symbols-outlined" style="color: var(--color-secondary);">radar</span>
            </div>
            <div class="geo-map">
              <div class="geo-map-placeholder">
                <span class="material-symbols-outlined" style="font-size: 48px; color: var(--color-outline); opacity: 0.3;">map</span>
              </div>
            </div>
            <div class="geo-footer">
              <p>Pemantauan aktif di {{ geofenceCount }} gerbang utama. Semua aman.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>

<style scoped>
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* Hero Header */
.hero-header {
  margin-bottom: 0;
}

.hero-title {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--color-on-surface);
}

.hero-subtitle {
  color: var(--color-on-surface-variant);
  font-weight: 500;
  margin-top: 4px;
  font-size: 15px;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

/* Avatar Stack */
.avatar-stack {
  display: flex;
  margin-top: 24px;
  margin-left: -4px;
}

.avatar-item {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid white;
  background-color: var(--color-surface-container-high);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -6px;
}

.avatar-item:first-child {
  margin-left: 0;
}

.avatar-count {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid white;
  background-color: var(--color-surface-container-high);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-on-surface);
  margin-left: -6px;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 40px;
}

/* Monitoring Section */
.monitoring-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
}

/* Attendance Table */
.attendance-table {
  background-color: var(--color-surface-container-lowest);
  border-radius: 12px;
  overflow: hidden;
}

.table-header-row {
  display: grid;
  grid-template-columns: 6fr 3fr 3fr;
  padding: 16px 24px;
  background-color: var(--color-surface-container-low);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-on-surface-variant);
}

/* Loading & Empty states */
.table-loading,
.table-empty {
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

.table-row {
  display: grid;
  grid-template-columns: 6fr 3fr 3fr;
  padding: 20px 24px;
  align-items: center;
  transition: background-color 0.15s;
}

.table-row:hover {
  background-color: var(--color-surface-container-low);
}

.col-status {
  text-align: right;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.student-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--color-surface-container-high);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.student-name {
  font-weight: 600;
  color: var(--color-on-surface);
  font-size: 14px;
}

.student-grade {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  margin-top: 2px;
}

.col-time {
  font-size: 14px;
  color: var(--color-on-surface-variant);
  font-weight: 500;
}

/* View Log Button */
.view-log-btn {
  width: 100%;
  padding: 16px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
  background: none;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-body);
}

.view-log-btn:hover {
  background-color: var(--color-primary-fixed);
}

/* Activity Section */
.activity-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Geo Widget */
.geo-widget {
  background-color: var(--color-surface-container-lowest);
  padding: 24px;
  border-radius: 12px;
}

.geo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.geo-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.5px;
}

.geo-map {
  aspect-ratio: 16/9;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--color-surface-container-high);
}

.geo-map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.geo-footer {
  margin-top: 16px;
}

.geo-footer p {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-on-surface-variant);
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
