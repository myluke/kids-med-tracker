<script setup>
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore, logout, bootstrap } from '@/stores'
import FamilySection from '@/components/profile/FamilySection.vue'
import ChildrenSection from '@/components/profile/ChildrenSection.vue'
import PasswordSection from '@/components/profile/PasswordSection.vue'
import PullToRefresh from '@/components/PullToRefresh.vue'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const exportData = inject('exportData')

const handleLogout = async () => {
  if (confirm(t('views.profile.logoutConfirm'))) {
    await logout()
    router.push('/login')
  }
}

// 下拉刷新
const onRefresh = async (done) => {
  try {
    await bootstrap()
  } finally {
    done()
  }
}
</script>

<template>
  <PullToRefresh @refresh="onRefresh">
    <div class="py-6 space-y-5 pb-24">
      <!-- 账号信息 -->
      <div class="card">
        <h3 class="font-semibold text-gray-800 mb-4">
          {{ t('views.profile.accountSection') }}
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">{{ t('views.profile.emailLabel') }}</span>
            <span class="text-gray-800 font-medium">{{ userStore.user?.email || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 密码设置 -->
      <PasswordSection />

      <!-- 家庭管理 -->
      <FamilySection />

      <!-- 宝贝管理 -->
      <ChildrenSection />

      <!-- 功能列表 -->
      <div class="card p-0 overflow-hidden">
        <!-- 历史病程 -->
        <button
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          @click="router.push('/episodes')"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl">📋</span>
            <div class="text-left">
              <div class="text-gray-800 font-medium">
                {{ t('views.profile.episodeHistory') }}
              </div>
              <div class="text-gray-400 text-sm">
                {{ t('views.profile.episodeHistoryDesc') }}
              </div>
            </div>
          </div>
          <span class="text-gray-300">›</span>
        </button>

        <!-- 导出数据 -->
        <button
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          @click="exportData"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl">📤</span>
            <div class="text-left">
              <div class="text-gray-800 font-medium">
                {{ t('views.profile.exportData') }}
              </div>
              <div class="text-gray-400 text-sm">
                {{ t('views.profile.exportDesc') }}
              </div>
            </div>
          </div>
          <span class="text-gray-300">›</span>
        </button>

        <!-- 退出登录 -->
        <button
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-red-500"
          @click="handleLogout"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl">🚪</span>
            <span class="font-medium">{{ t('views.profile.logout') }}</span>
          </div>
          <span class="text-gray-300">›</span>
        </button>
      </div>
    </div>
  </PullToRefresh>
</template>
