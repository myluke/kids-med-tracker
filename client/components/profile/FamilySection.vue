<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFamilyStore, setFamily, createFamily, deleteFamily } from '@/stores'
import InviteLinkModal from './InviteLinkModal.vue'
import CreateFamilyModal from './CreateFamilyModal.vue'
import DeleteFamilyModal from './DeleteFamilyModal.vue'

const router = useRouter()
const familyStore = useFamilyStore()
const { t } = useI18n()
const toast = inject('toast')

const showInviteModal = ref(false)
const showFamilyPicker = ref(false)
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const isCreating = ref(false)
const isDeleting = ref(false)

const roleText = computed(() => {
  return familyStore.isOwner
    ? t('views.profile.familySection.roleOwner')
    : t('views.profile.familySection.roleMember')
})

const hasMultipleFamilies = computed(() => familyStore.families.length > 1)

const canCreateFamily = computed(() => familyStore.families.length < 3)

const otherFamilies = computed(() =>
  familyStore.families.filter(f => f.id !== familyStore.currentFamilyId)
)

const switchFamilyHandler = async (familyId) => {
  try {
    await setFamily(familyId)
    showFamilyPicker.value = false
  } catch (e) {
    toast?.(e.message || t('common.error'))
  }
}

const handleCreateFamily = async (name) => {
  if (isCreating.value) return
  isCreating.value = true
  try {
    await createFamily({ name })
    showCreateModal.value = false
    toast?.(t('toast.familyCreated'))
  } catch (e) {
    toast?.(e.message || t('common.error'))
  } finally {
    isCreating.value = false
  }
}

const handleDeleteFamily = async () => {
  if (isDeleting.value) return
  isDeleting.value = true
  try {
    await deleteFamily(familyStore.currentFamilyId)
    showDeleteModal.value = false
    toast?.(t('toast.familyDeleted'))

    if (familyStore.families.length === 0) {
      router.replace({ name: 'no-family' })
    }
  } catch (e) {
    toast?.(e.message || t('common.error'))
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="card">
    <h3 class="font-semibold text-gray-800 mb-4">
      {{ t('views.profile.familySection.title') }}
    </h3>

    <!-- Current family info -->
    <div class="space-y-3 mb-4">
      <div class="flex items-center justify-between">
        <span class="text-gray-500">{{ t('views.profile.familySection.currentFamily') }}</span>
        <span class="text-gray-800 font-medium">{{ familyStore.currentFamilyName || '-' }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-500">{{ t('views.profile.familySection.role') }}</span>
        <span
          class="px-2 py-0.5 rounded text-sm font-medium"
          :class="familyStore.isOwner ? 'bg-dabo-light text-dabo' : 'bg-gray-100 text-gray-600'"
        >
          {{ roleText }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <!-- Invite button (only for owner) -->
      <button
        v-if="familyStore.isOwner"
        class="flex-1 py-3 rounded-xl bg-dabo text-white font-medium hover:bg-dabo/90 transition-colors"
        @click="showInviteModal = true"
      >
        {{ t('views.profile.familySection.invite') }}
      </button>

      <!-- Switch family button (only if multiple families) -->
      <div
        v-if="hasMultipleFamilies"
        class="relative flex-1"
      >
        <button
          class="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
          @click="showFamilyPicker = !showFamilyPicker"
        >
          {{ t('views.profile.familySection.switchFamily') }}
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-180': showFamilyPicker }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <!-- Dropdown -->
        <Transition name="dropdown">
          <div
            v-if="showFamilyPicker"
            class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10"
          >
            <button
              v-for="family in otherFamilies"
              :key="family.id"
              class="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              @click="switchFamilyHandler(family.id)"
            >
              <div class="font-medium text-gray-800">
                {{ family.name }}
              </div>
              <div class="text-xs text-gray-500">
                {{ family.role === 'owner'
                  ? t('views.profile.familySection.roleOwner')
                  : t('views.profile.familySection.roleMember')
                }}
              </div>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Create family button -->
    <button
      v-if="canCreateFamily"
      class="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-600 font-medium hover:border-dabo hover:text-dabo transition-colors mt-3"
      @click="showCreateModal = true"
    >
      + {{ t('views.profile.familySection.createFamily') }}
    </button>

    <!-- Delete family button (only for owner) -->
    <button
      v-if="familyStore.isOwner"
      class="w-full py-3 rounded-xl text-red-500 font-medium hover:bg-red-50 transition-colors text-sm mt-2"
      @click="showDeleteModal = true"
    >
      {{ t('views.profile.familySection.deleteFamily') }}
    </button>

    <!-- Modals -->
    <InviteLinkModal
      :show="showInviteModal"
      @close="showInviteModal = false"
    />
    <CreateFamilyModal
      :show="showCreateModal"
      :loading="isCreating"
      @close="showCreateModal = false"
      @create="handleCreateFamily"
    />
    <DeleteFamilyModal
      :show="showDeleteModal"
      :loading="isDeleting"
      :family-name="familyStore.currentFamilyName"
      @close="showDeleteModal = false"
      @confirm="handleDeleteFamily"
    />
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
