<script setup>
defineProps({
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
  monospace: { type: Boolean, default: false },
  infoTooltip: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="form-input-wrapper">
    <div v-if="label" class="label-row">
      <label class="input-label">{{ label }}</label>
      <div v-if="infoTooltip" class="tooltip-trigger">
        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-outline);">info</span>
        <div class="tooltip-content">{{ infoTooltip }}</div>
      </div>
    </div>
    <div class="input-container">
      <div v-if="icon" class="input-icon">
        <span class="material-symbols-outlined" style="font-size: 18px;">{{ icon }}</span>
      </div>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :class="['form-input', { 'has-icon': icon, 'mono': monospace }]"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <slot name="suffix" />
    </div>
  </div>
</template>

<style scoped>
.form-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 4px;
}

.input-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-family: var(--font-label);
}

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
  width: 200px;
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

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  display: flex;
  align-items: center;
  color: var(--color-outline);
  pointer-events: none;
  z-index: 1;
}

.form-input {
  width: 100%;
  background-color: var(--color-surface-container-low);
  border: none;
  border-radius: 10px;
  padding: 16px;
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition: box-shadow 0.2s;
}

.form-input:focus {
  box-shadow: 0 0 0 2px rgba(0, 53, 95, 0.15);
}

.form-input.has-icon {
  padding-left: 44px;
}

.form-input.mono {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
  font-size: 13px;
}

.form-input::placeholder {
  color: var(--color-outline);
}

/* Time input special sizing */
.form-input[type="time"] {
  font-weight: 700;
}
</style>
