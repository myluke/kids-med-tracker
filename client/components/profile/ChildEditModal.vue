<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  show: Boolean,
  child: Object // null for create, object for edit
})

const emit = defineEmits(['close', 'save'])

const { t } = useI18n()

const presetEmojis = ['👶', '👦', '👧', '🧒', '👼', '🐻', '🐰', '🦊']
const presetColors = ['#8B9DD9', '#F5A5A5', '#7DD3C0', '#FFB366', '#A78BFA', '#60A5FA']

const form = ref({
  name: '',
  emoji: '👶',
  color: '#8B9DD9',
  gender: 'boy',
  age: ''
})

const isEdit = computed(() => !!props.child?.id)

const title = computed(() =>
  isEdit.value
    ? t('views.profile.childrenSection.editChild')
    : t('views.profile.childrenSection.addChild')
)

watch(() => props.show, (val) => {
  if (val) {
    if (props.child) {
      form.value = {
        name: props.child.name || '',
        emoji: props.child.emoji || '👶',
        color: props.child.color || '#8B9DD9',
        gender: props.child.gender || 'boy',
        age: props.child.age || ''
      }
    } else {
      form.value = {
        name: '',
        emoji: '👶',
        color: '#8B9DD9',
        gender: 'boy',
        age: ''
      }
    }
  }
})

const saving = ref(false)

const handleSave = async () => {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    emit('save', {
      childId: props.child?.id,
      ...form.value
    })
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <div class="absolute inset-0 bg-black/50" />
        <div class="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-lg font-semibold text-gray-800">
              {{ title }}
            </h3>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
              @click="handleClose"
            >
              <span class="text-xl">&times;</span>
            </button>
          </div>

          <!-- Form -->
          <div class="space-y-5">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-2">
                {{ t('views.profile.childrenSection.childName') }}
              </label>
              <input
                v-model="form.name"
                type="text"
                :placeholder="t('views.profile.childrenSection.childNamePlaceholder')"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dabo/30 focus:border-dabo"
              >
            </div>

            <!-- Gender -->
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-2">
                {{ t('views.profile.childrenSection.childGender') }}
              </label>
              <div class="flex gap-3">
                <button
                  type="button"
                  class="flex-1 py-3 rounded-xl border-2 transition-all"
                  :class="form.gender === 'boy' ? 'border-dabo bg-dabo-light' : 'border-gray-200'"
                  @click="form.gender = 'boy'"
                >
                  {{ t('child.boy') }}
                </button>
                <button
                  type="button"
                  class="flex-1 py-3 rounded-xl border-2 transition-all"
                  :class="form.gender === 'girl' ? 'border-erbao bg-erbao-light' : 'border-gray-200'"
                  @click="form.gender = 'girl'"
                >
                  {{ t('child.girl') }}
                </button>
              </div>
            </div>

            <!-- Age -->
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-2">
                {{ t('views.profile.childrenSection.childAge') }}
              </label>
              <input
                v-model="form.age"
                type="text"
                :placeholder="t('views.profile.childrenSection.childAgePlaceholder')"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dabo/30 focus:border-dabo"
              >
            </div>

            <!-- Emoji -->
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-2">
                {{ t('views.profile.childrenSection.childEmoji') }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="emoji in presetEmojis"
                  :key="emoji"
                  type="button"
                  class="w-11 h-11 text-xl rounded-xl border-2 transition-all"
                  :class="form.emoji === emoji ? 'border-dabo bg-dabo-light' : 'border-gray-200 hover:border-gray-300'"
                  @click="form.emoji = emoji"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>

            <!-- Color -->
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-2">
                {{ t('views.profile.childrenSection.childColor') }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  type="button"
                  class="w-11 h-11 rounded-xl border-2 transition-all"
                  :class="form.color === color ? 'border-gray-800 ring-2 ring-offset-2' : 'border-transparent'"
                  :style="{ backgroundColor: color, ringColor: color }"
                  @click="form.color = color"
                />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 mt-6">
            <button
              class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              @click="handleClose"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="flex-1 py-3 rounded-xl bg-dabo text-white font-medium hover:bg-dabo/90 transition-colors disabled:opacity-50"
              :disabled="!form.name.trim() || saving"
              @click="handleSave"
            >
              {{ saving ? t('common.working') : t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
