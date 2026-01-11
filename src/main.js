import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
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
    },
    {
      path: '/no-family',
      name: 'no-family',
      component: () => import('./views/NoFamilyView.vue')
    },
    {
      path: '/invite/:token',
      name: 'invite',
      component: () => import('./views/InviteView.vue')
    }
  ]
})

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)
app.mount('#app')
