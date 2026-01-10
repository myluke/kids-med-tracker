<script setup>
import { computed } from 'vue'
import { useRecordsStore } from '@/stores/records'
import ChildTabs from '@/components/ChildTabs.vue'
import TempChart from '@/components/TempChart.vue'
import CoughChart from '@/components/CoughChart.vue'

const store = useRecordsStore()

const recoveryStats = computed(() => store.getRecoveryStats())
</script>

<template>
  <div class="py-6 space-y-5">
    <!-- 孩子切换 -->
    <ChildTabs />

    <!-- 体温趋势 -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-semibold text-gray-800">🌡️ 体温趋势（近24小时）</h3>
      </div>
      <TempChart />
    </div>

    <!-- 咳嗽频次 -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-semibold text-gray-800">🫁 咳嗽频次（近3天）</h3>
      </div>
      <CoughChart />
    </div>

    <!-- 康复统计 -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-semibold text-gray-800">📊 康复统计</h3>
      </div>
      <div class="space-y-2 text-gray-600">
        <p>
          记录天数：<strong class="text-gray-800">{{ recoveryStats.totalDays }}</strong> 天
        </p>
        <p>
          总用药次数：<strong class="text-gray-800">{{ recoveryStats.totalMeds }}</strong> 次
        </p>
        <p>
          平均每日咳嗽：<strong class="text-gray-800">{{ recoveryStats.avgCough }}</strong> 次
        </p>
      </div>
    </div>
  </div>
</template>
