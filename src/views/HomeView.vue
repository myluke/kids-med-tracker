<script setup>
import { ref, inject } from 'vue'
import { useRecordsStore, children, medications } from '@/stores/records'
import ChildTabs from '@/components/ChildTabs.vue'
import MedTimer from '@/components/MedTimer.vue'
import QuickActions from '@/components/QuickActions.vue'
import MedPanel from '@/components/MedPanel.vue'
import CoughPanel from '@/components/CoughPanel.vue'
import TempPanel from '@/components/TempPanel.vue'
import TodayStats from '@/components/TodayStats.vue'
import HistoryList from '@/components/HistoryList.vue'

const store = useRecordsStore()
const toast = inject('toast')

// 面板显示状态
const showMedPanel = ref(false)
const showCoughPanel = ref(false)
const showTempPanel = ref(false)

// 关闭所有面板
const closeAllPanels = () => {
  showMedPanel.value = false
  showCoughPanel.value = false
  showTempPanel.value = false
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
  const note = prompt('快速备注：')
  if (note && note.trim()) {
    store.addNote(note.trim())
    toast('✓ 已添加备注')
  }
}

// 提交用药
const submitMed = ({ drug, dosage, temp }) => {
  store.addMedRecord(drug, dosage, temp)
  showMedPanel.value = false
  toast(`✓ 已记录 ${drug}`)
}

// 提交咳嗽
const submitCough = ({ level, note }) => {
  store.addCoughRecord(level, note)
  showCoughPanel.value = false
  toast(`✓ 已记录咳嗽 - ${level}`)
}

// 提交体温
const submitTemp = (value) => {
  store.addTempRecord(value)
  showTempPanel.value = false
  toast(`✓ 已记录体温 ${value}°`)
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

    <!-- 用药面板 -->
    <MedPanel 
      v-if="showMedPanel"
      @close="showMedPanel = false"
      @submit="submitMed"
    />

    <!-- 咳嗽面板 -->
    <CoughPanel
      v-if="showCoughPanel"
      @close="showCoughPanel = false"
      @submit="submitCough"
    />

    <!-- 体温面板 -->
    <TempPanel
      v-if="showTempPanel"
      @close="showTempPanel = false"
      @submit="submitTemp"
    />

    <!-- 今日统计 -->
    <TodayStats />

    <!-- 历史记录 -->
    <HistoryList />
  </div>
</template>
