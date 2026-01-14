import { reactive } from 'vue'

export const pullRefreshState = reactive({
  displayDistance: 0,
  state: 'idle' // idle | pulling | ready | refreshing
})
