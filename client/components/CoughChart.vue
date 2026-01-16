<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { storeToRefs } from 'pinia'
import { useChildrenStore, useRecordsStore } from '@/stores'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  episodeId: {
    type: String,
    default: null
  }
})

const childrenStore = useChildrenStore()
const { currentChildColor: currentColor } = storeToRefs(childrenStore)
const recordsStore = useRecordsStore()
const { t } = useI18n()

const coughData = computed(() => recordsStore.getCoughData(3, t, props.episodeId))

const chartData = computed(() => {
  return {
    labels: coughData.value.map(d => d.label),
    datasets: [{
      label: t('chart.cough.label'),
      data: coughData.value.map(d => d.count),
      backgroundColor: currentColor.value,
      borderRadius: 6,
      barThickness: 40
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context) => t('chart.cough.times', { count: context.parsed.y })
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1
      },
      grid: {
        color: '#E5E7EB'
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}
</script>

<template>
  <div class="h-48">
    <Bar
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>
