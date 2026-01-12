import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as authService from '@/services/authService'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
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
    return me
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
    initialized.value = false
    loading.value = false
    error.value = null
  }

  return {
    user,
    initialized,
    loading,
    error,

    fetchMe,
    setInitialized,
    setLoading,
    setError,
    logout,
    reset
  }
})
