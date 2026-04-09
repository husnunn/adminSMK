<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (v) => ['success', 'error', 'warning', 'active', 'suspended', 'info', 'live'].includes(v)
  },
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
})

const statusConfig = {
  success: { bg: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)', defaultIcon: 'check_circle', defaultLabel: 'SUCCESS' },
  active: { bg: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)', defaultIcon: '', defaultLabel: 'ACTIVE' },
  error: { bg: 'var(--color-error-container)', color: 'var(--color-on-error-container)', defaultIcon: 'error', defaultLabel: 'FAILED' },
  suspended: { bg: 'var(--color-error-container)', color: 'var(--color-on-error-container)', defaultIcon: '', defaultLabel: 'SUSPENDED' },
  warning: { bg: 'var(--color-tertiary-fixed)', color: 'var(--color-tertiary)', defaultIcon: 'warning', defaultLabel: 'WARNING' },
  info: { bg: 'var(--color-primary-fixed)', color: 'var(--color-primary-container)', defaultIcon: 'info', defaultLabel: 'INFO' },
  live: { bg: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed)', defaultIcon: '', defaultLabel: 'LIVE FEED' },
}

const config = computed(() => statusConfig[props.status] || statusConfig.info)
const displayLabel = computed(() => props.label || config.value.defaultLabel)
const displayIcon = computed(() => props.icon || config.value.defaultIcon)
</script>

<template>
  <span
    class="status-badge"
    :style="{
      backgroundColor: config.bg,
      color: config.color,
    }"
  >
    <span
      v-if="displayIcon"
      class="material-symbols-outlined badge-icon"
    >{{ displayIcon }}</span>
    {{ displayLabel }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  white-space: nowrap;
  font-family: var(--font-label);
}

.badge-icon {
  font-size: 14px;
}
</style>
