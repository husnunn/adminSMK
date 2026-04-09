<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'vue3-toastify'
import { supabase } from '../supabase'
import AdminLayout from '../components/layout/AdminLayout.vue'
import FormInput from '../components/ui/FormInput.vue'
import InfoCard from '../components/ui/InfoCard.vue'

// --- State ---
const primarySSID = ref('')
const primaryBSSID = ref('')
const secondarySSID = ref('')
const secondaryBSSID = ref('')
const routerIds = ref({ primary: null, secondary: null })

const schoolStartTime = ref('07:00')
const dhuhaBegin = ref('08:30')
const dhuhaEnd = ref('10:00')
const autoLock = ref(true)

const isSavingConnectivity = ref(false)
const isSavingTime = ref(false)

// --- Fetch router BSSID data ---
async function fetchBSSIDs() {
  const { data, error } = await supabase
    .from('master_bssid')
    .select('*')
    .order('id', { ascending: true })
    .limit(2)

  if (error) {
    toast.error('Gagal memuat data router.')
    console.error(error)
    return
  }

  if (data && data[0]) {
    primarySSID.value = data[0].nama_lokasi || ''
    primaryBSSID.value = data[0].mac_address || ''
    routerIds.value.primary = data[0].id
  }

  if (data && data[1]) {
    secondarySSID.value = data[1].nama_lokasi || ''
    secondaryBSSID.value = data[1].mac_address || ''
    routerIds.value.secondary = data[1].id
  }
}

// --- Save router config ---
async function saveConnectivity() {
  isSavingConnectivity.value = true

  try {
    // Upsert primary router
    if (routerIds.value.primary) {
      const { error } = await supabase
        .from('master_bssid')
        .update({ nama_lokasi: primarySSID.value, mac_address: primaryBSSID.value })
        .eq('id', routerIds.value.primary)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('master_bssid')
        .insert([{ nama_lokasi: primarySSID.value, mac_address: primaryBSSID.value }])
        .select()
      if (error) throw error
      if (data?.[0]) routerIds.value.primary = data[0].id
    }

    // Upsert secondary router
    if (routerIds.value.secondary) {
      const { error } = await supabase
        .from('master_bssid')
        .update({ nama_lokasi: secondarySSID.value, mac_address: secondaryBSSID.value })
        .eq('id', routerIds.value.secondary)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('master_bssid')
        .insert([{ nama_lokasi: secondarySSID.value, mac_address: secondaryBSSID.value }])
        .select()
      if (error) throw error
      if (data?.[0]) routerIds.value.secondary = data[0].id
    }

    toast.success('Konfigurasi konektivitas berhasil disimpan!')
  } catch (err) {
    toast.error(`Gagal menyimpan: ${err.message}`)
    console.error(err)
  } finally {
    isSavingConnectivity.value = false
  }
}

// --- Add new router node ---
async function addRouterNode() {
  const { data, error } = await supabase
    .from('master_bssid')
    .insert([{ nama_lokasi: 'Router Baru', mac_address: '' }])
    .select()

  if (error) {
    toast.error('Gagal menambah router baru.')
    return
  }

  toast.success('Router node baru ditambahkan.')
  // Refresh
  await fetchBSSIDs()
}

// --- Fetch Time Config ---
async function fetchTimeConfig() {
  const { data, error } = await supabase.from('app_settings').select('*')
  if (!error && data) {
    const masuk = data.find(d => d.key === 'jam_masuk')
    const begin = data.find(d => d.key === 'dhuha_begin')
    const end = data.find(d => d.key === 'dhuha_end')
    const lock = data.find(d => d.key === 'auto_lock')
    
    if (masuk?.value) schoolStartTime.value = masuk.value
    if (begin?.value) dhuhaBegin.value = begin.value
    if (end?.value) dhuhaEnd.value = end.value
    if (lock?.value) autoLock.value = lock.value === 'true'
  }
}

// --- Save Time Config ---
async function saveTimeConfig() {
  isSavingTime.value = true

  const updates = [
    { key: 'jam_masuk', value: schoolStartTime.value },
    { key: 'dhuha_begin', value: dhuhaBegin.value },
    { key: 'dhuha_end', value: dhuhaEnd.value },
    { key: 'auto_lock', value: String(autoLock.value) }
  ]

  const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' })

  if (error) {
    toast.error(`Gagal menyimpan konfigurasi: ${error.message}`)
  } else {
    toast.success('Konfigurasi waktu berhasil diperbarui!')
  }
  
  isSavingTime.value = false
}

onMounted(async () => {
  await Promise.all([fetchBSSIDs(), fetchTimeConfig()])
})
</script>

