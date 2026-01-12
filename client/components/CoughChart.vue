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
import { useRecordsStore } from '@/stores/records'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
)

const store = useRecordsStore()
const { t } = useI18n()

const currentColor = computed(() => {
  const child = store.children.find(c => c.id === store.currentChild)
  return child?.color || '#8B9DD9'
})

const coughData = computed(() => store.getCoughData(3, t))

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
