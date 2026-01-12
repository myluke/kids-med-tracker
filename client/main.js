import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css'

const pinia = createPinia()

// 路由配置
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('./views/StatsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('./views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/no-family',
      name: 'no-family',
      component: () => import('./views/NoFamilyView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/invite/:token',
      name: 'invite',
      component: () => import('./views/InviteView.vue'),
      meta: { requiresAuth: false } // 邀请页面不需要登录，内部会处理
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('./views/AuthCallbackView.vue'),
      meta: { requiresAuth: false }
    }
  ]
})

// 路由守卫：检查认证状态
router.beforeEach(async (to, from, next) => {
  // 动态导入 store（避免循环依赖）
  const { useRecordsStore } = await import('./stores/records')
  const store = useRecordsStore(pinia)

  // 如果还没有初始化，先初始化
  if (!store.initialized) {
    await store.bootstrap()
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth && !store.user) {
    // 需要认证但未登录，跳转到登录页
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && store.user) {
    // 已登录但访问登录页，跳转到首页
    next({ name: 'home' })
  } else {
    next()
  }
})

const app = createApp(App)

app.use(pinia)
app.use(i18n)
app.use(router)
app.mount('#app')
