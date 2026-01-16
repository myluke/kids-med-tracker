<script setup>
import { ref, inject, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore, useFamilyStore, useChildrenStore, useRecordsStore, createChild } from '@/stores'
import ChildTabs from '@/components/ChildTabs.vue'
import ChildEditModal from '@/components/profile/ChildEditModal.vue'
import MedTimer from '@/components/MedTimer.vue'
import EpisodeBanner from '@/components/EpisodeBanner.vue'
import QuickActions from '@/components/QuickActions.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import MedPanel from '@/components/MedPanel.vue'
import CoughPanel from '@/components/CoughPanel.vue'
import TempPanel from '@/components/TempPanel.vue'
import NotePanel from '@/components/NotePanel.vue'
import TodayStats from '@/components/TodayStats.vue'
import HistoryList from '@/components/HistoryList.vue'
import PullToRefresh from '@/components/PullToRefresh.vue'
import HomeViewSkeleton from '@/components/skeleton/HomeViewSkeleton.vue'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const childrenStore = useChildrenStore()
const recordsStore = useRecordsStore()
const toast = inject('toast')
const { t } = useI18n()
const router = useRouter()

const hasFamilies = computed(() => (familyStore.families?.length || 0) > 0)

// 骨架屏显示条件
const showSkeleton = computed(() => {
  // 初始化阶段
  if (userStore.loading || !userStore.initialized) return true
  // children 加载中
  if (childrenStore.loading) return true
  // records 加载中（首次加载，没有缓存数据）
  if (recordsStore.loading && childrenStore.children.length > 0) return true
  return false
})
const promptedForChild = ref(false)
const showAddChildModal = ref(false)

watchEffect(() => {
  if (userStore.loading) return
  if (!userStore.user) {
    router.replace({ name: 'login' })
    return
  }
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
  showAddChildModal.value = true
})

const handleAddChildSave = async (data) => {
  try {
    await createChild({
      name: data.name,
      emoji: data.emoji,
      color: data.color,
      gender: data.gender,
      age: data.age
    })
    showAddChildModal.value = false
    if (toast) toast(t('toast.childAdded', { name: data.name }))
  } catch {
    // 错误由 store 处理
  }
}

// 面板显示状态: 'med' | 'cough' | 'temp' | 'note' | null
const activePanel = ref(null)
const closePanel = () => { activePanel.value = null }

// 提交备注
const submitNote = (note) => {
  recordsStore.addNote(note)
  closePanel()
  toast(t('toast.noteAdded'))
}

// 提交用药
const submitMed = ({ drug, dosage, temp }) => {
  recordsStore.addMedRecord(drug, dosage, temp)
  closePanel()
  toast(t('toast.medRecorded', { drug }))
}

// 提交咳嗽
const submitCough = ({ level, note }) => {
  recordsStore.addCoughRecord(level, note)
  closePanel()
  toast(t('toast.coughRecorded', { level }))
}

// 提交体温
const submitTemp = (value) => {
  recordsStore.addTempRecord(value)
  closePanel()
  toast(t('toast.tempRecorded', { value }))
}

// 下拉刷新
const onRefresh = async (done) => {
  try {
    await recordsStore.refreshCurrentChildRecords()
  } finally {
    done()
  }
}
</script>

<template>
  <div>
    <!-- 骨架屏 -->
    <HomeViewSkeleton v-if="showSkeleton" />

    <!-- 正常内容 -->
    <PullToRefresh
      v-else
      @refresh="onRefresh"
    >
      <div class="py-6 space-y-5">
        <!-- 孩子切换 -->
        <ChildTabs />

        <!-- 退烧药状态 -->
        <MedTimer />

        <!-- 病程状态 -->
        <EpisodeBanner />

        <!-- 快速操作 -->
        <QuickActions
          @open-med="activePanel = 'med'"
          @open-cough="activePanel = 'cough'"
          @open-temp="activePanel = 'temp'"
          @quick-note="activePanel = 'note'"
        />

        <!-- 今日统计 -->
        <TodayStats />

        <!-- 历史记录 -->
        <HistoryList />
      </div>
    </PullToRefresh>

    <!-- 用药弹层 -->
    <BottomSheet
      :show="activePanel === 'med'"
      @close="closePanel"
    >
      <MedPanel
        @close="closePanel"
        @submit="submitMed"
      />
    </BottomSheet>

    <!-- 咳嗽弹层 -->
    <BottomSheet
      :show="activePanel === 'cough'"
      @close="closePanel"
    >
      <CoughPanel
        @close="closePanel"
        @submit="submitCough"
      />
    </BottomSheet>

    <!-- 体温弹层 -->
    <BottomSheet
      :show="activePanel === 'temp'"
      @close="closePanel"
    >
      <TempPanel
        @close="closePanel"
        @submit="submitTemp"
      />
    </BottomSheet>

    <!-- 备注弹层 -->
    <BottomSheet
      :show="activePanel === 'note'"
      @close="closePanel"
    >
      <NotePanel
        @close="closePanel"
        @submit="submitNote"
      />
    </BottomSheet>

    <!-- 添加宝贝弹窗 -->
    <ChildEditModal
      :show="showAddChildModal"
      :child="null"
      @close="showAddChildModal = false"
      @save="handleAddChildSave"
    />
  </div>
</template>
