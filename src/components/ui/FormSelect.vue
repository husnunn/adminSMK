<script setup>
defineProps({
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }, // [{ value, label }] or ['label1', 'label2']
  placeholder: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="form-select-wrapper">
    <label v-if="label" class="select-label">{{ label }}</label>
    <div class="select-container">
      <select
        class="form-select"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="(opt, i) in options"
          :key="i"
          :value="typeof opt === 'object' ? opt.value : opt"
        >
          {{ typeof opt === 'object' ? opt.label : opt }}
        </option>
      </select>
      <span class="material-symbols-outlined select-arrow">expand_more</span>
    </div>
  </div>
</template>

<style scoped>
.form-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.select-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-on-surface-variant);
  font-family: var(--font-label);
}

.select-container {
  position: relative;
}

.form-select {
  appearance: none;
  width: 100%;
  background-color: var(--color-surface-container-high);
  border: none;
  border-radius: 10px;
  padding: 10px 40px 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-on-surface);
  font-family: var(--font-body);
  outline: none;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.form-select:focus {
  box-shadow: 0 0 0 2px rgba(0, 53, 95, 0.15);
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #94a3b8;
  pointer-events: none;
}
</style>
