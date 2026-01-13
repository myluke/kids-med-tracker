<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore, useFamilyStore, useChildrenStore } from '@/stores'
import ChildTabs from '@/components/ChildTabs.vue'
import TempChart from '@/components/TempChart.vue'
import CoughChart from '@/components/CoughChart.vue'
import PullToRefresh from '@/components/PullToRefresh.vue'

const recordsStore = useRecordsStore()
const familyStore = useFamilyStore()
const childrenStore = useChildrenStore()
const { t } = useI18n()

const recoveryStats = computed(() => recordsStore.getRecoveryStats())

// 下拉刷新
const onRefresh = async (done) => {
  try {
    if (familyStore.currentFamilyId && childrenStore.currentChild) {
      await recordsStore.loadRecords({
        familyId: familyStore.currentFamilyId,
        childId: childrenStore.currentChild
      })
    }
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

      <!-- 体温趋势 -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-gray-800">
            {{ t('stats.tempTrend24h') }}
          </h3>
        </div>
        <TempChart />
      </div>

      <!-- 咳嗽频次 -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-gray-800">
            {{ t('stats.coughTrend3d') }}
          </h3>
        </div>
        <CoughChart />
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
