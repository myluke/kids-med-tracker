<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore, useEpisodesStore, useChildrenStore } from '@/stores'
import { storeToRefs } from 'pinia'
import ChildTabs from '@/components/ChildTabs.vue'
import TempChart from '@/components/TempChart.vue'
import CoughChart from '@/components/CoughChart.vue'
import PullToRefresh from '@/components/PullToRefresh.vue'

const recordsStore = useRecordsStore()
const episodesStore = useEpisodesStore()
const childrenStore = useChildrenStore()
const { currentChild } = storeToRefs(childrenStore)
const { t, d } = useI18n()

// 选中的病程 ID（null 表示全部记录）
const selectedEpisodeId = ref(null)

// 当前孩子的所有病程列表
const episodes = computed(() => {
  if (!currentChild.value) return []
  return episodesStore.episodesByChild[currentChild.value] || []
})

// 病程选项列表
const episodeOptions = computed(() => {
  const options = [
    { id: null, label: t('stats.allRecords') }
  ]

  episodes.value.forEach(ep => {
    const start = d(new Date(ep.startedAt), 'short')
    const end = ep.endedAt ? d(new Date(ep.endedAt), 'short') : t('stats.ongoing')
    const isActive = ep.status === 'active'
    const label = isActive
      ? `${t('stats.currentEpisode')} (${start}-${end})`
      : `${start} - ${end}`
    options.push({ id: ep.id, label })
  })

  return options
})

// 监听孩子切换，加载病程列表并重置选择
watch(currentChild, async (childId) => {
  selectedEpisodeId.value = null
  if (childId) {
    await episodesStore.loadHistoryEpisodes(childId)
    // 默认选中当前病程
    const active = episodesStore.activeEpisode
    if (active) {
      selectedEpisodeId.value = active.id
    }
  }
}, { immediate: true })

const recoveryStats = computed(() => recordsStore.getRecoveryStats(selectedEpisodeId.value))

// 下拉刷新
const onRefresh = async (done) => {
  try {
    await Promise.all([
      recordsStore.refreshCurrentChildRecords(),
      currentChild.value ? episodesStore.loadHistoryEpisodes(currentChild.value) : Promise.resolve()
    ])
  } finally {
    done()
  }
}
</script>

<template>
  <PullToRefresh @refresh="onRefresh">
    <div class="py-6 space-y-5">
      <!-- 孩子切换 -->
      <ChildTabs />

      <!-- 病程选择器 -->
      <div
        v-if="episodeOptions.length > 1"
        class="card py-3"
      >
        <div class="flex items-center gap-3">
          <span class="text-gray-600 text-sm">{{ t('stats.selectEpisode') }}</span>
          <select
            v-model="selectedEpisodeId"
            class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-dabo/50"
          >
            <option
              v-for="option in episodeOptions"
              :key="option.id ?? 'all'"
              :value="option.id"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- 体温趋势 -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-gray-800">
            {{ selectedEpisodeId ? t('stats.tempTrend') : t('stats.tempTrend24h') }}
          </h3>
        </div>
        <TempChart :episode-id="selectedEpisodeId" />
      </div>

      <!-- 咳嗽频次 -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-gray-800">
            {{ selectedEpisodeId ? t('stats.coughTrend') : t('stats.coughTrend3d') }}
          </h3>
        </div>
        <CoughChart :episode-id="selectedEpisodeId" />
      </div>

      <!-- 康复统计 -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-gray-800">
            {{ t('stats.recovery') }}
          </h3>
        </div>
        <div class="space-y-2 text-gray-600">
          <p>
            {{ t('stats.totalDays') }}：<strong class="text-gray-800">{{ recoveryStats.totalDays }}</strong> {{ t('stats.dayUnit') }}
          </p>
          <p>
            {{ t('stats.totalMeds') }}：<strong class="text-gray-800">{{ recoveryStats.totalMeds }}</strong> {{ t('stats.timesUnit') }}
          </p>
          <p>
            {{ t('stats.avgCough') }}：<strong class="text-gray-800">{{ recoveryStats.avgCough }}</strong> {{ t('stats.timesUnit') }}
          </p>
        </div>
      </div>
    </div>
  </PullToRefresh>
</template>
