<script setup>
import { computed } from 'vue'
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
import { useRecordsStore, children } from '@/stores/records'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
)

const store = useRecordsStore()

const currentColor = computed(() => {
  const child = children.find(c => c.id === store.currentChild)
  return child?.color || '#4A90D9'
})

const coughData = computed(() => store.getCoughData(3))

const chartData = computed(() => {
  return {
    labels: coughData.value.map(d => d.label),
    datasets: [{
      label: '咳嗽次数',
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
        label: (context) => `${context.parsed.y} 次`
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
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
