<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../supabase'

defineProps({
  title: {
    type: String,
    default: ''
  },
  searchPlaceholder: {
    type: String,
    default: 'Pencarian...'
  }
})

const adminName = ref('Loading...')
const adminRole = ref('Administrator')

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama_lengkap, role')
      .eq('id', user.id)
      .maybeSingle()
      
    if (profile) {
      adminName.value = profile.nama_lengkap || user.email.split('@')[0]
      adminRole.value = profile.role === 'admin' ? 'Super Admin' : profile.role
    } else {
      adminName.value = user.email.split('@')[0]
    }
  } else {
    adminName.value = 'Not Logged In'
  }
})
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <h2 v-if="title" class="topbar-title">{{ title }}</h2>
      <div class="search-wrapper">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          class="search-input"
          :placeholder="searchPlaceholder"
        />
      </div>
      <slot name="left" />
    </div>
    <div class="topbar-right">
      <slot name="actions" />
      <button class="icon-btn" title="Notifikasi Sistem">
        <span class="material-symbols-outlined">notifications</span>
        <span class="notif-dot"></span>
      </button>
      <button class="icon-btn" title="Pengaturan">
        <span class="material-symbols-outlined">settings</span>
      </button>
      <div class="divider"></div>
      <div class="profile-section">
        <div class="profile-info">
          <p class="profile-name">{{ adminName }}</p>
          <p class="profile-role" style="text-transform: capitalize;">{{ adminRole }}</p>
        </div>
        <div class="profile-avatar">
          <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-on-surface-variant);">person</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.topbar-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--color-primary);
  white-space: nowrap;
}

.search-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  background-color: var(--color-surface-container-low);
  border: none;
  border-radius: 9999px;
  padding: 8px 16px 8px 40px;
  font-size: 14px;
  width: 280px;
  color: var(--color-on-surface);
  font-family: var(--font-body);
  outline: none;
  transition: box-shadow 0.2s;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-input:focus {
  box-shadow: 0 0 0 2px rgba(15, 76, 129, 0.15);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.icon-btn:hover {
  background-color: rgba(100, 116, 139, 0.06);
}

.icon-btn .material-symbols-outlined {
  font-size: 22px;
}

.notif-dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 8px;
  height: 8px;
  background-color: var(--color-error);
  border-radius: 50%;
}

.divider {
  width: 1px;
  height: 32px;
  background-color: rgba(194, 199, 209, 0.3);
  margin: 0 8px;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-info {
  text-align: right;
}

.profile-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.profile-role {
  font-size: 10px;
  color: var(--color-on-surface-variant);
  font-weight: 500;
  margin-top: 2px;
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  background-color: var(--color-surface-container-highest);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-surface-container-high);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
