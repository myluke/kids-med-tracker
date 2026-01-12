import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as childService from '@/services/childService'
import { lightenHex } from '@/utils/colors'

export const useChildrenStore = defineStore('children', () => {
  const children = ref([])
  const currentChild = ref(null)

  /**
   * 加载孩子列表
   */
  const loadChildren = async (familyId) => {
    const result = await childService.getChildren({ familyId })

    const list = Array.isArray(result) ? result : []
    children.value = list.map(c => ({
      ...c,
      lightColor: c.lightColor || lightenHex(c.color || '#8B9DD9')
    }))

    return children.value
  }

  /**
   * 创建孩子
   */
  const createChild = async ({ familyId, name, emoji, color, gender, age }) => {
    const child = await childService.createChild({
      familyId,
      name,
      emoji,
      color,
      gender,
      age
    })

    await loadChildren(familyId)

    if (!currentChild.value && child?.id) {
      currentChild.value = child.id
    }

    return child
  }

  /**
   * 更新孩子信息
   */
  const updateChild = async ({ childId, familyId, name, emoji, color, gender, age }) => {
    await childService.updateChild({
      childId,
      familyId,
      name,
      emoji,
      color,
      gender,
      age
    })

    await loadChildren(familyId)
  }

  /**
   * 删除孩子
   */
  const deleteChild = async ({ childId, familyId }) => {
    await childService.deleteChild({ childId, familyId })

    await loadChildren(familyId)

    // 如果删除的是当前选中的孩子，切换到第一个
    if (currentChild.value === childId) {
      currentChild.value = children.value[0]?.id || null
    }

    return childId
  }

  /**
   * 切换当前孩子
   */
  const switchChild = (childId) => {
    currentChild.value = childId
  }

  /**
   * 设置当前孩子（初始化用）
   */
  const setCurrentChild = (childId) => {
    currentChild.value = childId
  }

  /**
   * 重置状态
   */
  const reset = () => {
    children.value = []
    currentChild.value = null
  }

  return {
    children,
    currentChild,

    loadChildren,
    createChild,
    updateChild,
    deleteChild,
    switchChild,
    setCurrentChild,
    reset
  }
})
