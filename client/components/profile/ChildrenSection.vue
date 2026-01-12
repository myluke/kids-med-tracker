<script setup>
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChildrenStore, useFamilyStore, createChild, updateChild, deleteChild } from '@/stores'
import ChildEditModal from './ChildEditModal.vue'

const childrenStore = useChildrenStore()
const familyStore = useFamilyStore()
const { t } = useI18n()
const toast = inject('toast')

const showModal = ref(false)
const editingChild = ref(null)

const openAddModal = () => {
  editingChild.value = null
  showModal.value = true
}

const openEditModal = (child) => {
  editingChild.value = child
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingChild.value = null
}

const handleSave = async (data) => {
  try {
    if (data.childId) {
      await updateChild(data)
      toast?.(t('toast.childUpdated'))
    } else {
      await createChild(data)
      toast?.(t('toast.childAdded', { name: data.name }))
    }
    closeModal()
  } catch (e) {
    toast?.(e.message || t('common.error'))
  }
}

const handleDelete = async (child) => {
  const confirmed = confirm(t('views.profile.childrenSection.deleteConfirm', { name: child.name }))
  if (!confirmed) return

  try {
    await deleteChild(child.id)
    toast?.(t('toast.childDeleted'))
  } catch (e) {
    toast?.(e.message || t('common.error'))
  }
}
</script>

<template>
  <div class="card">
    <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <span>{{ t('views.profile.childrenSection.title') }}</span>
    </h3>

    <!-- Children list -->
    <div
      v-if="childrenStore.children.length > 0"
      class="space-y-3"
    >
      <div
        v-for="child in childrenStore.children"
        :key="child.id"
        class="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
      >
        <!-- Avatar -->
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          :style="{ backgroundColor: child.color || '#8B9DD9' }"
        >
          {{ child.emoji || '👶' }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-800 truncate">
            {{ child.name }}
          </div>
          <div class="text-sm text-gray-500">
            <template v-if="child.age">
              {{ child.age }}
            </template>
            <template v-if="child.age && child.gender">
              ·
            </template>
            <template v-if="child.gender">
              {{ child.gender === 'boy' ? t('child.boy') : t('child.girl') }}
            </template>
            <template v-if="!child.age && !child.gender">
              {{ t('common.notFilled') }}
            </template>
          </div>
        </div>

        <!-- Actions (only for owner) -->
        <div
          v-if="familyStore.isOwner"
          class="flex items-center gap-1"
        >
          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
            :title="t('views.profile.childrenSection.editChild')"
            @click="openEditModal(child)"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
            :title="t('views.profile.childrenSection.deleteChild')"
            @click="handleDelete(child)"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-6 text-gray-400"
    >
      {{ t('views.profile.childrenSection.empty') }}
    </div>

    <!-- Add button (only for owner) -->
    <button
      v-if="familyStore.isOwner"
      class="w-full mt-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-dabo hover:text-dabo transition-colors"
      @click="openAddModal"
    >
      + {{ t('views.profile.childrenSection.addChild') }}
    </button>

    <!-- Edit modal -->
    <ChildEditModal
      :show="showModal"
      :child="editingChild"
      @close="closeModal"
      @save="handleSave"
    />
  </div>
</template>
