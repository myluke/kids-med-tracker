/**
 * Store 统一入口
 */

// 导出所有 store
export { useUserStore } from './user'
export { useFamilyStore } from './family'
export { useChildrenStore } from './children'
export { useRecordsStore } from './records'

// Re-export 药物配置（向后兼容）
export { medications, feverMeds } from '@/config/medications'

// 导入 store 用于 bootstrap
import { useUserStore } from './user'
import { useFamilyStore } from './family'
import { useChildrenStore } from './children'
import { useRecordsStore } from './records'

/**
 * 应用初始化
 * 协调所有 store 的加载流程
 */
export async function bootstrap() {
  const userStore = useUserStore()
  const familyStore = useFamilyStore()
  const childrenStore = useChildrenStore()
  const recordsStore = useRecordsStore()

  if (userStore.loading) return
  userStore.setLoading(true)

  try {
    userStore.setError(null)

    // 1. 获取用户信息和家庭列表
    const me = await userStore.fetchMe()
    familyStore.setFamilies(me.families || [])

    // 用户未登录则直接返回
    if (!userStore.user) {
      userStore.setInitialized(true)
      return
    }

    // 2. 设置默认家庭
    if (!familyStore.currentFamilyId && familyStore.families.length > 0) {
      familyStore.setCurrentFamilyId(familyStore.families[0].id)
    }

    // 3. 加载孩子列表
    if (familyStore.currentFamilyId) {
      await childrenStore.loadChildren(familyStore.currentFamilyId)
    }

    // 4. 设置默认孩子
    if (!childrenStore.currentChild && childrenStore.children.length > 0) {
      childrenStore.setCurrentChild(childrenStore.children[0].id)
    }

    // 5. 加载记录
    if (familyStore.currentFamilyId && childrenStore.currentChild) {
      await recordsStore.loadRecords({
        familyId: familyStore.currentFamilyId,
        childId: childrenStore.currentChild
      })
    }
  } catch (e) {
    userStore.setError(e instanceof Error ? e.message : String(e))
  } finally {
    userStore.setLoading(false)
    userStore.setInitialized(true)
  }
}

/**
 * 切换家庭
 * 重新加载孩子和记录
 */
export async function setFamily(familyId) {
  const familyStore = useFamilyStore()
  const childrenStore = useChildrenStore()
  const recordsStore = useRecordsStore()

  familyStore.setCurrentFamilyId(familyId)
  childrenStore.reset()
  recordsStore.reset()

  await childrenStore.loadChildren(familyId)

  if (childrenStore.children.length > 0) {
    childrenStore.setCurrentChild(childrenStore.children[0].id)
    await recordsStore.loadRecords({
      familyId,
      childId: childrenStore.currentChild
    })
  }
}

/**
 * 切换孩子
 * 按需加载记录
 */
export async function switchChild(childId) {
  const familyStore = useFamilyStore()
  const childrenStore = useChildrenStore()
  const recordsStore = useRecordsStore()

  childrenStore.switchChild(childId)

  if (!familyStore.currentFamilyId) return

  if (!recordsStore.recordsByChild[childId]) {
    await recordsStore.loadRecords({
      familyId: familyStore.currentFamilyId,
      childId
    })
  }
}

/**
 * 登出
 * 清除所有 store 状态
 */
export async function logout() {
  const userStore = useUserStore()
  const familyStore = useFamilyStore()
  const childrenStore = useChildrenStore()
  const recordsStore = useRecordsStore()

  await userStore.logout()
  familyStore.reset()
  childrenStore.reset()
  recordsStore.reset()
}

/**
 * 创建家庭并刷新
 */
export async function createFamily({ name }) {
  const familyStore = useFamilyStore()

  const family = await familyStore.createFamily({ name })

  await bootstrap()

  if (family?.id) {
    await setFamily(family.id)
  }

  return family
}

/**
 * 接受邀请并刷新
 */
export async function acceptInvite({ token }) {
  const familyStore = useFamilyStore()

  const res = await familyStore.acceptInvite({ token })

  await bootstrap()

  if (res?.familyId) {
    await setFamily(res.familyId)
  }

  return res
}

/**
 * 创建孩子
 */
export async function createChild({ name, emoji, color, gender, age }) {
  const familyStore = useFamilyStore()
  const childrenStore = useChildrenStore()

  if (!familyStore.currentFamilyId) throw new Error('Missing family')

  return childrenStore.createChild({
    familyId: familyStore.currentFamilyId,
    name,
    emoji,
    color,
    gender,
    age
  })
}

/**
 * 更新孩子
 */
export async function updateChild({ childId, name, emoji, color, gender, age }) {
  const familyStore = useFamilyStore()
  const childrenStore = useChildrenStore()

  if (!familyStore.currentFamilyId) throw new Error('Missing family')

  return childrenStore.updateChild({
    childId,
    familyId: familyStore.currentFamilyId,
    name,
    emoji,
    color,
    gender,
    age
  })
}

/**
 * 删除孩子
 */
export async function deleteChild(childId) {
  const familyStore = useFamilyStore()
  const childrenStore = useChildrenStore()
  const recordsStore = useRecordsStore()

  if (!familyStore.currentFamilyId) throw new Error('Missing family')

  const deletedId = await childrenStore.deleteChild({
    childId,
    familyId: familyStore.currentFamilyId
  })

  // 清除该孩子的记录缓存
  recordsStore.clearChildRecords(deletedId)
}
