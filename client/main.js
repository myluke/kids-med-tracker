import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css'

const pinia = createPinia()

const CHUNK_ERROR_RELOAD_KEY = 'kids-med-tracker:chunk-reload-at'

function isChunkLoadError(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(message)
}

function markReloadAttempt() {
  try {
    sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

function hadRecentReloadAttempt() {
  try {
    const value = sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY)
    const timestamp = value ? Number(value) : 0
    if (!timestamp) return false
    return Date.now() - timestamp < 30_000
  } catch {
    return false
  }
}

function clearReloadAttempt() {
  try {
    sessionStorage.removeItem(CHUNK_ERROR_RELOAD_KEY)
  } catch {
    // ignore
  }
}

async function hardReloadTo(path) {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(reg => reg.unregister().catch(() => null)))
    }
  } catch {
    // ignore
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key).catch(() => null)))
    }
  } catch {
    // ignore
  }

  window.location.assign(path)
}

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

router.onError((error, to) => {
  if (!isChunkLoadError(error)) {
    // eslint-disable-next-line no-console
    console.error(error)
    return
  }

  const target = to?.fullPath || window.location.pathname || '/'

  if (hadRecentReloadAttempt()) {
    clearReloadAttempt()
    void hardReloadTo(target)
    return
  }

  markReloadAttempt()
  window.location.assign(target)
})

// 路由守卫：检查认证状态
router.beforeEach(async (to, _from, next) => {
  // 动态导入 store（避免循环依赖）
  const { useUserStore, bootstrap } = await import('./stores')
  const userStore = useUserStore(pinia)

  // 如果还没有初始化，先初始化
  if (!userStore.initialized) {
    await bootstrap()
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth && !userStore.user) {
    // 需要认证但未登录，跳转到登录页
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && userStore.user) {
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

router.isReady().then(() => {
  clearReloadAttempt()
})

app.mount('#app')
