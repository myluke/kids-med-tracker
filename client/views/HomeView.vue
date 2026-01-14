<script setup>
import { ref, inject, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore, useFamilyStore, useChildrenStore, useRecordsStore, createChild } from '@/stores'
import ChildTabs from '@/components/ChildTabs.vue'
import ChildEditModal from '@/components/profile/ChildEditModal.vue'
import MedTimer from '@/components/MedTimer.vue'
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

// 初始化加载状态
const isInitializing = computed(() => userStore.loading || !userStore.initialized)

// API 请求加载状态
const isLoadingRecords = computed(() => recordsStore.loading)
const promptedForChild = ref(false)
const showAddChildModal = ref(false)

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
    <!-- 初始化骨架屏 -->
    <HomeViewSkeleton v-if="isInitializing" />

    <!-- 正常内容 -->
    <PullToRefresh
      v-else
      @refresh="onRefresh"
    >
      <!-- 记录加载指示器 -->
      <Transition name="fade">
        <div
          v-if="isLoadingRecords"
          class="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-card flex items-center gap-2"
        >
          <svg
            class="animate-spin h-4 w-4 text-dabo"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span class="text-sm text-gray-600">{{ t('loading.text') }}</span>
        </div>
      </Transition>

      <div class="py-6 space-y-5">
        <!-- 孩子切换 -->
        <ChildTabs />

        <!-- 退烧药状态 -->
        <MedTimer />

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
