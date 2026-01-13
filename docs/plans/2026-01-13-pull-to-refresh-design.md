# 下拉刷新功能设计

日期：2026-01-13

## 概述

为所有页面添加下拉刷新功能，各页面独立刷新自己的相关数据。采用可复用包装组件方案实现。

## 组件 API 设计

**组件路径：** `client/components/PullToRefresh.vue`

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `disabled` | Boolean | `false` | 禁用下拉刷新 |
| `threshold` | Number | `60` | 触发刷新的下拉距离（px） |

### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `refresh` | `done: () => void` | 触发刷新，调用 `done()` 结束刷新状态 |

### 使用示例

```vue
<PullToRefresh @refresh="onRefresh">
  <HistoryList />
</PullToRefresh>

<script setup>
const onRefresh = async (done) => {
  await recordsStore.fetchRecords()
  done()
}
</script>
```

## 手势逻辑

### 触发条件

- 页面滚动到顶部（`scrollTop <= 0`）时开始监听下拉
- 手指向下滑动距离超过 `threshold` 时，松手触发刷新
- 刷新过程中禁止重复触发

### 状态机

```
idle → pulling → ready → refreshing → idle
       ↑                      │
       └──────────────────────┘
```

- `idle`：初始状态
- `pulling`：正在下拉，但未达到阈值
- `ready`：已达到阈值，松手可刷新
- `refreshing`：正在刷新，显示 loading 动画

### 关键实现点

- 使用 `touchstart`、`touchmove`、`touchend` 事件
- 下拉时使用 `transform: translateY()` 移动内容
- 添加 `touch-action: pan-x pan-down` 防止与浏览器手势冲突
- 使用 `passive: false` 的 touchmove 以便 `preventDefault()`

## 视觉反馈

### 刷新指示器样式

- 位置：内容区域上方，下拉时逐渐露出
- 样式：居中显示的圆形 loading 图标 + 文字提示
- 颜色：跟随当前主题色（支持 `.theme-erbao` 等孩子配色）

### 各状态视觉

| 状态 | 图标 | 文字 |
|------|------|------|
| `pulling` | ↓ 箭头（随下拉距离旋转） | "下拉刷新" |
| `ready` | ↑ 箭头（翻转） | "松开刷新" |
| `refreshing` | 旋转 loading | "刷新中..." |

### 动画细节

- 下拉过程：内容跟随手指平滑移动，有阻尼效果（越拉越慢）
- 松手后：弹性回弹动画 `transition: transform 0.3s ease-out`
- 刷新中：保持下拉位置，loading 图标旋转
- 刷新完成：平滑收回

### i18n 支持

文字提示使用 `$t('pullToRefresh.pull')` 等 key，不硬编码。

## 页面接入

### 需要接入的页面及刷新内容

| 页面 | 刷新操作 |
|------|----------|
| `HomeView` | 刷新 `recordsStore.fetchRecords()` |
| `StatsView` | 刷新统计数据或复用 records |
| `ProfileView` | 刷新 `familyStore.fetchFamily()` + children |
| `LoginView` | 无需刷新（禁用） |
| `NoFamilyView` | 刷新家庭状态检查 |
| `InviteView` | 刷新邀请状态 |
| `AuthCallbackView` | 无需刷新（禁用） |

### 页面改动示例（HomeView）

```vue
<template>
  <PullToRefresh @refresh="onRefresh">
    <div class="home-content">
      <!-- 原有内容 -->
    </div>
  </PullToRefresh>
</template>

<script setup>
import PullToRefresh from '@/components/PullToRefresh.vue'
import { useRecordsStore } from '@/stores/records'

const recordsStore = useRecordsStore()

const onRefresh = async (done) => {
  await recordsStore.fetchRecords()
  done()
}
</script>
```

## 文件清单

1. 新建 `client/components/PullToRefresh.vue` - 核心组件
2. 新增 `client/i18n/locales/*.json` 中的刷新相关文案
3. 修改各页面 View 文件接入组件
