<script setup>
import { computed } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  showPagination: { type: Boolean, default: true },
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  totalItems: { type: Number, default: 0 },
  pageSize: { type: Number, default: 10 },
})

const emit = defineEmits(['page-change'])

const showingText = computed(() => {
  return `Menampilkan ${props.pageSize} dari ${props.totalItems.toLocaleString()} Data`
})

const pages = computed(() => {
  const p = []
  if (props.totalPages <= 5) {
    for (let i = 1; i <= props.totalPages; i++) p.push(i)
  } else {
    p.push(1, 2, 3)
    if (props.totalPages > 4) p.push('...')
    p.push(props.totalPages)
  }
  return p
})
</script>

<template>
  <div class="data-table-container">
    <!-- Table Controls Slot -->
    <div v-if="$slots.controls" class="table-controls">
      <slot name="controls" />
      <p class="showing-text">{{ showingText }}</p>
    </div>

    <!-- Table -->
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="{ 'text-right': col.align === 'right' }"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="index"
            class="table-row"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="{ 'text-right': col.align === 'right' }"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="showPagination" class="pagination">
      <button
        class="page-nav"
        :disabled="currentPage <= 1"
        @click="emit('page-change', currentPage - 1)"
      >
        <span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>
        Sebelumnya
      </button>

      <div class="page-numbers">
        <template v-for="page in pages" :key="page">
          <button
            v-if="page !== '...'"
            :class="['page-btn', { active: page === currentPage }]"
            @click="emit('page-change', page)"
          >
            {{ page }}
          </button>
          <span v-else class="page-dots">...</span>
        </template>
      </div>

      <button
        class="page-nav"
        :disabled="currentPage >= totalPages"
        @click="emit('page-change', currentPage + 1)"
      >
        Selanjutnya
        <span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.data-table-container {
  background-color: var(--color-surface-container-lowest);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  border: 1px solid rgba(194, 199, 209, 0.1);
}

.table-controls {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(242, 244, 246, 0.5);
}

.showing-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.data-table thead tr {
  background-color: rgba(242, 244, 246, 0.3);
}

.data-table th {
  padding: 16px 24px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: var(--font-label);
}

.data-table td {
  padding: 16px 24px;
}

.data-table tbody tr {
  border-top: 1px solid rgba(194, 199, 209, 0.1);
  transition: background-color 0.15s;
}

.data-table tbody tr:hover {
  background-color: rgba(242, 244, 246, 0.4);
}

.text-right {
  text-align: right;
}

/* Pagination */
.pagination {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(194, 199, 209, 0.1);
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  font-family: var(--font-body);
}

.page-nav:hover:not(:disabled) {
  color: var(--color-primary);
}

.page-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-on-surface-variant);
  cursor: pointer;
  font-family: var(--font-body);
}

.page-btn:hover {
  background-color: var(--color-surface-container-high);
}

.page-btn.active {
  background-color: var(--color-primary);
  color: white;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.page-dots {
  padding: 0 8px;
  color: var(--color-on-surface-variant);
}
</style>
