<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  linkText: { type: String, default: '' },
  linkHref: { type: String, default: '#' },
  icon: { type: String, default: '' },
  variant: { type: String, default: 'primary' }, // 'primary' | 'dark'
})
</script>

<template>
  <div :class="['info-card', `variant-${variant}`]">
    <div class="info-card-content">
      <h5 class="info-title">{{ title }}</h5>
      <p class="info-desc">{{ description }}</p>
      <a v-if="linkText" :href="linkHref" class="info-link">
        {{ linkText }}
        <span class="material-symbols-outlined" style="font-size: 14px; margin-left: 8px;">arrow_forward</span>
      </a>
      <slot />
    </div>
    <span
      v-if="icon"
      class="material-symbols-outlined info-bg-icon"
    >{{ icon }}</span>
  </div>
</template>

<style scoped>
.info-card {
  border-radius: 12px;
  padding: 32px;
  position: relative;
  overflow: hidden;
}

.info-card.variant-primary {
  background-color: var(--color-primary);
  color: white;
}

.info-card.variant-dark {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%);
  color: white;
}

.info-card-content {
  position: relative;
  z-index: 10;
}

.info-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.info-desc {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 24px;
  line-height: 1.6;
}

.info-link {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  text-decoration: none;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 9999px;
  transition: background-color 0.2s;
}

.info-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.info-bg-icon {
  position: absolute;
  right: -16px;
  bottom: -16px;
  font-size: 128px;
  opacity: 0.1;
  transform: rotate(12deg);
  pointer-events: none;
}
</style>
