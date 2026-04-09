<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
    // Each item: { icon, bgColor, textColor, title, description, time }
  }
})
</script>

<template>
  <div class="timeline">
    <!-- Connecting line -->
    <div class="timeline-line"></div>

    <div
      v-for="(item, index) in items"
      :key="index"
      class="timeline-item"
    >
      <div
        class="timeline-dot"
        :style="{
          backgroundColor: item.bgColor || 'var(--color-secondary)',
          color: item.textColor || 'white'
        }"
      >
        <span class="material-symbols-outlined" style="font-size: 14px;">{{ item.icon }}</span>
      </div>
      <div class="timeline-content">
        <p class="timeline-title">{{ item.title }}</p>
        <p class="timeline-desc">{{ item.description }}</p>
        <span class="timeline-time">{{ item.time }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  background-color: var(--color-surface-container-low);
  padding: 24px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  overflow: hidden;
}

.timeline-line {
  position: absolute;
  left: 35px;
  top: 56px;
  bottom: 56px;
  width: 2px;
  background-color: var(--color-outline-variant);
  opacity: 0.3;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 10;
}

.timeline-content {
  flex: 1;
}

.timeline-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-on-surface);
}

.timeline-desc {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  margin-top: 4px;
}

.timeline-time {
  display: block;
  font-size: 10px;
  color: rgba(66, 71, 79, 0.6);
  font-weight: 700;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
