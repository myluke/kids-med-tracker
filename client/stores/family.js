import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as familyService from '@/services/familyService'
import * as inviteService from '@/services/inviteService'



export const useFamilyStore = defineStore('family', () => {
  const families = ref([])
  const currentFamilyId = ref(null)

  /**
   * 当前家庭对象
   */
  const currentFamily = computed(() => {
    if (!currentFamilyId.value) return null
    return families.value.find(f => f.id === currentFamilyId.value) || null
  })

  /**
   * 当前家庭中的用户角色
   */
  const currentFamilyRole = computed(() => {
    return currentFamily.value?.role || null
  })

  /**
   * 当前家庭名称
   */
  const currentFamilyName = computed(() => {
    return currentFamily.value?.name || null
  })

  /**
   * 是否为家庭所有者
   */
  const isOwner = computed(() => currentFamilyRole.value === 'owner')

  /**
   * 设置家庭列表
   */
  const setFamilies = (list) => {
    families.value = list || []
  }

  /**
   * 切换当前家庭
   */
  const setCurrentFamilyId = (familyId) => {
    currentFamilyId.value = familyId
  }

  /**
   * 创建家庭
   */
  const createFamily = async ({ name }) => {
    return familyService.createFamily({ name })
  }

  /**
   * 创建邀请链接
   */
  const createInvite = async ({ familyId }) => {
    return inviteService.createInvite({ familyId })
  }

  /**
   * 接受家庭邀请
   */
  const acceptInvite = async ({ token }) => {
    return inviteService.acceptInvite({ token })
  }

  /**
   * 删除家庭
   */
  const deleteFamily = async ({ familyId }) => {
    const result = await familyService.deleteFamily({ familyId })
    families.value = families.value.filter(f => f.id !== familyId)
    if (currentFamilyId.value === familyId) {
      currentFamilyId.value = families.value.length > 0 ? families.value[0].id : null
    }
    return result
  }

  /**
   * 重置状态
   */
  const reset = () => {
    families.value = []
    currentFamilyId.value = null
  }

  return {
    families,
    currentFamilyId,
    currentFamily,
    currentFamilyRole,
    currentFamilyName,
    isOwner,

    setFamilies,
    setCurrentFamilyId,
    createFamily,
    createInvite,
    acceptInvite,
    deleteFamily,
    reset
  }
})
