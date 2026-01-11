# Repository Guidelines

## 工作原则

### 基本规范

- **语言要求**:使用简体中文回复用户问题
- **代码质量**:我们的代码会被 Linus Review,要避免被他骂!
- **高标准执行**:重视代码质量、安全性、可维护性
- **国际化**: 所有界面文本必须支持国际化（i18n），严禁硬编码。
- **如果有方案文档输出，就全部输出到./docs/ 目录下。**
- **不明白的地方反问我，先不着急编码**

## 项目结构与模块组织

- `src/` — Vue 3 前端（入口 `src/main.js`，根组件 `src/App.vue`）
  - `src/views/` — 路由页面（例如 `HomeView.vue`、`StatsView.vue`）
  - `src/components/` — 可复用组件（例如 `MedPanel.vue`）
  - `src/stores/` — Pinia 状态与本地持久化（例如 `records.js`）
  - `src/i18n/` — 国际化资源与初始化（`zh-CN.json`、`en-US.json`）
- `worker/` — Cloudflare Worker 后端（Hono）
  - `worker/routes/` — API 路由
  - `worker/db/migrations/` — D1 数据库迁移（例如 `0001_init.sql`）
- `public/` — 静态资源（PWA 图标在 `public/icons/`）
- `docs/` — 设计/实现文档
- `dist/` — 构建产物（由 `pnpm build` 生成）

## 构建、测试与开发命令

- `pnpm install` — 安装依赖（Node.js >= 18；推荐 pnpm）
- `pnpm dev` — 启动 Vite 开发服务器（默认 http://localhost:5173）
- `pnpm build` — 构建生产版本到 `dist/`
- `pnpm preview` — 本地预览已构建产物
- `pnpm lint` — 运行 ESLint（尽可能自动修复）
- `pnpm worker:dev` — 使用 Wrangler 本地运行 Worker（默认端口 `8787`）
- `pnpm worker:deploy` — 部署 Worker 到 Cloudflare

## 编码风格与命名规范

- 代码风格由 `eslint.config.js` 约束：2 空格缩进、单引号、禁止分号。
- Vue 文件命名：组件使用 `PascalCase.vue`；页面使用 `*View.vue`。
- Worker 代码组织：路由放在 `worker/routes/*.ts`；通用逻辑放在 `worker/utils/` / `worker/services/`。
- 所有界面文案必须走 i18n：新增文案请添加到 `src/i18n/*.json`，不要硬编码字符串。

## 测试指南

- 当前未接入自动化测试框架。提交前至少执行：`pnpm lint`、`pnpm build`，并用 `pnpm dev` 做一次手动冒烟检查。
- 如需引入测试，请补齐 `pnpm test` 脚本，并统一命名/目录（例如 `tests/**/*.test.{js,ts}`）。

## 提交与 Pull Request 指南

- 提交信息遵循 Conventional Commits（历史中已使用 `feat:`、`fix:`），例如：`feat: 添加邀请流程`、`fix: 修复 wrangler 配置`。
- PR 需包含：变更目的与范围、手动验证步骤；涉及 UI 请附截图/GIF；涉及后端请说明新增/变更的 API 与 D1 迁移影响（迁移文件建议按 `0002_*.sql` 递增）。

## 安全与配置提示

- 健康相关数据视为敏感信息：默认不要加入遥测/第三方上报逻辑。
- 不要提交密钥：优先使用 `wrangler secret put`，本地环境使用 `.env.local` / `.dev.vars` 等（避免进入 git）。
