<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { toast } from 'vue3-toastify'

const router = useRouter()

const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)

const handleLogin = async () => {
  if (!identifier.value || !password.value) {
    toast.warn('Masukkan email dan password Anda.')
    return
  }

  isLoading.value = true
  const emailFake = `${identifier.value.trim()}@robithotulhikmah.sch.id`

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailFake,
    password: password.value,
  })
  isLoading.value = false

  if (error) {
    toast.error('Login gagal: ' + error.message)
    console.error(error)
  } else {
    toast.success('Login berhasil! Mengalihkan...')
    router.push('/')
  }
}
</script>

<template>
  <main class="login-page bg-pattern">
    <!-- Login Card Container -->
    <div class="login-container">
      <!-- Branding Header -->
      <div class="branding">
        <div class="brand-icon-wrapper">
          <div class="brand-icon">
            <span class="material-symbols-outlined" style="font-size: 32px; color: white;">school</span>
          </div>
        </div>
        <h1 class="brand-title">adminSekolah</h1>
        <p class="brand-subtitle">Institutional Access Portal</p>
      </div>

      <!-- Login Card -->
      <div class="login-card">
        <!-- Gradient accent line -->
        <div class="accent-line"></div>

        <div class="card-content">
          <div class="card-header">
            <h2 class="card-title">Masuk Aman</h2>
            <p class="card-desc">Silakan masukkan identitas institusi Anda.</p>
          </div>

          <form @submit.prevent="handleLogin" class="login-form">
            <!-- Email / NISN Field -->
            <div class="field">
              <label class="field-label" for="identifier">Email atau ID</label>
              <div class="input-wrapper">
                <div class="input-icon">
                  <span class="material-symbols-outlined" style="font-size: 18px;">person</span>
                </div>
                <input
                  id="identifier"
                  v-model="identifier"
                  type="text"
                  class="login-input"
                  placeholder="Masukkan email atau ID Anda"
                />
              </div>
            </div>

            <!-- Password Field -->
            <div class="field">
              <div class="label-row">
                <label class="field-label" for="password">Kata Sandi</label>
                <a href="#" class="forgot-link">Lupa Kata Sandi?</a>
              </div>
              <div class="input-wrapper">
                <div class="input-icon">
                  <span class="material-symbols-outlined" style="font-size: 18px;">lock</span>
                </div>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="login-input has-suffix"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  class="visibility-toggle"
                  @click="showPassword = !showPassword"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px;">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="submit-section">
              <button type="submit" class="submit-btn" :disabled="isLoading">
                <span>{{ isLoading ? 'Mengautentikasi...' : 'Masuk Portal' }}</span>
                <span v-if="isLoading" class="material-symbols-outlined spin" style="font-size: 18px;">progress_activity</span>
                <span v-else class="material-symbols-outlined" style="font-size: 18px;">login</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Footer Utility -->
      <div class="login-footer">
        <div class="footer-links">
          <a href="#" class="footer-link">
            <span class="material-symbols-outlined" style="font-size: 14px;">help</span>
            Pusat Bantuan
          </a>
          <a href="#" class="footer-link">
            <span class="material-symbols-outlined" style="font-size: 14px;">shield</span>
            Kebijakan Privasi
          </a>
        </div>
        <div class="system-status">
          <span class="status-dot"></span>
          <span class="status-text">Status Sistem: Beroperasi</span>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Branding */
.branding {
  margin-bottom: 40px;
  text-align: center;
}

.brand-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.brand-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #00355f 0%, #0f4c81 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 53, 95, 0.25);
}

.brand-title {
  font-family: var(--font-headline);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--color-primary);
}

.brand-subtitle {
  font-family: var(--font-body);
  color: var(--color-on-surface-variant);
  margin-top: 8px;
  font-size: 14px;
}

/* Login Card */
.login-card {
  width: 100%;
  background-color: var(--color-surface-container-lowest);
  padding: 0;
  border-radius: 14px;
  box-shadow: 0 24px 40px rgba(25, 28, 30, 0.04);
  position: relative;
  overflow: hidden;
}

.accent-line {
  width: 100%;
  height: 4px;
  background: linear-gradient(135deg, #00355f 0%, #0f4c81 100%);
}

.card-content {
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-header {
  text-align: center;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-on-surface);
}

.card-desc {
  color: var(--color-on-surface-variant);
  font-size: 14px;
  margin-top: 4px;
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}

.forgot-link:hover {
  color: var(--color-primary-container);
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: var(--color-outline);
  pointer-events: none;
}

.login-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  background-color: var(--color-surface-container-highest);
  border: none;
  border-radius: 10px;
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: box-shadow 0.2s;
  box-sizing: border-box;
}

.login-input.has-suffix {
  padding-right: 48px;
}

.login-input:focus {
  box-shadow: 0 0 0 2px rgba(0, 53, 95, 0.15);
}

.login-input::placeholder {
  color: var(--color-outline);
}

.visibility-toggle {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: var(--color-outline);
  cursor: pointer;
  padding: 0;
}

.visibility-toggle:hover {
  color: var(--color-on-surface-variant);
}

.submit-section {
  padding-top: 8px;
}

.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #00355f 0%, #0f4c81 100%);
  color: white;
  font-family: var(--font-headline);
  font-weight: 700;
  font-size: 15px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 53, 95, 0.25);
  transition: opacity 0.2s, transform 0.1s;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.submit-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(0, 53, 95, 0.35);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Footer */
.login-footer {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-outline);
  text-decoration: none;
}

.footer-link:hover {
  color: var(--color-on-surface-variant);
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--color-surface-container-high);
  border-radius: 9999px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-secondary);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

@media (max-width: 480px) {
  .card-content {
    padding: 24px;
  }
  .card-header {
    text-align: center;
  }
}
</style>
