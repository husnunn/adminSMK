<script setup>
import SideNavBar from './SideNavBar.vue'
import TopAppBar from './TopAppBar.vue'

defineProps({
  pageTitle: {
    type: String,
    default: ''
  },
  searchPlaceholder: {
    type: String,
    default: 'Search...'
  }
})
</script>

<template>
  <div class="admin-layout">
    <SideNavBar />
    <main class="main-content">
      <TopAppBar
        :title="pageTitle"
        :search-placeholder="searchPlaceholder"
      >
        <template #left>
          <slot name="topbar-left" />
        </template>
        <template #actions>
          <slot name="topbar-actions" />
        </template>
      </TopAppBar>
      <div class="page-content">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  margin-left: 256px;
  min-height: 100vh;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  padding: 32px 32px;
  width: 100%;
  min-width: 0;
}
</style>
