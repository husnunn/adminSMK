<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { toast } from 'vue3-toastify'

const route = useRoute()
const router = useRouter()

const navItems = [
  { label: 'Dasbor',           icon: 'dashboard',    to: '/' },
  { label: 'Data Induk',       icon: 'group',        to: '/students' },
  { label: 'Rekap Absensi',    icon: 'fact_check',   to: '/absensi' },
  { label: 'Jadwal',           icon: 'calendar_today', to: '/schedules' },
  { label: 'Sistem Pemantauan', icon: 'location_on', to: '/geofencing' },
]

const isActive = (item) => {
  return route.path === item.to
}

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    toast.error('Gagal keluar sesi: ' + error.message)
  } else {
    router.push('/login')
  }
}

const handleExportReports = async () => {
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) {
    toast.error('Gagal menarik data: ' + error.message)
    return
  }
  if (!data || data.length === 0) return toast.info('Tidak ada data untuk diekspor.')

  const headers = ['id', 'nama_lengkap', 'nomor_induk', 'role', 'email', 'kelas_id', 'is_on_leave']
  const csvRows = [headers.join(',')]
  
  data.forEach(row => {
    const values = headers.map(header => {
      const escaped = ('' + (row[header] || '')).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  })

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('href', url)
  a.setAttribute('download', 'laporan_pengguna.csv')
  a.click()
  window.URL.revokeObjectURL(url)
}

const openDocs = () => {
  window.open('https://github.com/astral-systems', '_blank')
}
</script>

<template>
  <aside class="sidebar">
    <!-- Branding -->
    <div class="brand">
      <div class="brand-icon">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; color: white;">school</span>
      </div>
      <div>
        <h1 class="brand-title">adminSekolah</h1>
        <p class="brand-subtitle">Institutional Portal</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="nav">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="['nav-item', { active: isActive(item) }]"
      >
        <span
          class="material-symbols-outlined"
          :style="isActive(item) ? `font-variation-settings: 'FILL' 1;` : ''"
        >{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Footer -->
    <div class="sidebar-footer">
      <button class="export-btn" @click="handleExportReports">
        <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
        Ekspor Kinerja
      </button>
      <router-link to="#" class="nav-item footer-link" @click.prevent="openDocs">
        <span class="material-symbols-outlined">help</span>
        <span class="nav-label">Pusat Bantuan</span>
      </router-link>
      <button @click="handleLogout" class="nav-item footer-link logout-link" style="width: 100%; border: none; background: none; text-align: left;">
        <span class="material-symbols-outlined">logout</span>
        <span class="nav-label">Keluar</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100vh;
  width: 256px;
  position: fixed;
  left: 0;
  top: 0;
  background-color: var(--color-surface-container-low);
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 8px;
  z-index: 50;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  margin-bottom: 24px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-icon .material-symbols-outlined {
  font-size: 22px;
}

.brand-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--color-primary);
  line-height: 1.1;
  letter-spacing: -0.3px;
}

.brand-subtitle {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-on-surface-variant);
  font-weight: 700;
  margin-top: 2px;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  color: #64748b;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
}

.nav-item .material-symbols-outlined {
  font-size: 22px;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
}

.nav-item:hover:not(.active) {
  background-color: rgba(100, 116, 139, 0.08);
}

.nav-item.active {
  background-color: white;
  color: var(--color-primary-container);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.nav-item.active .nav-label {
  font-weight: 600;
}

.sidebar-footer {
  padding-top: 16px;
  margin-top: auto;
  border-top: 1px solid rgba(194, 199, 209, 0.15);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.export-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-body);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 53, 95, 0.2);
  margin-bottom: 8px;
}

.export-btn:active {
  transform: scale(0.95);
}

.footer-link {
  font-size: 13px;
}

.logout-link {
  color: var(--color-error);
}

.logout-link:hover {
  background-color: rgba(186, 26, 26, 0.06);
}
</style>
