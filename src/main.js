import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// 路由配置
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue')
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('./views/StatsView.vue')
    }
  ]
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
