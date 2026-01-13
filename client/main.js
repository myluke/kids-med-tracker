import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css'

const pinia = createPinia()

const CHUNK_RECOVERY_KEY = 'kids-med-tracker:chunk-recovery'
const CHUNK_RECOVERY_WINDOW_MS = 30_000

function isChunkLoadError(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(message)
}

function readChunkRecoveryState() {
  const now = Date.now()
  try {
    const raw = sessionStorage.getItem(CHUNK_RECOVERY_KEY)
    if (!raw) return { ts: 0, count: 0 }

    if (/^\d+$/.test(raw)) {
      const ts = Number(raw)
      if (!ts || now - ts > CHUNK_RECOVERY_WINDOW_MS) {
        clearChunkRecoveryState()
        return { ts: 0, count: 0 }
      }
      return { ts, count: 1 }
    }

    const parsed = JSON.parse(raw)
    const ts = typeof parsed?.ts === 'number' ? parsed.ts : 0
    const count = typeof parsed?.count === 'number' ? parsed.count : 0

    if (!ts || now - ts > CHUNK_RECOVERY_WINDOW_MS) {
      clearChunkRecoveryState()
      return { ts: 0, count: 0 }
    }

    return {
      ts,
      count: Math.max(0, count)
    }
  } catch {
    clearChunkRecoveryState()
    return { ts: 0, count: 0 }
  }
}

function writeChunkRecoveryState(state) {
  try {
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function clearChunkRecoveryState() {
  try {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY)
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

let chunkRecoveryInProgress = false

function recoverFromChunkError(target) {
  if (chunkRecoveryInProgress) return
  chunkRecoveryInProgress = true

  const state = readChunkRecoveryState()
  const now = Date.now()

  if (navigator.onLine === false) {
    chunkRecoveryInProgress = false
    return
  }

  if (state.count >= 2) {
    chunkRecoveryInProgress = false
    return
  }

  writeChunkRecoveryState({
    ts: now,
    count: state.count + 1
  })

  if (state.count >= 1) {
    void hardReloadTo(target)
    return
  }

  window.location.assign(target)
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
     
    console.error(error)
    return
  }

  const target = to?.fullPath || `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
  recoverFromChunkError(target)
})

window.addEventListener('unhandledrejection', event => {
  if (!isChunkLoadError(event.reason)) return
  const target = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
  recoverFromChunkError(target)
})

window.addEventListener('error', event => {
  if (!isChunkLoadError(event.error || event.message)) return
  const target = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
  recoverFromChunkError(target)
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
  clearChunkRecoveryState()
})

app.mount('#app')