<template>
  <AdminLayout
    page-title="Sistem Pemantauan"
    search-placeholder="Cari parameter..."
  >
    <div class="geofencing-content">
      <!-- Page Header -->
      <div class="page-header">
        <h3 class="page-title">Infrastruktur Sistem</h3>
        <p class="page-desc">Konfigurasikan batasan digital dan kerangka waktu institusi. Pengaturan ini menentukan bagaimana sistem absensi berinteraksi dengan perangkat keras dan siklus sekolah.</p>
      </div>

      <div class="main-grid">
        <!-- Section 1: Wi-Fi Geofencing (2/3) -->
        <div class="left-column">
          <!-- Wi-Fi Geofencing Card -->
          <section class="config-card">
            <div class="card-header">
              <div class="header-left">
                <div class="header-icon icon-secondary">
                  <span class="material-symbols-outlined" style="font-size: 24px;">wifi_tethering</span>
                </div>
                <div>
                  <h4 class="card-title">Geofencing Wi-Fi</h4>
                  <p class="card-subtitle">Otorisasi akses absensi berdasarkan zona jaringan lokal</p>
                </div>
              </div>
              <span class="active-badge">Kebijakan Aktif</span>
            </div>

            <div class="router-form">
              <!-- Primary Router -->
              <div class="router-row">
                <FormInput
                  label="SSID Router Utama"
                  v-model="primarySSID"
                  placeholder="Masukkan SSID"
                />
                <FormInput
                  label="BSSID (MAC Address)"
                  v-model="primaryBSSID"
                  placeholder="00:1A:2B:3C:4D:5E"
                  :monospace="true"
                  info-tooltip="BSSID is the unique hardware identifier of your router's wireless interface."
                />
              </div>

              <!-- Secondary Router -->
              <div class="router-row">
                <FormInput
                  label="SSID Router Tambahan"
                  v-model="secondarySSID"
                  placeholder="Masukkan SSID"
                />
                <FormInput
                  label="BSSID (Alamat MAC)"
                  v-model="secondaryBSSID"
                  placeholder="00:1A:2B:3C:4D:5E"
                  :monospace="true"
                />
              </div>

              <button class="add-router-btn" @click="addRouterNode">
                <span class="material-symbols-outlined" style="font-size: 20px;">add_circle</span>
                Tambah Node Router
              </button>
            </div>

            <div class="card-footer">
              <p class="footer-note">Perubahan akan langsung teraplikasi ke semua terminal absensi lokal.</p>
              <button class="save-btn" :disabled="isSavingConnectivity" @click="saveConnectivity">
                <span v-if="isSavingConnectivity" class="material-symbols-outlined spin" style="font-size: 18px;">progress_activity</span>
                {{ isSavingConnectivity ? 'Menyimpan...' : 'Simpan Konfigurasi' }}
              </button>
            </div>
          </section>

          <!-- System Status Map -->
          <div class="map-card">
            <div class="map-placeholder">
              <span class="material-symbols-outlined" style="font-size: 64px; color: var(--color-outline); opacity: 0.2;">map</span>
            </div>
            <div class="map-overlay">
              <div class="map-badges">
                <div class="router-badge">
                  <span class="router-dot live"></span> Router 01: Live
                </div>
                <div class="router-badge">
                  <span class="router-dot live"></span> Router 02: Live
                </div>
              </div>
              <div class="map-info">
                <p class="map-label">Verifikasi Lokasi</p>
                <h5 class="map-title">{{ primarySSID || 'Zona Kampus' }} Terlindungi</h5>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Global Time Config (1/3) -->
        <div class="right-column">
          <section class="config-card">
            <div class="header-left" style="margin-bottom: 32px;">
              <div class="header-icon icon-primary">
                <span class="material-symbols-outlined" style="font-size: 24px;">schedule</span>
              </div>
              <div>
                <h4 class="card-title">Konfigurasi Waktu Global</h4>
                <p class="card-subtitle">Sinkronisasi batas waktu operasional</p>
              </div>
            </div>

            <div class="time-config">
              <!-- School Start Time -->
              <div class="time-field">
                <div class="time-label-row">
                  <label class="time-label">Jam Masuk Sekolah</label>
                  <span class="standard-cycle">Siklus Standar</span>
                </div>
                <div class="time-input-large">
                  <input
                    type="time"
                    v-model="schoolStartTime"
                    class="time-input big"
                  />
                </div>
              </div>

              <!-- Dhuha Prayer Range -->
              <div class="time-field border-top">
                <div class="time-label-row">
                  <label class="time-label">Jadwal Pemantauan Dhuha</label>
                  <div class="tooltip-trigger">
                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-outline);">info</span>
                    <div class="tooltip-content">Tentukan rentang waktu aktifnya penerimaan absensi ibadah Dhuha.</div>
                  </div>
                </div>
                <div class="time-range">
                  <div class="time-range-item">
                    <p class="range-label">MULAI</p>
                    <input type="time" v-model="dhuhaBegin" class="time-input" />
                  </div>
                  <div class="time-range-item">
                    <p class="range-label">SELESAI</p>
                    <input type="time" v-model="dhuhaEnd" class="time-input" />
                  </div>
                </div>
              </div>

              <!-- Auto-Lock System -->
              <div class="time-field">
                <div class="time-label-row">
                  <label class="time-label">Pengamanan (Auto-Lock)</label>
                  <button
                    :class="['toggle-btn', { active: autoLock }]"
                    @click="autoLock = !autoLock"
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </div>
                <p class="toggle-desc">Sistem otomatis akan menolak pencatatan absensi baru di luar jam operasional.</p>
              </div>

              <button
                class="update-schedule-btn"
                :disabled="isSavingTime"
                @click="saveTimeConfig"
              >
                <span v-if="isSavingTime" class="material-symbols-outlined spin" style="font-size: 18px; vertical-align: middle;">progress_activity</span>
                {{ isSavingTime ? 'Menyimpan...' : 'Perbarui Jadwal' }}
              </button>
            </div>
          </section>

          <!-- Decorative Info Card -->
          <InfoCard
            title="Sistem Log Otomatis"
            description="Sistem akan mencadangkan rekapitulasi harian secara otomatis pada pukul 23:59."
            link-text="Lihat Riwayat Audit"
            icon="history_edu"
            variant="primary"
          />
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.geofencing-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.page-header {
  margin-bottom: 8px;
}

