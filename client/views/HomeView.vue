<script setup>
import { ref, inject, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore, useFamilyStore, useChildrenStore, useRecordsStore, createChild } from '@/stores'
import ChildTabs from '@/components/ChildTabs.vue'
import MedTimer from '@/components/MedTimer.vue'
import QuickActions from '@/components/QuickActions.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import MedPanel from '@/components/MedPanel.vue'
import CoughPanel from '@/components/CoughPanel.vue'
import TempPanel from '@/components/TempPanel.vue'
import NotePanel from '@/components/NotePanel.vue'
import TodayStats from '@/components/TodayStats.vue'
import HistoryList from '@/components/HistoryList.vue'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()
const toast = inject('toast')
const { t } = useI18n()
const router = useRouter()

const hasFamilies = computed(() => (familyStore.families?.length || 0) > 0)
const promptedForChild = ref(false)

watchEffect(() => {
  if (userStore.loading) return
  if (!userStore.user) return
  if (!hasFamilies.value) router.replace({ name: 'no-family' })
})

watchEffect(() => {
  if (userStore.loading) return
  if (!userStore.user) return
  if (!hasFamilies.value) return
  if (!familyStore.isOwner) return
  if (childrenStore.children?.length > 0) return
  if (promptedForChild.value) return

  promptedForChild.value = true

  const name = prompt(t('prompt.childName'))
  if (!name || !name.trim()) return

  createChild({
    name: name.trim(),
    emoji: '👶',
    color: '#8B9DD9'
  }).then(() => {
    if (toast) toast(t('toast.childAdded', { name: name.trim() }))
  }).catch(() => null)
})

// 面板显示状态
const showMedPanel = ref(false)
const showCoughPanel = ref(false)
const showTempPanel = ref(false)
const showNotePanel = ref(false)

// 关闭所有面板
const closeAllPanels = () => {
  showMedPanel.value = false
  showCoughPanel.value = false
  showTempPanel.value = false
  showNotePanel.value = false
}

// 打开面板
const openMedPanel = () => {
  closeAllPanels()
  showMedPanel.value = true
}
const openCoughPanel = () => {
  closeAllPanels()
  showCoughPanel.value = true
}
const openTempPanel = () => {
  closeAllPanels()
  showTempPanel.value = true
}

// 快速备注
const quickNote = () => {
  closeAllPanels()
  showNotePanel.value = true
}

// 提交备注
const submitNote = (note) => {
  recordsStore.addNote(note)
  showNotePanel.value = false
  toast(t('toast.noteAdded'))
}

// 提交用药
const submitMed = ({ drug, dosage, temp }) => {
  recordsStore.addMedRecord(drug, dosage, temp)
  showMedPanel.value = false
  toast(t('toast.medRecorded', { drug }))
}

// 提交咳嗽
const submitCough = ({ level, note }) => {
  recordsStore.addCoughRecord(level, note)
  showCoughPanel.value = false
  toast(t('toast.coughRecorded', { level }))
}

// 提交体温
const submitTemp = (value) => {
  recordsStore.addTempRecord(value)
  showTempPanel.value = false
  toast(t('toast.tempRecorded', { value }))
}
</script>

<template>
  <div class="py-6 space-y-5">
    <!-- 孩子切换 -->
    <ChildTabs />

    <!-- 退烧药状态 -->
    <MedTimer />

    <!-- 快速操作 -->
    <QuickActions
      @open-med="openMedPanel"
      @open-cough="openCoughPanel"
      @open-temp="openTempPanel"
      @quick-note="quickNote"
    />

    <!-- 今日统计 -->
    <TodayStats />

    <!-- 历史记录 -->
    <HistoryList />
  </div>

  <!-- 用药弹层 -->
  <BottomSheet
    :show="showMedPanel"
    @close="showMedPanel = false"
  >
    <MedPanel
      @close="showMedPanel = false"
      @submit="submitMed"
    />
  </BottomSheet>

  <!-- 咳嗽弹层 -->
  <BottomSheet
    :show="showCoughPanel"
    @close="showCoughPanel = false"
  >
    <CoughPanel
      @close="showCoughPanel = false"
      @submit="submitCough"
    />
  </BottomSheet>

  <!-- 体温弹层 -->
  <BottomSheet
    :show="showTempPanel"
    @close="showTempPanel = false"
  >
    <TempPanel
      @close="showTempPanel = false"
      @submit="submitTemp"
    />
  </BottomSheet>

  <!-- 备注弹层 -->
  <BottomSheet
    :show="showNotePanel"
    @close="showNotePanel = false"
  >
    <NotePanel
      @close="showNotePanel = false"
      @submit="submitNote"
    />
  </BottomSheet>
</template>
