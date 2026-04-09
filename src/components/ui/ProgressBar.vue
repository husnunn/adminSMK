<script setup>
defineProps({
  percentage: { type: Number, required: true },
  color: { type: String, default: 'var(--color-primary)' },
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  iconBg: { type: String, default: '' },
  iconColor: { type: String, default: '' },
})
</script>

<template>
  <div class="progress-item">
    <div v-if="icon" class="progress-icon-wrapper" :style="{ backgroundColor: iconBg }">
      <span class="material-symbols-outlined" :style="{ color: iconColor }">{{ icon }}</span>
    </div>
    <div class="progress-content">
      <div class="progress-header">
        <span class="progress-label">{{ label }}</span>
        <span class="progress-value">{{ percentage }}%</span>
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: `${percentage}%`, backgroundColor: color }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.progress-content {
  flex: 1;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.progress-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-on-surface);
}

.progress-value {
  font-size: 12px;
  color: var(--color-on-surface-variant);
}

.progress-track {
  height: 8px;
  background-color: var(--color-surface-container);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.8s ease;
}
</style>
