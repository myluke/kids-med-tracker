# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作提供指导。

## 工作原则

### 基本规范

- **语言要求**:使用简体中文回复用户问题
- **代码质量**:我们的代码会被 Linus Review,要避免被他骂!
- **高标准执行**:重视代码质量、安全性、可维护性
- **国际化**: 所有界面文本必须支持国际化（i18n），严禁硬编码。
- **如果有方案文档输出，就全部输出到./docs/ 目录下。**
- **不明白的地方反问我，先不着急编码**

## 项目概述

宝贝用药追踪 (Kids Med Tracker) 是一个 Vue 3 PWA 应用，用于在急性疾病期间追踪儿童的用药、体温和咳嗽症状。专为多孩家庭设计，支持颜色区分的孩子切换和智能用药间隔计时。

## 常用命令

```bash
pnpm install          # 安装依赖 (Node.js >= 18, pnpm >= 8)
pnpm dev              # 启动开发服务器 http://localhost:5173
pnpm build            # 生产构建到 dist/
pnpm preview          # 预览生产构建
pnpm lint             # ESLint 检查并自动修复
```

## 架构

**技术栈：** Vue 3 (Composition API) + Vite + TailwindCSS + Pinia + Chart.js

**关键路径：**
- `client/` - 前端 Vue 应用
- `worker/` - 后端 Cloudflare Worker (Hono + Supabase)
- `client/stores/records.js` - Pinia 状态管理
- `client/views/` - 路由页面
- `client/components/` - UI 组件
- `vite.config.js` - PWA 配置，`@` 别名指向 `client/`

**数据流：**
- 前端通过 `/api/*` 调用 Worker 后端
- Worker 使用 Supabase 进行数据存储和认证
- 记录类型：`med`（用药）、`cough`（咳嗽）、`temp`（体温）、`note`（备注）

**主题系统：** CSS 类 `.theme-erbao` 切换孩子专属配色

## 编码规范

- Vue 3 单文件组件，使用 Composition API + `<script setup>`
- 2 空格缩进、单引号、不写分号
- 组件命名：`PascalCase.vue`；页面命名：`*View.vue`
- 优先使用 TailwindCSS；共享样式放在 `client/style.css`
- 提交信息遵循 Conventional Commits：`feat:`、`fix:`、`docs:`

## 测试

目前未配置自动化测试。提交前：运行 `pnpm dev` 冒烟测试，运行 `pnpm build` 验证构建成功。

## 隐私约束

数据存储在 Supabase 云端数据库，按家庭隔离。访问受 Supabase Auth 保护（Email OTP 登录）。

## 自定义配置点

- **药物配置：** `client/stores/records.js` → `medications` 数组（包含 `interval` 小时间隔、`isFeverMed` 退烧药标记）
