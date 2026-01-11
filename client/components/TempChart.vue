<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js'
import { useRecordsStore } from '@/stores/records'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
)

const store = useRecordsStore()
const { t, locale } = useI18n()

const currentColor = computed(() => {
  const child = store.children.find(c => c.id === store.currentChild)
  return child?.color || '#4A90D9'
})

const tempData = computed(() => store.getTempData(24))

const chartData = computed(() => {
  if (tempData.value.length === 0) {
    return null
  }

  return {
    labels: tempData.value.map(d => 
      d.time.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [{
      label: t('chart.temp.label'),
      data: tempData.value.map(d => d.value),
      borderColor: currentColor.value,
      backgroundColor: currentColor.value + '20',
      fill: true,
      tension: 0.3,
      pointRadius: 5,
      pointBackgroundColor: tempData.value.map(d => 
        d.value >= 38.5 ? '#EF4444' : currentColor.value
      ),
      pointBorderColor: '#fff',
      pointBorderWidth: 2
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
        label: (context) => `${context.parsed.y}°C`
      }
    }
  },
  scales: {
    y: {
      min: 36,
      max: 41,
      ticks: {
        callback: (value) => value + '°',
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
  },
  elements: {
    line: {
      borderWidth: 2
    }
  }
}

// 38.5° 警戒线插件
const warningLinePlugin = {
  id: 'warningLine',
  beforeDraw: (chart) => {
    const ctx = chart.ctx
    const yAxis = chart.scales.y
    const xAxis = chart.scales.x
    const y = yAxis.getPixelForValue(38.5)

    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = '#FCA5A5'
    ctx.lineWidth = 1
    ctx.moveTo(xAxis.left, y)
    ctx.lineTo(xAxis.right, y)
    ctx.stroke()
    ctx.restore()
  }
}
</script>

<template>
  <div class="h-48">
    <div
      v-if="!chartData"
      class="h-full flex items-center justify-center text-gray-400"
    >
      {{ t('chart.temp.empty') }}
    </div>
    <Line 
      v-else
      :data="chartData" 
      :options="chartOptions"
      :plugins="[warningLinePlugin]"
    />
  </div>
</template>