.page-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-on-surface);
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.page-desc {
  color: var(--color-on-surface-variant);
  font-size: 16px;
  max-width: 640px;
  line-height: 1.6;
}

/* Main Grid */
.main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Config Card */
.config-card {
  background-color: var(--color-surface-container-lowest);
  border-radius: 12px;
  padding: 32px;
  border: 1px solid rgba(194, 199, 209, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-secondary {
  background-color: rgba(0, 106, 106, 0.1);
  color: var(--color-secondary);
}

.icon-primary {
  background-color: rgba(0, 53, 95, 0.1);
  color: var(--color-primary);
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-on-surface);
}

.card-subtitle {
  font-size: 14px;
  color: var(--color-on-surface-variant);
  margin-top: 2px;
}

.active-badge {
  padding: 4px 12px;
  background-color: var(--color-secondary-fixed);
  color: var(--color-on-secondary-fixed);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  border-radius: 9999px;
  letter-spacing: 1px;
}

/* Router Form */
.router-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.router-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.add-router-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  font-family: var(--font-body);
}

.add-router-btn:hover {
  text-decoration: underline;
}

/* Card Footer */
.card-footer {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid rgba(194, 199, 209, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.footer-note {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  font-style: italic;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #00355f 0%, #0f4c81 100%);
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 53, 95, 0.2);
  font-family: var(--font-body);
  white-space: nowrap;
  flex-shrink: 0;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn:active:not(:disabled) {
  transform: scale(0.95);
}

/* Map Card */
.map-card {
  background-color: var(--color-surface-container-low);
  border-radius: 12px;
  padding: 4px;
  overflow: hidden;
  height: 256px;
  position: relative;
}

.map-placeholder {
  position: absolute;
  inset: 0;
  background-color: var(--color-surface-container-high);
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-overlay {
  position: relative;
  z-index: 10;
  padding: 32px;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.map-badges {
  display: flex;
  gap: 8px;
}

.router-badge {
  background-color: white;
  padding: 4px 12px;
  border-radius: 9999px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  color: var(--color-on-surface);
}

.router-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.router-dot.live {
  background-color: #22c55e;
}

.map-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.3px;
  opacity: 0.8;
  color: var(--color-on-surface-variant);
}

.map-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-on-surface);
  margin-top: 4px;
}

/* Time Config */
.time-config {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.time-field {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-field.border-top {
  padding-top: 16px;
  border-top: 1px solid rgba(194, 199, 209, 0.1);
}

.time-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.time-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.standard-cycle {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
}

.time-input {
  width: 100%;
  background-color: var(--color-surface-container-low);
  border: none;
  border-radius: 10px;
  padding: 12px;
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  outline: none;
}

.time-input.big {
  padding: 20px;
  font-size: 24px;
  font-weight: 900;
}

.time-input:focus {
  box-shadow: 0 0 0 2px rgba(0, 53, 95, 0.15);
}

.time-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.time-range-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-outline);
  text-align: center;
}

/* Toggle Button */
.toggle-btn {
  width: 40px;
  height: 24px;
  border-radius: 9999px;
  border: none;
  background-color: var(--color-outline-variant);
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-btn.active {
  background-color: var(--color-primary);
}

.toggle-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  transition: transform 0.2s;
}

.toggle-btn.active .toggle-knob {
  transform: translateX(16px);
}

.toggle-desc {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  line-height: 1.5;
}

.update-schedule-btn {
  width: 100%;
  background-color: var(--color-primary-container);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  font-family: var(--font-body);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.update-schedule-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.update-schedule-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.update-schedule-btn:active:not(:disabled) {
  transform: scale(0.95);
}

/* Tooltip */
.tooltip-trigger {
  position: relative;
  display: flex;
  align-items: center;
  cursor: help;
}

.tooltip-content {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  width: 220px;
  padding: 8px;
  background-color: var(--color-inverse-surface);
  color: var(--color-inverse-on-surface);
  font-size: 10px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
}

.tooltip-trigger:hover .tooltip-content {
  opacity: 1;
}

/* Spin */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  .router-row {
    grid-template-columns: 1fr;
  }
}
</style>
