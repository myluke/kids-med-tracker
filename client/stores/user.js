import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as authService from '@/services/authService'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const hasPassword = ref(false)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref(null)

  /**
   * 获取当前用户信息
   * @returns {Promise<{user: Object, families: Array}>}
   */
  const fetchMe = async () => {
    const me = await authService.getMe()
    user.value = me.user
    hasPassword.value = me.user?.hasPassword ?? false
    return me
  }

  /**
   * 设置密码状态（设置成功后调用）
   */
  const setHasPassword = (value) => {
    hasPassword.value = value
  }

  /**
   * 设置初始化状态
   */
  const setInitialized = (value) => {
    initialized.value = value
  }

  /**
   * 设置加载状态
   */
  const setLoading = (value) => {
    loading.value = value
  }

  /**
   * 设置错误信息
   */
  const setError = (value) => {
    error.value = value
  }

  /**
   * 登出
   */
  const logout = async () => {
    await authService.logout()
    user.value = null
  }

  /**
   * 重置状态
   */
  const reset = () => {
    user.value = null
    hasPassword.value = false
    initialized.value = false
    loading.value = false
    error.value = null
  }

  return {
    user,
    hasPassword,
    initialized,
    loading,
    error,

    fetchMe,
    setHasPassword,
    setInitialized,
    setLoading,
    setError,
    logout,
    reset
  }
})
