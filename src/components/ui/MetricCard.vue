<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  subtitle: { type: String, default: '' },
  variant: { type: String, default: 'default' }, // 'default' | 'gradient'
  progress: { type: Number, default: null },
  icon: { type: String, default: '' },
})
</script>

<template>
  <div :class="['metric-card', `variant-${variant}`]">
    <div class="metric-header">
      <span class="metric-label">{{ label }}</span>
      <span
        v-if="icon"
        class="material-symbols-outlined metric-icon"
        :style="variant === 'gradient' ? `font-variation-settings: 'FILL' 1; opacity: 0.3; font-size: 40px;` : ''"
      >{{ icon }}</span>
    </div>
    <h3 class="metric-value">{{ value }}</h3>
    <p class="metric-subtitle">{{ subtitle }}</p>

    <!-- Progress bar -->
    <div v-if="progress !== null" class="metric-progress">
      <span class="progress-track">
        <span class="progress-fill" :style="{ width: `${progress}%` }"></span>
      </span>
      <span class="progress-label">{{ progress }}%</span>
    </div>

    <!-- Optional slot for custom footer content (e.g., avatar stack) -->
    <slot name="footer" />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-surface-container-lowest);
  padding: 32px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-card.variant-gradient {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%);
  color: white;
  position: relative;
  overflow: hidden;
}

.metric-card.variant-gradient .metric-label {
  color: rgba(255, 255, 255, 0.7);
}

.metric-card.variant-gradient .metric-value {
  color: white;
}

.metric-card.variant-gradient .metric-subtitle {
  color: rgba(255, 255, 255, 0.8);
}

.metric-card.variant-gradient .metric-icon {
  position: absolute;
  bottom: 16px;
  right: 16px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.metric-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-on-surface-variant);
  margin-bottom: 8px;
  display: block;
}

.metric-value {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1.1;
  letter-spacing: -1px;
}

.metric-subtitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-secondary);
  margin-top: 4px;
}

.metric-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}

.progress-track {
  flex: 1;
  height: 4px;
  background-color: var(--color-surface-container-highest);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  background-color: var(--color-secondary);
  border-radius: 9999px;
  transition: width 0.6s ease;
}

.progress-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
}
</style>
